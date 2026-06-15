"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Options as ConfettiOptions } from "canvas-confetti";

interface CelebrationProps {
  score: number;
  total: number;
  trigger: boolean;
}

// Inicia o carregamento sob demanda assim que o módulo é avaliado no cliente,
// mas só executa quando o gatilho for acionado.
const confettiPromise =
  typeof window !== "undefined" ? import("canvas-confetti") : null;

const COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
];

export function Celebration({ score, total, trigger }: CelebrationProps) {
  const fired = useRef(false);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (!trigger || fired.current) return;
    fired.current = true;

    if (prefersReducedMotion) return;

    const duration = 3_000;
    const end = Date.now() + duration;

    const baseOptions: ConfettiOptions = {
      colors: COLORS,
      scalar: 1.2,
      disableForReducedMotion: true,
    };

    const frame = () => {
      confettiPromise?.then((confetti) => {
        confetti.default({
          ...baseOptions,
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti.default({
          ...baseOptions,
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Explosão inicial
    confettiPromise?.then((confetti) => {
      confetti.default({
        ...baseOptions,
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        scalar: 1.4,
      });
    });

    frame();
  }, [trigger, prefersReducedMotion]);

  if (!trigger) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-3 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "mt-12 max-w-[92vw] rounded-full px-4 py-2.5 text-center text-sm font-black text-yellow-900 shadow-2xl ring-4 ring-yellow-200/80 sm:mt-16 sm:px-6 sm:py-3 sm:text-lg md:mt-20 md:px-8 md:py-4 md:text-2xl lg:text-3xl",
          !prefersReducedMotion && "animate-pop"
        )}
        style={{ background: "linear-gradient(135deg, #fde047, #facc15)" }}
      >
        {score === total
          ? "🌟 Você é demais! Acertou tudo! 🌟"
          : "🎉 Muito bem! Quase perfeito! 🎉"}
      </div>
    </div>
  );
}

// cn helper local para não importar do lib/utils em componente puro
function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}
