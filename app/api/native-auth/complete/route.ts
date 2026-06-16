import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { mintAuthCode } from "@/lib/native-auth";

/**
 * callbackUrl do NextAuth após o OAuth. Roda no BROWSER DO SISTEMA, já com a
 * sessão criada. Emite um código de uso único e redireciona para o deep link
 * do app. O verifier NUNCA passou por aqui (só o challenge), preservando PKCE.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const challenge = req.cookies.get("native-auth-challenge")?.value;
  const redirect = req.cookies.get("native-auth-redirect")?.value;

  // Limpa os cookies de handoff em qualquer caminho de saída. Cada cookie
  // precisa do seu próprio header Set-Cookie (combiná-los com vírgula viola a
  // RFC 6265 e só o primeiro seria apagado).
  const clear = [
    "native-auth-challenge=; Path=/; Max-Age=0",
    "native-auth-redirect=; Path=/; Max-Age=0",
  ];

  function withClearedCookies(headers: Headers): Headers {
    clear.forEach((c) => headers.append("Set-Cookie", c));
    return headers;
  }

  if (!session?.user?.id || !challenge || !redirect?.startsWith("continhamagica://")) {
    return new Response("Sessão inválida. Feche e tente novamente.", {
      status: 400,
      headers: withClearedCookies(new Headers()),
    });
  }

  const code = await mintAuthCode(session.user.id, challenge);
  const location = `${redirect}?code=${encodeURIComponent(code)}`;

  // 302 manual para o esquema customizado (NextResponse.redirect valida URL http).
  return new Response(null, {
    status: 302,
    headers: withClearedCookies(new Headers({ Location: location })),
  });
}
