import { NextRequest, NextResponse } from "next/server";

const TEN_MIN = 10 * 60;

/**
 * Ponto de entrada do login nativo, aberto no BROWSER DO SISTEMA.
 * Guarda challenge (PKCE) e redirect (deep link) em cookies httpOnly e
 * encaminha para a página que dispara o signIn do Google.
 */
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  const redirect = req.nextUrl.searchParams.get("redirect");

  // Só aceita deep link do próprio app — evita open redirect.
  if (!challenge || !redirect || !redirect.startsWith("continhamagica://")) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const res = NextResponse.redirect(new URL("/native-auth/continue", req.url));
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TEN_MIN,
  };
  res.cookies.set("native-auth-challenge", challenge, cookieOpts);
  res.cookies.set("native-auth-redirect", redirect, cookieOpts);
  return res;
}
