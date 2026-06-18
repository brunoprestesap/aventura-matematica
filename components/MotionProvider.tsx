"use client";

import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// Provider único de animações do app. Usa LazyMotion + domAnimation para
// carregar apenas as features de DOM (~6KB) em vez do bundle completo do
// Framer Motion, mantendo o peso baixo (ver restrição "bundle leve" no AGENTS.md).
//
// - `strict`: obriga o uso de componentes `m.*` (proíbe `motion.*`), garantindo
//   o tree-shaking — qualquer `motion.*` escapando quebra o build de propósito.
// - `reducedMotion="user"`: desativa automaticamente transform/opacity quando o
//   usuário pede menos movimento, alinhado ao comportamento já existente no CSS.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
