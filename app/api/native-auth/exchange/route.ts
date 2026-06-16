import { NextRequest, NextResponse } from "next/server";
import {
  consumeAuthCode,
  createSessionForUser,
  getSessionCookieName,
} from "@/lib/native-auth";

/**
 * Chamado DE DENTRO do WebView (same-origin) com o código do deep link e o
 * code_verifier guardado nativamente. Valida o PKCE, cria a sessão e responde
 * com Set-Cookie — o cookie gruda no WebView e loga o usuário.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code, verifier } = body as { code?: unknown; verifier?: unknown };

  if (typeof code !== "string" || typeof verifier !== "string") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const userId = await consumeAuthCode(code, verifier);
  if (!userId) {
    return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  }

  const { sessionToken, expires } = await createSessionForUser(userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
