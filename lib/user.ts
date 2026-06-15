import { useSyncExternalStore } from "react";

const USER_NAME_KEY = "aventura-matematica-user-name";

export function readUserName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(USER_NAME_KEY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return null;
}

export function writeUserName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_NAME_KEY, name);
  } catch {
    // ignore
  }
}

export function notifyUserNameChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new StorageEvent("storage", { key: USER_NAME_KEY })
  );
}

function subscribeToUserName(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key === USER_NAME_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function useUserName(): string | null {
  return useSyncExternalStore(
    subscribeToUserName,
    readUserName,
    () => null
  );
}
