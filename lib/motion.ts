import type { Variants, Transition } from "motion/react";

// Presets de animação reutilizados em todo o app (Framer Motion / `motion`).
// Mantidos centralizados para garantir consistência de ritmo e facilitar ajustes.
// As animações respeitam prefers-reduced-motion automaticamente via
// <MotionConfig reducedMotion="user"> em components/MotionProvider.tsx.

// Mola suave padrão para entradas e modais.
export const springSoft: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

// Transição entre telas (nome → ano → quiz → resultado).
export const screenTransition: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -16, transition: { duration: 0.18, ease: "easeIn" } },
};

// Container que escalona a entrada dos filhos (grid de questões, listas, botões).
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

// Item de lista/grid: entra com leve subida + fade. Deixa um transform inline
// residual (translateY(0)) — só use em elementos cujo hover NÃO usa transform.
export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: springSoft },
};

// Variante de entrada só com opacidade — segura para elementos cujo hover usa
// transform (ex.: botões .card-3d), pois não deixa transform inline residual.
export const fadeItem: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
};

// Overlay (fundo escurecido) dos modais.
export const overlayFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Painel do modal — sobe com mola e sai deslizando.
export const modalSpring: Variants = {
  initial: { opacity: 0, y: 40, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSoft },
  exit: { opacity: 0, y: 24, scale: 0.97, transition: { duration: 0.18 } },
};

// Pop de destaque (card de resultado, dica de primeiro uso).
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.8, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 460, damping: 20 },
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

// Feedback do card de questão por status: pop ao acertar, "shake" ao errar.
// O estado idle é vazio de propósito para não escrever transform inline e
// preservar o hover:-translate-y-1 do card ocioso.
export const cardFeedback: Variants = {
  idle: {},
  correct: { scale: [1, 1.05, 1], transition: { duration: 0.35 } },
  incorrect: {
    x: [0, -6, 6, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};
