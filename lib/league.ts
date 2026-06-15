import { LeagueTier } from "@prisma/client";

// Ordem das ligas do menor para o maior tier
export const LEAGUE_ORDER: LeagueTier[] = [
  "bronze",
  "prata",
  "ouro",
  "safira",
  "rubi",
  "esmeralda",
  "ametista",
  "perola",
  "obsidiana",
  "diamante",
];

// Labels em pt-BR para exibição
export const LEAGUE_LABELS: Record<LeagueTier, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  safira: "Safira",
  rubi: "Rubi",
  esmeralda: "Esmeralda",
  ametista: "Ametista",
  perola: "Pérola",
  obsidiana: "Obsidiana",
  diamante: "Diamante",
};

// Emojis de troféu por liga (para uso na UI)
export const LEAGUE_EMOJI: Record<LeagueTier, string> = {
  bronze: "🥉",
  prata: "🥈",
  ouro: "🥇",
  safira: "💎",
  rubi: "🔴",
  esmeralda: "💚",
  ametista: "💜",
  perola: "🤍",
  obsidiana: "⚫",
  diamante: "💠",
};

// Quantos são promovidos por liga (top N)
export const PROMOTION_SLOTS: Record<LeagueTier, number> = {
  bronze: 20,
  prata: 15,
  ouro: 10,
  safira: 7,
  rubi: 7,
  esmeralda: 7,
  ametista: 7,
  perola: 7,
  obsidiana: 5,
  diamante: 0,
};

// Quantos são rebaixados por liga (bottom N)
export const DEMOTION_SLOTS: Record<LeagueTier, number> = {
  bronze: 0,
  prata: 5,
  ouro: 5,
  safira: 5,
  rubi: 5,
  esmeralda: 5,
  ametista: 5,
  perola: 5,
  obsidiana: 5,
  diamante: 5,
};

// Calcula a liga acima (retorna a mesma se já é diamante)
export function leagueUp(tier: LeagueTier): LeagueTier {
  const idx = LEAGUE_ORDER.indexOf(tier);
  return LEAGUE_ORDER[Math.min(idx + 1, LEAGUE_ORDER.length - 1)];
}

// Calcula a liga abaixo (retorna a mesma se já é bronze)
export function leagueDown(tier: LeagueTier): LeagueTier {
  const idx = LEAGUE_ORDER.indexOf(tier);
  return LEAGUE_ORDER[Math.max(idx - 1, 0)];
}

// Retorna a segunda-feira 00:00:00 UTC da semana corrente
export function currentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = domingo, 1 = segunda, ...
  const diff = day === 0 ? -6 : 1 - day; // ajusta para segunda-feira
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

// Tamanho máximo de um grupo
export const MAX_GROUP_SIZE = 30;

/**
 * Calcula o XP ganho em uma sessão.
 * IMPORTANTE: este cálculo sempre ocorre no servidor — nunca confie no valor do cliente.
 *
 * @param correct - número de acertos (0–20)
 * @param answers - array de booleanos indicando se cada questão foi acertada (em ordem)
 * @returns XP total ganho
 */
export function calculateXP(correct: number, answers: boolean[]): number {
  if (correct === 0) return 0;

  let xp = correct * 10; // base: 10 XP por acerto

  // Combo bônus: +5 XP para cada acerto em sequência a partir do 3º consecutivo
  let streak = 0;
  for (const hit of answers) {
    if (hit) {
      streak++;
      if (streak >= 3) xp += 5;
    } else {
      streak = 0;
    }
  }

  // Bônus de sessão completa: respondeu todas as 20 questões
  if (answers.length === 20) xp += 20;

  return xp;
}
