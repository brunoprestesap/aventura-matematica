import { render as rtlRender } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";

// Provider de animações para testes: espelha o components/MotionProvider real,
// fornecendo as features de DOM para os componentes `m.*`. Sem ele, `m.*`
// renderiza preso no estado `initial` (ex.: opacity 0), tornando o conteúdo
// "invisível" no DOM de teste. Combinado com MotionGlobalConfig.skipAnimations
// (em vitest.setup.ts), os componentes renderizam direto no estado final.
function MotionWrapper({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation} strict>{children}</LazyMotion>;
}

function render(ui: ReactElement, options?: Parameters<typeof rtlRender>[1]) {
  return rtlRender(ui, { wrapper: MotionWrapper, ...options });
}

// Re-exporta a API do Testing Library; o `render` local sobrepõe o do star.
export * from "@testing-library/react";
export { render };
