import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Janela curta: o app troca o código imediatamente após o deep link.
export const CODE_TTL_MS = 60_000;
// Sessão nativa de longa duração (mesma ordem do padrão NextAuth).
export const NATIVE_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** sha256 em base64url — usado para hashear o code e para o challenge PKCE. */
export function sha256Base64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

/**
 * Nome do cookie de sessão do Auth.js. Em HTTPS (produção) o Auth.js usa o
 * prefixo __Secure-; fora dele, não. Os dois lados (exchange e auth()) precisam
 * usar exatamente o mesmo nome.
 * Nota: o Auth.js aciona o prefixo __Secure- com base em HTTPS — isso funciona
 * corretamente porque o ambiente de produção na Vercel é sempre HTTPS.
 */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

/** Emite um código de uso único atrelado a um challenge PKCE. Retorna o code puro. */
export async function mintAuthCode(
  userId: string,
  challenge: string
): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  await prisma.nativeAuthCode.create({
    data: {
      codeHash: sha256Base64Url(code),
      challenge,
      userId,
      expires: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Valida e consome um código. Retorna o userId se: existe, não foi consumido,
 * não expirou e sha256(verifier) === challenge. Consome de forma atômica.
 */
export async function consumeAuthCode(
  code: string,
  verifier: string
): Promise<string | null> {
  const row = await prisma.nativeAuthCode.findUnique({
    where: { codeHash: sha256Base64Url(code) },
  });
  if (!row || row.consumed) return null;
  if (row.expires.getTime() < Date.now()) return null;
  const expected = Buffer.from(row.challenge);
  const actual = Buffer.from(sha256Base64Url(verifier));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  // Consumo atômico: só um exchange concorrente vence.
  // O filtro `expires` evita janela TOCTOU: garante não-expiração no mesmo update.
  const updated = await prisma.nativeAuthCode.updateMany({
    where: { id: row.id, consumed: false, expires: { gt: new Date() } },
    data: { consumed: true },
  });
  if (updated.count !== 1) return null;

  return row.userId;
}

/** Cria uma Session (estratégia DB do NextAuth) e devolve token + expiração. */
export async function createSessionForUser(
  userId: string
): Promise<{ sessionToken: string; expires: Date }> {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + NATIVE_SESSION_MAX_AGE_MS);
  await prisma.session.create({ data: { sessionToken, userId, expires } });
  return { sessionToken, expires };
}
