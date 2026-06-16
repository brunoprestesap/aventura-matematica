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
