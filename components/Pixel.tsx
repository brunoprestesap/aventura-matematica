"use client";

import { cn } from "@/lib/utils";

export type PixelPose = "idle" | "correct" | "wrong" | "thinking";

interface PixelProps {
  pose?: PixelPose;
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Mascote do Continha Mágica.
 *
 * Poses:
 * - idle      → estado neutro (olhos abertos, sorriso suave)
 * - correct   → acerto / celebração (olhos felizes em arco, sorriso largo, badge ✓ verde)
 * - wrong     → erro / encorajamento (olhos levemente franzidos, boca neutra, badge × vermelho)
 * - thinking  → aguardando (olhos abertos, bolinhas mel pulsando — usar durante digitação)
 *
 * @example
 * <Pixel pose="correct" size={120} />
 * <Pixel pose="thinking" size={64} animated />
 */
export function Pixel({
  pose = "idle",
  size = 80,
  animated = false,
  className,
}: PixelProps) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={ariaLabel(pose)}
      role="img"
      className={cn(
        animated && pose === "correct" && "animate-pop-in",
        animated && pose === "thinking" && "animate-pixel-think",
        className
      )}
    >
      {/* ── Orelhas ─────────────────────────────────────────── */}
      <path
        d="M22 42 L29 30 L35 39 L65 39 L71 30 L78 42"
        stroke="#2DD4BF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ── Cabeça ──────────────────────────────────────────── */}
      <ellipse cx="50" cy="63" rx="27" ry="23" fill="#2DD4BF" />

      {/* ── Olhos: variam por pose ───────────────────────────── */}
      <Eyes pose={pose} />

      {/* ── Nariz ───────────────────────────────────────────── */}
      <ellipse cx="50" cy="68" rx="4" ry="2.5" fill="#0D9488" />

      {/* ── Boca: varia por pose ────────────────────────────── */}
      <Mouth pose={pose} />

      {/* ── Bigodes ─────────────────────────────────────────── */}
      <Whiskers />

      {/* ── Corpo ───────────────────────────────────────────── */}
      <ellipse cx="50" cy="88" rx="15" ry="6.5" fill="#0D9488" opacity={0.45} />
      <path
        d="M36 86 Q31 97 34 104 Q41 107 50 106 Q59 107 66 104 Q69 97 64 86"
        fill="#2DD4BF"
      />
      <path
        d="M42 96 Q50 101 58 96"
        stroke="#0D9488"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Emblema / badge de estado ────────────────────────── */}
      <Badge pose={pose} animated={animated} />
    </svg>
  );
}

/* ── Sub-componentes internos ─────────────────────────────────── */

function Eyes({ pose }: { pose: PixelPose }) {
  if (pose === "correct") {
    // Olhos em arco — expressão de alegria
    return (
      <>
        <path
          d="M34 57 Q39 52 44 57"
          stroke="#0C1A19"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M56 57 Q61 52 66 57"
          stroke="#0C1A19"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }

  if (pose === "wrong") {
    // Olhos levemente franzidos
    return (
      <>
        <path
          d="M34 61 Q39 57 44 61"
          stroke="#0C1A19"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M56 61 Q61 57 66 61"
          stroke="#0C1A19"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }

  // idle e thinking — olhos abertos redondos
  return (
    <>
      <ellipse cx="39" cy="60" rx="5.5" ry="6.5" fill="#0C1A19" />
      <ellipse cx="61" cy="60" rx="5.5" ry="6.5" fill="#0C1A19" />
      {/* brilho dos olhos */}
      <ellipse cx="40.5" cy="58.5" rx="2" ry="2.4" fill="#CCFBF1" />
      <ellipse cx="62.5" cy="58.5" rx="2" ry="2.4" fill="#CCFBF1" />
    </>
  );
}

function Mouth({ pose }: { pose: PixelPose }) {
  if (pose === "correct") {
    // Sorriso largo
    return (
      <path
        d="M41 74 Q50 81 59 74"
        stroke="#0A7A70"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (pose === "wrong") {
    // Boca neutra / levemente curvada para baixo
    return (
      <path
        d="M44 74 Q50 72 56 74"
        stroke="#0A7A70"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  // idle e thinking — sorriso suave
  return (
    <path
      d="M43 73 Q50 78 57 73"
      stroke="#0A7A70"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
  );
}

function Whiskers() {
  return (
    <>
      {/* bigodes esquerda */}
      <line x1="20" y1="61" x2="28" y2="62.5" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="64.5" x2="28" y2="64.5" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
      {/* bigodes direita */}
      <line x1="72" y1="62.5" x2="80" y2="61" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="72" y1="64.5" x2="80" y2="64.5" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function Badge({ pose, animated }: { pose: PixelPose; animated: boolean }) {
  if (pose === "correct") {
    return (
      <g className={animated ? "animate-pop-in" : undefined}>
        <circle cx="72" cy="36" r="11" fill="#10B981" />
        <path
          d="M66 36 L70 40 L79 31"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    );
  }

  if (pose === "wrong") {
    return (
      <g className={animated ? "animate-pop-in" : undefined}>
        <circle cx="72" cy="36" r="11" fill="#EF4444" />
        <path
          d="M67 31 L77 41 M77 31 L67 41"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (pose === "thinking") {
    // Bolinhas mel pulsando
    return (
      <>
        <circle cx="66" cy="31" r="5" fill="#EAB308" opacity={0.9} className={animated ? "animate-think-1" : undefined} />
        <circle cx="74" cy="24" r="3.5" fill="#EAB308" opacity={0.65} className={animated ? "animate-think-2" : undefined} />
        <circle cx="80" cy="18" r="2" fill="#EAB308" opacity={0.4} className={animated ? "animate-think-3" : undefined} />
      </>
    );
  }

  // idle — emblema × dourado (amuleto do Pixel)
  return (
    <>
      <circle cx="72" cy="36" r="9" fill="#EAB308" />
      <text
        x="72"
        y="40.5"
        textAnchor="middle"
        fill="#0C1A19"
        fontSize={10}
        fontWeight={700}
        fontFamily="Space Grotesk, system-ui, sans-serif"
      >
        ×
      </text>
    </>
  );
}

function ariaLabel(pose: PixelPose): string {
  const labels: Record<PixelPose, string> = {
    idle:     "Pixel, o mascote do Continha Mágica",
    correct:  "Pixel comemorando o acerto",
    wrong:    "Pixel encorajando a tentar de novo",
    thinking: "Pixel pensando...",
  };
  return labels[pose];
}
