import { describe, expect, it, vi } from "vitest";
import {
  readUserName,
  writeUserName,
  notifyUserNameChanged,
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

describe("chave de localStorage", () => {
  it("usa a chave documentada", () => {
    expect(USER_NAME_KEY).toBe("continha-magica-user-name");
  });
});
