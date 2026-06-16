"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export function AutoStartLogin() {
  useEffect(() => {
    // Roda no browser do sistema (não no WebView) — o Google permite OAuth aqui.
    // Ao concluir, NextAuth redireciona para /api/native-auth/complete.
    signIn("google", { callbackUrl: "/api/native-auth/complete" });
  }, []);

  return <p style={{ fontFamily: "sans-serif", padding: 24 }}>Conectando ao Google…</p>;
}
