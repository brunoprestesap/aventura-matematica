import { readHistory, writeHistory } from "@/lib/history";

/**
 * Migra dados do localStorage das chaves antigas (Aventura Matemática)
 * para as chaves novas (Continha Mágica).
 *
 * Executar apenas uma vez por dispositivo, controlado pela chave de migração.
 * Seguro chamar múltiplas vezes — é idempotente.
 */
const MIGRATION_KEY = "continha-magica-migrated-v1";

const MIGRATIONS: Array<{ from: string; to: string }> = [
  { from: "aventura-matematica-grade", to: "continha-magica-grade" },
  { from: "aventura-matematica-history", to: "continha-magica-history" },
  { from: "aventura-matematica-user-name", to: "continha-magica-user-name" },
];

export function migrateLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    // Já migrou? Não faz nada.
    if (localStorage.getItem(MIGRATION_KEY) === "1") return;

    for (const { from, to } of MIGRATIONS) {
      const value = localStorage.getItem(from);
      if (value !== null) {
        // Só escreve na chave nova se ela ainda não tem valor
        if (localStorage.getItem(to) === null) {
          localStorage.setItem(to, value);
        }
        localStorage.removeItem(from);
      }
    }

    localStorage.setItem(MIGRATION_KEY, "1");
  } catch {
    // Falha silenciosa — localStorage pode estar indisponível (modo privado, etc.)
  }
}

export const HISTORY_CLEANED_KEY = "continha-magica-history-cleaned-v1";

const BUG_FIX_DATE = "2026-06-22T00:00:00.000Z";

/**
 * Remove do histórico local as entradas com score=0 geradas por um bug
 * anterior a 22/06/2026, quando o cálculo de acertos estava incorreto.
 *
 * Executa apenas uma vez por dispositivo (guard key). Idempotente.
 */
export function cleanCorruptedHistoryScores(): void {
  if (typeof window === "undefined") return;
  try {
    // Já limpou? Não faz nada.
    if (localStorage.getItem(HISTORY_CLEANED_KEY) === "1") return;
    const history = readHistory();
    const cleaned = history.activities.filter(
      (a) => !(a.score === 0 && a.completedAt < BUG_FIX_DATE)
    );
    if (cleaned.length < history.activities.length) {
      writeHistory({ ...history, activities: cleaned });
    }
    localStorage.setItem(HISTORY_CLEANED_KEY, "1");
  } catch {
    // falha silenciosa — não grava a guard key; tentará na próxima sessão
  }
}
