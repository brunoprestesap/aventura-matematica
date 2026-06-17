import { signIn } from "next-auth/react";

// Inicia o login com o Google.
//
// No app nativo o OAuth do Google é bloqueado dentro do WebView, então
// delegamos ao shell nativo: ele abre o browser do sistema e devolve a sessão
// (ver `lib/native-auth.ts` e o handoff PKCE). Na web, usa o fluxo padrão do
// NextAuth. Centralizado aqui para ser reutilizado pelo LeaguePanel e pelo
// NamePrompt (login na tela de boas-vindas).
export function signInWithGoogle(): void {
  if (typeof window !== "undefined" && window.__NATIVE_APP__) {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "NATIVE_LOGIN" })
    );
    return;
  }
  signIn("google");
}
