import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  parseMastery,
  getMastery,
  writeMastery,
  updateMastery,
  notifyMasteryChanged,
  useMastery,
  MASTERY_KEY,
  MASTERY_ALPHA,
  NEUTRAL_SCORE,
  MIN_PER_CATEGORY,
  MAX_PER_CATEGORY,
  type MasteryMap,
} from "@/lib/mastery";
import {
  generateQuestions,
  GRADES,
  type QuestionCategory,
} from "@/lib/questions";

const CATEGORIES: QuestionCategory[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "sequence",
  "word",
];

const NEUTRAL: MasteryMap = {
  addition: NEUTRAL_SCORE,
  subtraction: NEUTRAL_SCORE,
  multiplication: NEUTRAL_SCORE,
  division: NEUTRAL_SCORE,
  sequence: NEUTRAL_SCORE,
  word: NEUTRAL_SCORE,
};

beforeEach(() => {
  localStorage.clear();
});

describe("parseMastery", () => {
  it("retorna neutro para JSON inválido", () => {
    expect(parseMastery("não é json")).toEqual(NEUTRAL);
  });

  it("retorna neutro quando falta alguma categoria", () => {
    expect(parseMastery(JSON.stringify({ addition: 0.2 }))).toEqual(NEUTRAL);
  });

  it("retorna neutro para valor fora de [0,1]", () => {
    const tooHigh = { ...NEUTRAL, division: 1.5 };
    const tooLow = { ...NEUTRAL, division: -0.1 };
    expect(parseMastery(JSON.stringify(tooHigh))).toEqual(NEUTRAL);
    expect(parseMastery(JSON.stringify(tooLow))).toEqual(NEUTRAL);
  });

  it("retorna neutro para valor não-numérico ou não-finito", () => {
    const notNumber = { ...NEUTRAL, word: "0.5" };
    const notFinite = { ...NEUTRAL, word: null };
    expect(parseMastery(JSON.stringify(notNumber))).toEqual(NEUTRAL);
    // NaN/Infinity viram null no JSON.stringify → cai no neutro
    expect(parseMastery(JSON.stringify(notFinite))).toEqual(NEUTRAL);
  });

  it("aceita um mapa válido com as 6 categorias", () => {
    const valid: MasteryMap = {
      addition: 0,
      subtraction: 0.25,
      multiplication: 0.5,
      division: 0.75,
      sequence: 1,
      word: 0.33,
    };
    expect(parseMastery(JSON.stringify(valid))).toEqual(valid);
  });
});

describe("getMastery", () => {
  it("retorna todos neutros quando o storage está vazio", () => {
    expect(getMastery()).toEqual(NEUTRAL);
  });

  it("reflete os valores escritos por writeMastery", () => {
    const m: MasteryMap = { ...NEUTRAL, division: 0.1 };
    writeMastery(m);
    expect(getMastery()).toEqual(m);
  });

  it("retorna a mesma referência em chamadas consecutivas (cache)", () => {
    writeMastery({ ...NEUTRAL, addition: 0.2 });
    const first = getMastery();
    const second = getMastery();
    expect(first).toBe(second);
  });
});

describe("updateMastery", () => {
  it("aplica a EMA corretamente para uma categoria praticada", () => {
    const result = updateMastery(NEUTRAL, [
      { category: "addition", correct: 8, total: 10 },
    ]);
    // 0.35 * 0.8 + 0.65 * 0.5 = 0.605
    expect(result.addition).toBeCloseTo(
      MASTERY_ALPHA * 0.8 + (1 - MASTERY_ALPHA) * NEUTRAL_SCORE,
      6
    );
  });

  it("acerto total puxa o score para cima", () => {
    const result = updateMastery(NEUTRAL, [
      { category: "word", correct: 5, total: 5 },
    ]);
    expect(result.word).toBeGreaterThan(NEUTRAL_SCORE);
    expect(result.word).toBeCloseTo(MASTERY_ALPHA + (1 - MASTERY_ALPHA) * 0.5, 6);
  });

  it("erro total puxa o score para baixo", () => {
    const result = updateMastery(NEUTRAL, [
      { category: "word", correct: 0, total: 5 },
    ]);
    expect(result.word).toBeLessThan(NEUTRAL_SCORE);
    expect(result.word).toBeCloseTo((1 - MASTERY_ALPHA) * 0.5, 6);
  });

  it("mantém inalteradas as categorias não praticadas", () => {
    const previous: MasteryMap = { ...NEUTRAL, division: 0.9, sequence: 0.1 };
    const result = updateMastery(previous, [
      { category: "addition", correct: 3, total: 6 },
    ]);
    expect(result.division).toBe(0.9);
    expect(result.sequence).toBe(0.1);
  });

  it("ignora resultados com total <= 0 (guarda divisão por zero)", () => {
    const previous: MasteryMap = { ...NEUTRAL, multiplication: 0.7 };
    const result = updateMastery(previous, [
      { category: "multiplication", correct: 0, total: 0 },
    ]);
    expect(result.multiplication).toBe(0.7);
  });

  it("retorna mapa completo de 6 chaves mesmo com previous parcial", () => {
    const partial = { addition: 0.4 } as MasteryMap;
    const result = updateMastery(partial, [
      { category: "addition", correct: 2, total: 4 },
    ]);
    for (const cat of CATEGORIES) {
      expect(typeof result[cat]).toBe("number");
    }
    // categoria não praticada herda o neutro espalhado
    expect(result.division).toBe(NEUTRAL_SCORE);
  });
});

