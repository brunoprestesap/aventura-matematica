import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  readHistory,
  writeHistory,
  addActivity,
  parseHistory,
  formatActivityDate,
  notifyHistoryChanged,
  useHistory,
  mergeHistories,
  makeId,
  HISTORY_KEY,
  HISTORY_VERSION,
  type ActivityHistory,
  type ActivityRecord,
} from "@/lib/history";

describe("parseHistory", () => {
  it("retorna histórico vazio para JSON inválido", () => {
    const result = parseHistory("não é json");
    expect(result).toEqual({ version: HISTORY_VERSION, activities: [] });
  });

  it("retorna histórico vazio para versão diferente", () => {
    const invalid: ActivityHistory = { version: 999, activities: [] };
    const result = parseHistory(JSON.stringify(invalid));
    expect(result).toEqual({ version: HISTORY_VERSION, activities: [] });
  });

  it("retorna histórico quando versão está correta", () => {
    const valid: ActivityHistory = {
      version: HISTORY_VERSION,
      activities: [
        {
          id: "abc",
          grade: 4,
          score: 15,
          total: 20,
          completedAt: "2024-01-01T10:00:00.000Z",
        },
      ],
    };
    const result = parseHistory(JSON.stringify(valid));
    expect(result).toEqual(valid);
  });
});

describe("readHistory e writeHistory", () => {
  it("lê histórico vazio quando não há dados", () => {
    expect(readHistory()).toEqual({ version: HISTORY_VERSION, activities: [] });
  });

  it("persiste e lê histórico", () => {
    const history: ActivityHistory = {
      version: HISTORY_VERSION,
      activities: [
        { id: "x1", grade: 3, score: 10, total: 20, completedAt: "2024-01-01T10:00:00.000Z" },
      ],
    };
    writeHistory(history);
    expect(readHistory()).toEqual(history);
  });
});

describe("addActivity", () => {
  it("adiciona atividade no início da lista", () => {
    const base: ActivityHistory = { version: HISTORY_VERSION, activities: [] };
    const updated = addActivity(base, 4, 18, 20, "2024-02-01T12:00:00.000Z");
    expect(updated.activities).toHaveLength(1);
    expect(updated.activities[0].grade).toBe(4);
    expect(updated.activities[0].score).toBe(18);
    expect(updated.activities[0].total).toBe(20);
  });

  it("mantém no máximo 50 atividades", () => {
    let history: ActivityHistory = { version: HISTORY_VERSION, activities: [] };
    for (let i = 0; i < 55; i++) {
      history = addActivity(history, 4, 10, 20, new Date().toISOString());
    }
    expect(history.activities).toHaveLength(50);
  });

  it("preserva a versão do histórico", () => {
    const base: ActivityHistory = { version: HISTORY_VERSION, activities: [] };
    const updated = addActivity(base, 1, 1, 20, new Date().toISOString());
    expect(updated.version).toBe(HISTORY_VERSION);
  });
});

describe("formatActivityDate", () => {
  it("formata data ISO para pt-BR", () => {
    const formatted = formatActivityDate("2024-05-20T14:30:00.000Z");
    expect(formatted).toContain("20/05/2024");
    // Verifica que hora e minuto estão presentes no formato HH:MM
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });
});

describe("useHistory", () => {
  it("reage a notifyHistoryChanged (listeners internos)", () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.activities).toHaveLength(0);

    act(() => {
      const updated = addActivity(result.current, 4, 18, 20, "2024-02-01T12:00:00.000Z");
      writeHistory(updated);
      notifyHistoryChanged();
    });

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].score).toBe(18);
  });

  it("reage a StorageEvent da chave de histórico (outra aba)", () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      const updated = addActivity(result.current, 5, 10, 20, "2024-03-01T12:00:00.000Z");
      writeHistory(updated);
      window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
    });

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].grade).toBe(5);
  });
});

describe("chave de localStorage", () => {
  it("usa a chave documentada", () => {
    expect(HISTORY_KEY).toBe("continha-magica-history");
  });
});

describe("makeId", () => {
  it("gera ids não vazios e distintos", () => {
    const a = makeId();
    const b = makeId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe("addActivity com id explícito", () => {
  it("usa o id fornecido quando passado", () => {
    const base: ActivityHistory = { version: HISTORY_VERSION, activities: [] };
    const updated = addActivity(base, 4, 18, 20, "2024-02-01T12:00:00.000Z", "fixo-1");
    expect(updated.activities[0].id).toBe("fixo-1");
  });

  it("gera um id quando nenhum é passado", () => {
    const base: ActivityHistory = { version: HISTORY_VERSION, activities: [] };
    const updated = addActivity(base, 4, 18, 20, "2024-02-01T12:00:00.000Z");
    expect(updated.activities[0].id).toBeTruthy();
  });
});

describe("mergeHistories", () => {
  const local: ActivityHistory = {
    version: HISTORY_VERSION,
    activities: [
      { id: "a", grade: 4, score: 10, total: 20, completedAt: "2024-01-02T10:00:00.000Z" },
      { id: "b", grade: 4, score: 12, total: 20, completedAt: "2024-01-01T10:00:00.000Z" },
    ],
  };

  it("deduplica por id, preferindo o registro da nuvem", () => {
    const cloud: ActivityRecord[] = [
      { id: "a", grade: 4, score: 15, total: 20, completedAt: "2024-01-02T10:00:00.000Z" },
    ];
    const merged = mergeHistories(local, cloud);
    const a = merged.activities.find((x) => x.id === "a");
    expect(merged.activities).toHaveLength(2);
    expect(a?.score).toBe(15);
  });

  it("inclui registros só da nuvem e ordena por data desc", () => {
    const cloud: ActivityRecord[] = [
      { id: "c", grade: 5, score: 20, total: 20, completedAt: "2024-01-03T10:00:00.000Z" },
    ];
    const merged = mergeHistories(local, cloud);
    expect(merged.activities.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("limita a 50 registros", () => {
    const many: ActivityRecord[] = Array.from({ length: 60 }, (_, i) => ({
      id: `cloud-${i}`,
      grade: 4,
      score: 10,
      total: 20,
      completedAt: new Date(2024, 0, 1, 0, i).toISOString(),
    }));
    const merged = mergeHistories({ version: HISTORY_VERSION, activities: [] }, many);
    expect(merged.activities).toHaveLength(50);
  });

  it("nuvem vazia retorna o local", () => {
    const merged = mergeHistories(local, []);
    expect(merged.activities).toHaveLength(2);
  });
});
