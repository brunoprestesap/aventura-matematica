import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  readUserName,
  writeUserName,
  notifyUserNameChanged,
  useUserName,
  USER_NAME_KEY,
} from "@/lib/user";

describe("readUserName", () => {
  it("retorna null quando não há nome salvo", () => {
    expect(readUserName()).toBeNull();
  });

  it("retorna o nome salvo no localStorage", () => {
    localStorage.setItem(USER_NAME_KEY, "Ana");
    expect(readUserName()).toBe("Ana");
  });
});

describe("writeUserName", () => {
  it("persiste o nome no localStorage", () => {
    writeUserName("Bruno");
    expect(localStorage.getItem(USER_NAME_KEY)).toBe("Bruno");
  });
});

describe("notifyUserNameChanged", () => {
  it("dispara StorageEvent com a chave correta", () => {
    const listener = vi.fn();
    window.addEventListener("storage", listener);
    notifyUserNameChanged();
    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0] as StorageEvent;
    expect(event.key).toBe(USER_NAME_KEY);
    window.removeEventListener("storage", listener);
  });
});

describe("useUserName", () => {
  it("retorna null inicialmente e reage a notifyUserNameChanged", () => {
    const { result } = renderHook(() => useUserName());
    expect(result.current).toBeNull();

    act(() => {
      writeUserName("Marina");
      notifyUserNameChanged();
    });

    expect(result.current).toBe("Marina");
  });

  it("ignora StorageEvent de outra chave", () => {
    const { result } = renderHook(() => useUserName());

    act(() => {
      writeUserName("Téo");
      window.dispatchEvent(new StorageEvent("storage", { key: "outra-chave" }));
    });

    // Não notificou para esta chave → snapshot anterior permanece
    expect(result.current).toBeNull();
  });
});

describe("chave de localStorage", () => {
  it("usa a chave documentada", () => {
    expect(USER_NAME_KEY).toBe("continha-magica-user-name");
  });
});