describe("useMastery", () => {
  it("reage a notifyMasteryChanged", () => {
    const { result } = renderHook(() => useMastery());
    expect(result.current).toEqual(NEUTRAL);

    act(() => {
      writeMastery({ ...NEUTRAL, addition: 0.15 });
      notifyMasteryChanged();
    });

    expect(result.current.addition).toBeCloseTo(0.15, 6);
  });

  it("reage a StorageEvent (cross-tab)", () => {
    const { result } = renderHook(() => useMastery());

    act(() => {
      writeMastery({ ...NEUTRAL, division: 0.05 });
      window.dispatchEvent(new StorageEvent("storage", { key: MASTERY_KEY }));
    });

    expect(result.current.division).toBeCloseTo(0.05, 6);
  });
});

describe("generateQuestions com mastery (distribuição adaptativa)", () => {
  function countCategories(
    mastery: MasteryMap,
    grade: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  ): Record<QuestionCategory, number> {
    const questions = generateQuestions(20, grade, { mastery });
    const counts = {} as Record<QuestionCategory, number>;
    for (const cat of CATEGORIES) counts[cat] = 0;
    for (const q of questions) counts[q.category] += 1;
    return counts;
  }

  it("sempre soma exatamente 20, respeitando piso e teto", () => {
    for (let i = 0; i < 200; i++) {
      const mastery: MasteryMap = {
        addition: Math.random(),
        subtraction: Math.random(),
        multiplication: Math.random(),
        division: Math.random(),
        sequence: Math.random(),
        word: Math.random(),
      };
      const counts = countCategories(mastery, 4);
      const total = CATEGORIES.reduce((sum, c) => sum + counts[c], 0);
      expect(total).toBe(20);
      for (const cat of CATEGORIES) {
        expect(counts[cat]).toBeGreaterThanOrEqual(MIN_PER_CATEGORY);
        expect(counts[cat]).toBeLessThanOrEqual(MAX_PER_CATEGORY);
      }
    }
  });

  it("mastery neutro mantém todas as categorias presentes e equilibradas", () => {
    for (let i = 0; i < 100; i++) {
      const counts = countCategories(NEUTRAL, 4);
      for (const cat of CATEGORIES) {
        expect(counts[cat]).toBeGreaterThanOrEqual(MIN_PER_CATEGORY);
        // distribuição equilibrada: nenhuma categoria domina no caso neutro
        expect(counts[cat]).toBeLessThanOrEqual(6);
      }
    }
  });

  it("concentra na categoria mais fraca e a satura no teto", () => {
    // division fraca (0), todas as outras dominadas (1)
    const mastery: MasteryMap = {
      addition: 1,
      subtraction: 1,
      multiplication: 1,
      division: 0,
      sequence: 1,
      word: 1,
    };
    let sumDivision = 0;
    let hitMax = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const counts = countCategories(mastery, 4);
      sumDivision += counts.division;
      if (counts.division === MAX_PER_CATEGORY) hitMax += 1;
      expect(counts.division).toBeLessThanOrEqual(MAX_PER_CATEGORY);
    }
    // division deve ser a maior fatia, em média muito acima do equilíbrio (~3.3)
    expect(sumDivision / runs).toBeGreaterThan(6);
    // e frequentemente saturar no teto
    expect(hitMax).toBeGreaterThan(0);
  });

  it("funciona para todos os anos (1º–9º) somando 20", () => {
    for (const grade of GRADES) {
      const counts = countCategories(NEUTRAL, grade);
      const total = CATEGORIES.reduce((sum, c) => sum + counts[c], 0);
      expect(total).toBe(20);
    }
  });
});
