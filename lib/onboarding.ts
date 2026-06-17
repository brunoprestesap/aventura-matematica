import { useSyncExternalStore } from "react";

// Flag de "coachmark visto": controla a dica de primeiro uso exibida no quiz.
// Mesmo padrão de `lib/user.ts` — leitura síncrona protegida por try/catch e
// reatividade via useSyncExternalStore.
export const ONBOARDING_KEY = "continha-magica-onboarding-v1";

export function readCoachmarkSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCoachmarkSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // ignore
  }
  window.dispatchEvent(new StorageEvent("storage", { key: ONBOARDING_KEY }));
}

function subscribeToCoachmark(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key === ONBOARDING_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

// Retorna `true` enquanto o coachmark ainda não foi visto neste aparelho.
// No servidor (e na primeira renderização) retorna `false` para evitar
// flash da dica antes da hidratação.
export function useCoachmarkPending(): boolean {
  return useSyncExternalStore(
    subscribeToCoachmark,
    () => !readCoachmarkSeen(),
    () => false
  );
}
