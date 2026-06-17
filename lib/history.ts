import { useSyncExternalStore } from "react";
import { Grade } from "./questions";

export const HISTORY_KEY = "continha-magica-history";
export const HISTORY_VERSION = 1;

const EMPTY_HISTORY: ActivityHistory = { version: HISTORY_VERSION, activities: [] };

export interface ActivityRecord {
  id: string;
  grade: Grade;
  score: number;
  total: number;
  completedAt: string; // ISO 8601 do servidor
}

export interface ActivityHistory {
  version: number;
  activities: ActivityRecord[];
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function parseHistory(raw: string): ActivityHistory {
  try {
    const parsed = JSON.parse(raw) as ActivityHistory;
    if (
      parsed.version === HISTORY_VERSION &&
      Array.isArray(parsed.activities)
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return EMPTY_HISTORY;
}

// Cache do snapshot para evitar que getSnapshot retorne uma nova referência
// a cada renderização, o que causa o erro do React:
// "The result of getSnapshot should be cached to avoid an infinite loop".
let cachedRaw: string | null | undefined;
let cachedHistory: ActivityHistory | null = null;

export function readHistory(): ActivityHistory {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  const raw = localStorage.getItem(HISTORY_KEY);
  if (raw === cachedRaw && cachedHistory !== null) {
    return cachedHistory;
  }
  cachedRaw = raw;
  cachedHistory = raw ? parseHistory(raw) : EMPTY_HISTORY;
  return cachedHistory;
}

const listeners = new Set<() => void>();

function emitHistoryChanged() {
  listeners.forEach((listener) => listener());
}

export function writeHistory(history: ActivityHistory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export function notifyHistoryChanged(): void {
  if (typeof window === "undefined") return;
  emitHistoryChanged();
}

export function addActivity(
  history: ActivityHistory,
  grade: Grade,
  score: number,
  total: number,
  completedAt: string,
  id: string = makeId()
): ActivityHistory {
  const activity: ActivityRecord = {
    id,
    grade,
    score,
    total,
    completedAt,
  };
  return {
    version: HISTORY_VERSION,
    activities: [activity, ...history.activities].slice(0, 50),
  };
}

// Mescla histórico local com registros vindos da nuvem.
// Dedup por id (o cliente reusa o id local como clientId no servidor),
// preferindo o registro da nuvem em caso de colisão. Ordena por data desc.
export function mergeHistories(
  local: ActivityHistory,
  cloud: ActivityRecord[]
): ActivityHistory {
  const byId = new Map<string, ActivityRecord>();
  for (const record of local.activities) byId.set(record.id, record);
  for (const record of cloud) byId.set(record.id, record); // nuvem sobrescreve
  const activities = Array.from(byId.values())
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 50);
  return { version: HISTORY_VERSION, activities };
}

function subscribeToHistory(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === HISTORY_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useHistory(): ActivityHistory {
  return useSyncExternalStore(
    subscribeToHistory,
    readHistory,
    () => EMPTY_HISTORY
  );
}

export function formatActivityDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
