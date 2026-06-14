"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface CelebrationProps {
  score: number;
  total: number;
  trigger: boolean;
}

export function Celebration({ score, total, trigger }: CelebrationProps) {
  const fired = useRef(false);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!trigger || fired.current) return;
    fired.current = true;

    if (prefersReducedMotion) return;

    const duration = 3_000;
    const end = Date.now() + duration;
    const colors = [
      "#ef4444",
      "#3b82f6",
      "#22c55e",
      "#f59e0b",
      "#a855f7",
      "#ec4899",
    ];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
        scalar: 1.2,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
        scalar: 1.2,
        disableForReducedMotion: true,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Explosão inicial
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      scalar: 1.4,
      disableForReducedMotion: true,
    });

    frame();
  }, [trigger, prefersReducedMotion]);

  if (!trigger) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "mt-16 max-w-[90vw] rounded-full px-5 py-3 text-center text-lg font-black text-yellow-900 shadow-2xl ring-4 ring-yellow-200/80 sm:mt-20 sm:px-8 sm:py-4 sm:text-2xl md:text-3xl lg:text-4xl",
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
