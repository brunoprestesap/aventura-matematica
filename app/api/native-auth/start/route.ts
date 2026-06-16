import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signIn } from "@/auth";

const TEN_MIN = 10 * 60;

/**
 * Ponto de entrada do login nativo, aberto no BROWSER DO SISTEMA.
 * Guarda challenge (PKCE) e redirect (deep link) em cookies httpOnly e inicia
 * o OAuth do Google no SERVIDOR.
 *
 * Por que iniciar o signIn no servidor (e não com o signIn client-side do
 * next-auth/react numa página)? O signIn client-side faz um fetch em
 * /api/auth/csrf para gravar o cookie __Host-authjs.csrf-token e depois um
 * POST com o token (padrão double-submit). O in-app browser nativo
 * (WKWebView/ASWebAuthenticationSession) NÃO persiste de forma confiável o
 * Set-Cookie de respostas fetch/XHR — só de navegações de documento — então o
 * cookie CSRF some e o POST falha com `MissingCSRF`. O signIn server-side usa
 * skipCSRFCheck internamente e redireciona via navegação de documento,
 * evitando o problema. No desktop o fluxo client-side funciona porque o
 * navegador comum persiste cookies de XHR.
 */
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  const redirect = req.nextUrl.searchParams.get("redirect");

  // Só aceita deep link do próprio app — evita open redirect.
  if (!challenge || !redirect || !redirect.startsWith("continhamagica://")) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TEN_MIN,
  };
  cookieStore.set("native-auth-challenge", challenge, cookieOpts);
  cookieStore.set("native-auth-redirect", redirect, cookieOpts);

  // Inicia o OAuth e redireciona ao Google. Ao concluir, o NextAuth volta para
  // /api/native-auth/complete (redirectTo), que emite o código de handoff.
  // signIn lança um redirect (NEXT_REDIRECT) — o código abaixo é inacessível.
  await signIn("google", { redirectTo: "/api/native-auth/complete" });

  // Inalcançável: signIn sempre redireciona. Mantido para satisfazer o tipo de
  // retorno do route handler.
  return NextResponse.json({ error: "Falha ao iniciar login" }, { status: 500 });
}
