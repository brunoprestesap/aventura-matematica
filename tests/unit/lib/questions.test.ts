import { describe, expect, it } from "vitest";
import {
  generateQuestions,
  GRADES,
  getGradeConfig,
  getCategoryConfig,
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

function countCategories(questions: ReturnType<typeof generateQuestions>) {
  const counts: Record<QuestionCategory, number> = {
    addition: 0,
    subtraction: 0,
    multiplication: 0,
    division: 0,
    sequence: 0,
    word: 0,
  };
  for (const q of questions) counts[q.category]++;
  return counts;
}

describe("generateQuestions", () => {
  it.each(GRADES)("retorna exatamente 20 questões para o %iº ano", (grade) => {
    const questions = generateQuestions(20, grade);
    expect(questions).toHaveLength(20);
  });

  it.each(GRADES)(
    "distribui as categorias de forma equilibrada no %iº ano",
    (grade) => {
      const questions = generateQuestions(20, grade);
      const counts = countCategories(questions);
      const minPerCategory = Math.floor(20 / CATEGORIES.length);
      for (const cat of CATEGORIES) {
        expect(counts[cat]).toBeGreaterThanOrEqual(minPerCategory);
      }
    }
  );

  it.each(GRADES)("cada questão tem os campos obrigatórios no %iº ano", (grade) => {
    const questions = generateQuestions(20, grade);
    for (const q of questions) {
      expect(q.id).toMatch(/^[a-z0-9]+$/);
      expect(CATEGORIES).toContain(q.category);
      expect(typeof q.statement).toBe("string");
      expect(q.statement.length).toBeGreaterThan(0);
      expect(typeof q.answer).toBe("number");
      expect(Number.isFinite(q.answer)).toBe(true);
      expect(typeof q.explanation).toBe("string");
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe("adição", () => {
  it.each(GRADES)("respeita os limites do ano %i", (grade) => {
    const cfg = getGradeConfig(grade).addition;
    const questions = generateQuestions(100, grade);
    const additions = questions.filter((q) => q.category === "addition");
    expect(additions.length).toBeGreaterThan(0);

    for (const q of additions) {
      const match = q.statement.match(/Quanto é (\d+) \+ (\d+)\?/);
      expect(match).not.toBeNull();
      const [, a, b] = match!;
      const numA = Number(a);
      const numB = Number(b);
      expect(numA).toBeGreaterThanOrEqual(cfg.min);
      expect(numA).toBeLessThanOrEqual(cfg.max);
      expect(numB).toBeGreaterThanOrEqual(cfg.min);
      expect(numB).toBeLessThanOrEqual(cfg.max);
      expect(q.answer).toBe(numA + numB);
    }
  });
});

describe("subtração", () => {
  it.each(GRADES)("resultado é não-negativo e respeita limites no ano %i", (grade) => {
    const cfg = getGradeConfig(grade).subtraction;
    const questions = generateQuestions(100, grade);
    const subtractions = questions.filter((q) => q.category === "subtraction");
    expect(subtractions.length).toBeGreaterThan(0);

    for (const q of subtractions) {
      const match = q.statement.match(/Quanto é (\d+) − (\d+)\?/);
      expect(match).not.toBeNull();
      const [, a, b] = match!;
      const numA = Number(a);
      const numB = Number(b);
      expect(numA).toBeGreaterThan(numB);
      expect(numA).toBeGreaterThanOrEqual(cfg.min);
      expect(numA).toBeLessThanOrEqual(cfg.max);
      expect(numB).toBeGreaterThanOrEqual(cfg.min);
      expect(numB).toBeLessThanOrEqual(cfg.max);
      expect(q.answer).toBe(numA - numB);
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("multiplicação", () => {
  it.each(GRADES)("respeita os limites dos fatores no ano %i", (grade) => {
    const cfg = getGradeConfig(grade).multiplication;
    const questions = generateQuestions(100, grade);
    const multiplications = questions.filter((q) => q.category === "multiplication");
    expect(multiplications.length).toBeGreaterThan(0);

    for (const q of multiplications) {
      const match = q.statement.match(/Quanto é (\d+) × (\d+)\?/);
      expect(match).not.toBeNull();
      const [, a, b] = match!;
      const numA = Number(a);
      const numB = Number(b);
      expect(numA).toBeGreaterThanOrEqual(cfg.minA);
      expect(numA).toBeLessThanOrEqual(cfg.maxA);
      expect(numB).toBeGreaterThanOrEqual(cfg.minB);
      expect(numB).toBeLessThanOrEqual(cfg.maxB);
      expect(q.answer).toBe(numA * numB);
    }
  });
});

describe("divisão", () => {
  it.each(GRADES)("é exata e respeita os limites no ano %i", (grade) => {
    const cfg = getGradeConfig(grade).division;
    const questions = generateQuestions(100, grade);
    const divisions = questions.filter((q) => q.category === "division");
    expect(divisions.length).toBeGreaterThan(0);

    for (const q of divisions) {
      const match = q.statement.match(/Quanto é (\d+) ÷ (\d+)\?/);
      expect(match).not.toBeNull();
      const [, dividend, divisor] = match!;
      const numDividend = Number(dividend);
      const numDivisor = Number(divisor);
      expect(numDivisor).toBeGreaterThanOrEqual(cfg.minDivisor);
      expect(numDivisor).toBeLessThanOrEqual(cfg.maxDivisor);
      expect(numDividend % numDivisor).toBe(0);
      expect(q.answer).toBe(numDividend / numDivisor);
      expect(q.answer).toBeGreaterThanOrEqual(cfg.minAnswer);
      expect(q.answer).toBeLessThanOrEqual(cfg.maxAnswer);
    }
  });
});

describe("sequência numérica", () => {
  it.each(GRADES)("mantém progressão aritmética no ano %i", (grade) => {
    const questions = generateQuestions(100, grade);
    const sequences = questions.filter((q) => q.category === "sequence");
    expect(sequences.length).toBeGreaterThan(0);

    for (const q of sequences) {
      expect(q.statement).toContain("Complete a sequência:");
      expect(q.displayAnswer).toBeDefined();
      expect(q.displayAnswer!.length).toBeGreaterThan(0);

      const numbers = q.displayAnswer!
        .split(",")
        .map((s) => Number(s.trim()));
      expect(numbers).toHaveLength(6);

      const diff = numbers[1] - numbers[0];
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i] - numbers[i - 1]).toBe(diff);
      }
    }
  });
});

describe("problemas contextualizados", () => {
  it.each(GRADES)("usa nomes e objetos conhecidos no ano %i", (grade) => {
    const cfg = getGradeConfig(grade).word;
    const questions = generateQuestions(100, grade);
    const words = questions.filter((q) => q.category === "word");
    expect(words.length).toBeGreaterThan(0);

    const names = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Henrique", "Isabela", "João"];
    const objects = ["figurinhas", "bolinhas", "livros", "lápis", "canetas", "balas", "pedras", "sorvetes", "brinquedos", "cadernos"];

    for (const q of words) {
      const hasName = names.some((name) => q.statement.startsWith(name));
      expect(hasName).toBe(true);
      const hasObject = objects.some((obj) => q.statement.includes(obj));
      expect(hasObject).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(cfg.min * 2 - Math.floor(cfg.max / 2));
      expect(q.answer).toBeLessThanOrEqual(cfg.max + cfg.max);
    }
  });
});

describe("configurações", () => {
  it("getGradeConfig retorna configuração para todos os anos", () => {
    for (const grade of GRADES) {
      const cfg = getGradeConfig(grade);
      expect(cfg.label).toContain(String(grade));
      expect(cfg.addition.max).toBeGreaterThanOrEqual(cfg.addition.min);
      expect(cfg.subtraction.max).toBeGreaterThanOrEqual(cfg.subtraction.min);
    }
  });

  it("getCategoryConfig retorna estilos para todas as categorias", () => {
    for (const cat of CATEGORIES) {
      const cfg = getCategoryConfig(cat);
      expect(cfg.label).toBeTruthy();
      expect(cfg.icon).toBeTruthy();
      expect(cfg.color).toContain("text-");
      expect(cfg.bg).toContain("bg-");
      expect(cfg.border).toContain("border-");
    }
  });
});
