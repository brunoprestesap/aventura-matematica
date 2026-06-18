import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { config } from "dotenv";
import { MotionGlobalConfig } from "motion/react";

config({ path: ".env.test" });

// Faz as animações do Framer Motion (`motion`) resolverem instantaneamente no
// ambiente de teste — os componentes `m.*` saltam direto para o estado final,
// tornando as asserções de visibilidade/desmontagem determinísticas.
MotionGlobalConfig.skipAnimations = true;

// Limpa o DOM após cada teste de componente
afterEach(() => {
  cleanup();
});

// Mock global do matchMedia para componentes que usam prefers-reduced-motion
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de localStorage que pode ser resetado entre testes
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

beforeEach(() => {
  localStorageMock.clear();
});

// Garante que `process.env` tenha valores mínimos para as rotas de teste
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret";
process.env.CRON_SECRET = process.env.CRON_SECRET ?? "test-cron-secret";
