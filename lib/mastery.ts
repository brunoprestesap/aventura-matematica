import { useSyncExternalStore } from "react";
import type { QuestionCategory } from "./questions";

// Chave própria de localStorage. O versionamento é carregado pelo sufixo
// "-v1" da chave — para uma futura mudança de schema, basta criar "-v2".
export const MASTERY_KEY = "continha-magica-mastery-v1";

// Constantes de calibração do sorteio adaptativo (centralizadas no topo).
export const MASTERY_ALPHA = 0.35; // recência: quanto o passado é "esquecido"
export const NEUTRAL_SCORE = 0.5; // score inicial de categoria sem histórico
export const MAX_PER_CATEGORY = 8; // teto de questões por categoria (de 20)
export const MIN_PER_CATEGORY = 1; // piso por categoria ativa
export const NOISE_MIN = 0.85; // ruído mínimo aplicado ao peso
export const NOISE_MAX = 1.15; // ruído máximo aplicado ao peso

export type MasteryMap = Record<QuestionCategory, number>; // cada valor de 0 a 1

export interface CategoryResult {
  category: QuestionCategory;
  correct: number;
  total: number;
}

// Fonte única da verdade das 6 categorias para validação/iteração.
const CATEGORY_KEYS: readonly QuestionCategory[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "sequence",
  "word",
];

// Constante congelada → referência estável para o default de SSR e para o
// fallback de parsing (evita o erro do React "The result of getSnapshot should
// be cached to avoid an infinite loop", igual ao EMPTY_HISTORY em history.ts).
export const NEUTRAL_MASTERY: MasteryMap = Object.freeze({
  addition: NEUTRAL_SCORE,
  subtraction: NEUTRAL_SCORE,
  multiplication: NEUTRAL_SCORE,
  division: NEUTRAL_SCORE,
  sequence: NEUTRAL_SCORE,
  word: NEUTRAL_SCORE,
}) as MasteryMap;

export function parseMastery(raw: string): MasteryMap {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result = {} as MasteryMap;
    for (const key of CATEGORY_KEYS) {
      const value = parsed[key];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
      ) {
        // Chave faltando ou inválida → cai no neutro por inteiro.
        return NEUTRAL_MASTERY;
      }
      result[key] = value;
    }
    return result;
  } catch {
    return NEUTRAL_MASTERY;
  }
}

// Cache do snapshot para evitar que getSnapshot retorne uma nova referência
// a cada renderização (mesmo motivo do cache em history.ts).
let cachedRaw: string | null | undefined;
let cachedMastery: MasteryMap | null = null;

export function getMastery(): MasteryMap {
  if (typeof window === "undefined") return NEUTRAL_MASTERY;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(MASTERY_KEY);
  } catch {
    return NEUTRAL_MASTERY;
  }
  if (raw === cachedRaw && cachedMastery !== null) {
    return cachedMastery;
  }
  cachedRaw = raw;
  cachedMastery = raw ? parseMastery(raw) : NEUTRAL_MASTERY;
  return cachedMastery;
}

// Média móvel exponencial (EMA) por categoria praticada na sessão.
// Categorias não praticadas mantêm o valor anterior.
export function updateMastery(
  previous: MasteryMap,
  results: CategoryResult[]
): MasteryMap {
  // Espalha o neutro primeiro para garantir as 6 chaves mesmo se `previous`
  // vier parcial.
  const next: MasteryMap = { ...NEUTRAL_MASTERY, ...previous };
  for (const { category, correct, total } of results) {
    if (total <= 0) continue; // guarda contra divisão por zero
    const taxaSessao = correct / total; // 0 a 1
    const prev = previous[category] ?? NEUTRAL_SCORE;
    next[category] = MASTERY_ALPHA * taxaSessao + (1 - MASTERY_ALPHA) * prev;
  }
  return next;
}

const listeners = new Set<() => void>();

export function writeMastery(mastery: MasteryMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
  } catch {
    // ignore — quota excedida, modo privado, etc.
  }
}

export function notifyMasteryChanged(): void {
  if (typeof window === "undefined") return;
  listeners.forEach((listener) => listener());
}

function subscribeToMastery(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === MASTERY_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useMastery(): MasteryMap {
  return useSyncExternalStore(
    subscribeToMastery,
    getMastery,
    () => NEUTRAL_MASTERY
  );
}
