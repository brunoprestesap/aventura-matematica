import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  readCoachmarkSeen,
  markCoachmarkSeen,
  useCoachmarkPending,
  ONBOARDING_KEY,
} from "@/lib/onboarding";

beforeEach(() => {
  localStorage.clear();
});

describe("readCoachmarkSeen", () => {
  it("retorna false quando a flag não está marcada", () => {
    expect(readCoachmarkSeen()).toBe(false);
  });

  it("retorna true quando a flag está marcada", () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    expect(readCoachmarkSeen()).toBe(true);
  });
});

describe("markCoachmarkSeen", () => {
  it("persiste a flag e dispara StorageEvent com a chave correta", () => {
    const listener = vi.fn();
    window.addEventListener("storage", listener);

    markCoachmarkSeen();

    expect(localStorage.getItem(ONBOARDING_KEY)).toBe("1");
    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0] as StorageEvent;
    expect(event.key).toBe(ONBOARDING_KEY);
    window.removeEventListener("storage", listener);
  });
});

describe("useCoachmarkPending", () => {
  it("começa pendente (true) e deixa de ficar pendente após marcar", () => {
    const { result } = renderHook(() => useCoachmarkPending());
    expect(result.current).toBe(true);

    act(() => {
      markCoachmarkSeen();
    });

    expect(result.current).toBe(false);
  });

  it("ignora StorageEvent de outra chave", () => {
    const { result } = renderHook(() => useCoachmarkPending());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "outra-chave" }));
    });

    expect(result.current).toBe(true);
  });
});

describe("resiliência a falhas de localStorage", () => {
  it("readCoachmarkSeen retorna false se getItem lançar", () => {
    const spy = vi
      .spyOn(window.localStorage, "getItem")
      .mockImplementation(() => {
        throw new Error("storage indisponível");
      });
    expect(readCoachmarkSeen()).toBe(false);
    spy.mockRestore();
  });

  it("markCoachmarkSeen não quebra se setItem lançar", () => {
    const spy = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("storage cheio");
      });
    expect(() => markCoachmarkSeen()).not.toThrow();
    spy.mockRestore();
  });
});

describe("chave de localStorage", () => {
  it("usa a chave documentada", () => {
    expect(ONBOARDING_KEY).toBe("continha-magica-onboarding-v1");
  });
});
