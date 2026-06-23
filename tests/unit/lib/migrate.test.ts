import { beforeEach, describe, expect, it } from "vitest";
import { cleanCorruptedHistoryScores, HISTORY_CLEANED_KEY } from "@/lib/migrate";
import { writeHistory, readHistory, HISTORY_VERSION } from "@/lib/history";

const ANTES_DO_FIX = "2026-06-01T00:00:00.000Z";
const DEPOIS_DO_FIX = "2026-06-23T00:00:00.000Z";

describe("cleanCorruptedHistoryScores", () => {
  beforeEach(() => localStorage.clear());

  it("remove entradas com score=0 anteriores a 22/06/2026", () => {
    writeHistory({
      version: HISTORY_VERSION,
      activities: [
        { id: "corrompida", grade: 4, score: 0, total: 20, completedAt: ANTES_DO_FIX },
        { id: "legitima-antiga", grade: 4, score: 5, total: 20, completedAt: ANTES_DO_FIX },
        { id: "zero-nova", grade: 4, score: 0, total: 20, completedAt: DEPOIS_DO_FIX },
      ],
    });

    cleanCorruptedHistoryScores();

    const ids = readHistory().activities.map((a) => a.id);
    expect(ids).toEqual(["legitima-antiga", "zero-nova"]);
  });

  it("não altera o histórico quando não há entradas corrompidas", () => {
    writeHistory({
      version: HISTORY_VERSION,
      activities: [
        { id: "ok", grade: 4, score: 15, total: 20, completedAt: ANTES_DO_FIX },
      ],
    });

    cleanCorruptedHistoryScores();

    expect(readHistory().activities).toHaveLength(1);
  });

  it("grava a guard key após a execução", () => {
    cleanCorruptedHistoryScores();
    expect(localStorage.getItem(HISTORY_CLEANED_KEY)).toBe("1");
  });

  it("não executa novamente se a guard key já existe", () => {
    writeHistory({
      version: HISTORY_VERSION,
      activities: [
        { id: "ruim", grade: 4, score: 0, total: 20, completedAt: ANTES_DO_FIX },
      ],
    });
    localStorage.setItem(HISTORY_CLEANED_KEY, "1");

    cleanCorruptedHistoryScores();

    // Guard presente → atividade corrupta não deve ser removida
    expect(readHistory().activities).toHaveLength(1);
  });

  it("funciona com histórico vazio e grava a guard key", () => {
    cleanCorruptedHistoryScores();
    expect(readHistory().activities).toHaveLength(0);
    expect(localStorage.getItem(HISTORY_CLEANED_KEY)).toBe("1");
  });
});
