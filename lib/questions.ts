export type QuestionCategory =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "sequence"
  | "word";

export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Question {
  id: string;
  category: QuestionCategory;
  statement: string;
  answer: number;
  displayAnswer?: string;
}

export interface GradeConfig {
  label: string;
  emoji: string;
  description: string;
  color: string;
  bg: string;
  addition: { min: number; max: number };
  subtraction: { min: number; max: number };
  multiplication: { minA: number; maxA: number; minB: number; maxB: number };
  division: { minDivisor: number; maxDivisor: number; minAnswer: number; maxAnswer: number };
  sequence: { minStep: number; maxStep: number; minStart: number; maxStart: number };
  word: { min: number; max: number };
}

const CATEGORY_CONFIG: Record<
  QuestionCategory,
  {
    label: string;
    icon: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  addition: {
    label: "Adição",
    icon: "➕",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  subtraction: {
    label: "Subtração",
    icon: "➖",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
  },
  multiplication: {
    label: "Multiplicação",
    icon: "✖️",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  division: {
    label: "Divisão",
    icon: "➗",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  sequence: {
    label: "Sequência",
    icon: "🔢",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  word: {
    label: "Problema",
    icon: "📖",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
  },
};

export function getCategoryConfig(category: QuestionCategory) {
  return CATEGORY_CONFIG[category];
}

export const GRADE_CONFIG: Record<Grade, GradeConfig> = {
  1: {
    label: "1º ano",
    emoji: "🌱",
    description: "Números pequenos e operações simples",
    color: "text-green-700",
    bg: "bg-green-100",
    addition: { min: 1, max: 20 },
    subtraction: { min: 1, max: 20 },
    multiplication: { minA: 1, maxA: 5, minB: 1, maxB: 5 },
    division: { minDivisor: 2, maxDivisor: 5, minAnswer: 1, maxAnswer: 5 },
    sequence: { minStep: 1, maxStep: 3, minStart: 1, maxStart: 10 },
    word: { min: 1, max: 20 },
  },
  2: {
    label: "2º ano",
    emoji: "🌿",
    description: "Adição e subtração até 100",
    color: "text-lime-700",
    bg: "bg-lime-100",
    addition: { min: 10, max: 99 },
    subtraction: { min: 10, max: 99 },
    multiplication: { minA: 2, maxA: 5, minB: 1, maxB: 5 },
    division: { minDivisor: 2, maxDivisor: 5, minAnswer: 2, maxAnswer: 10 },
    sequence: { minStep: 2, maxStep: 5, minStart: 1, maxStart: 30 },
    word: { min: 5, max: 80 },
  },
  3: {
    label: "3º ano",
    emoji: "🍃",
    description: "Números até 1000 e tabuada básica",
    color: "text-teal-700",
    bg: "bg-teal-100",
    addition: { min: 10, max: 999 },
    subtraction: { min: 10, max: 999 },
    multiplication: { minA: 2, maxA: 9, minB: 2, maxB: 9 },
    division: { minDivisor: 2, maxDivisor: 9, minAnswer: 2, maxAnswer: 10 },
    sequence: { minStep: 2, maxStep: 8, minStart: 1, maxStart: 50 },
    word: { min: 10, max: 500 },
  },
  4: {
    label: "4º ano",
    emoji: "🚀",
    description: "Operações até 1000 e problemas",
    color: "text-purple-700",
    bg: "bg-purple-100",
    addition: { min: 10, max: 999 },
    subtraction: { min: 10, max: 999 },
    multiplication: { minA: 2, maxA: 9, minB: 2, maxB: 9 },
    division: { minDivisor: 2, maxDivisor: 9, minAnswer: 2, maxAnswer: 12 },
    sequence: { minStep: 2, maxStep: 10, minStart: 1, maxStart: 50 },
    word: { min: 10, max: 500 },
  },
  5: {
    label: "5º ano",
    emoji: "🎯",
    description: "Números maiores e divisão com resto",
    color: "text-orange-700",
    bg: "bg-orange-100",
    addition: { min: 100, max: 9999 },
    subtraction: { min: 100, max: 9999 },
    multiplication: { minA: 2, maxA: 99, minB: 2, maxB: 9 },
    division: { minDivisor: 2, maxDivisor: 12, minAnswer: 5, maxAnswer: 50 },
    sequence: { minStep: 3, maxStep: 15, minStart: 10, maxStart: 100 },
    word: { min: 50, max: 2000 },
  },
  6: {
    label: "6º ano",
    emoji: "🔬",
    description: "Racionais, porcentagem e potências",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
    addition: { min: 100, max: 9999 },
    subtraction: { min: 100, max: 9999 },
    multiplication: { minA: 10, maxA: 99, minB: 10, maxB: 99 },
    division: { minDivisor: 2, maxDivisor: 15, minAnswer: 10, maxAnswer: 100 },
    sequence: { minStep: 5, maxStep: 25, minStart: 10, maxStart: 200 },
    word: { min: 100, max: 5000 },
  },
  7: {
    label: "7º ano",
    emoji: "⚡",
    description: "Inteiros e equações simples",
    color: "text-rose-700",
    bg: "bg-rose-100",
    addition: { min: 100, max: 9999 },
    subtraction: { min: 100, max: 9999 },
    multiplication: { minA: 10, maxA: 99, minB: 10, maxB: 99 },
    division: { minDivisor: 2, maxDivisor: 20, minAnswer: 10, maxAnswer: 100 },
    sequence: { minStep: 5, maxStep: 30, minStart: 10, maxStart: 200 },
    word: { min: 100, max: 5000 },
  },
  8: {
    label: "8º ano",
    emoji: "🧠",
    description: "Potências, raízes e expressões",
    color: "text-cyan-700",
    bg: "bg-cyan-100",
    addition: { min: 100, max: 99999 },
    subtraction: { min: 100, max: 99999 },
    multiplication: { minA: 10, maxA: 999, minB: 10, maxB: 99 },
    division: { minDivisor: 2, maxDivisor: 25, minAnswer: 10, maxAnswer: 200 },
    sequence: { minStep: 5, maxStep: 50, minStart: 10, maxStart: 500 },
    word: { min: 100, max: 10000 },
  },
  9: {
    label: "9º ano",
    emoji: "🎓",
    description: "Equações e funções afins",
    color: "text-violet-700",
    bg: "bg-violet-100",
    addition: { min: 100, max: 99999 },
    subtraction: { min: 100, max: 99999 },
    multiplication: { minA: 10, maxA: 999, minB: 10, maxB: 99 },
    division: { minDivisor: 2, maxDivisor: 25, minAnswer: 10, maxAnswer: 200 },
    sequence: { minStep: 5, maxStep: 50, minStart: 10, maxStart: 500 },
    word: { min: 100, max: 10000 },
  },
};

export const GRADES: Grade[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function getGradeConfig(grade: Grade): GradeConfig {
  return GRADE_CONFIG[grade];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generateAddition(grade: Grade): Question {
  const cfg = GRADE_CONFIG[grade].addition;
  const a = rand(cfg.min, cfg.max);
  const b = rand(cfg.min, Math.max(cfg.min, cfg.max - a));
  return {
    id: makeId(),
    category: "addition",
    statement: `Quanto é ${a} + ${b}?`,
    answer: a + b,
  };
}

function generateSubtraction(grade: Grade): Question {
  const cfg = GRADE_CONFIG[grade].subtraction;
  const a = rand(cfg.min + 1, cfg.max);
  const b = rand(cfg.min, a - 1);
  return {
    id: makeId(),
    category: "subtraction",
    statement: `Quanto é ${a} − ${b}?`,
    answer: a - b,
  };
}

function generateMultiplication(grade: Grade): Question {
  const cfg = GRADE_CONFIG[grade].multiplication;
  const a = rand(cfg.minA, cfg.maxA);
  const b = rand(cfg.minB, cfg.maxB);
  return {
    id: makeId(),
    category: "multiplication",
    statement: `Quanto é ${a} × ${b}?`,
    answer: a * b,
  };
}

function generateDivision(grade: Grade): Question {
  const cfg = GRADE_CONFIG[grade].division;
  const divisor = rand(cfg.minDivisor, cfg.maxDivisor);
  const answer = rand(cfg.minAnswer, cfg.maxAnswer);
  const dividend = divisor * answer;
  return {
    id: makeId(),
    category: "division",
    statement: `Quanto é ${dividend} ÷ ${divisor}?`,
    answer,
  };
}

function generateSequence(grade: Grade): Question {
  const cfg = GRADE_CONFIG[grade].sequence;
  const step = rand(cfg.minStep, cfg.maxStep);
  const start = rand(cfg.minStart, cfg.maxStart);
  const missingIndex = rand(2, 4);
  const sequence: number[] = [];
  for (let i = 0; i < 6; i++) {
    sequence.push(start + i * step);
  }
  const answer = sequence[missingIndex];
  sequence[missingIndex] = -1;
  const display = sequence
    .map((n, i) => (i === missingIndex ? "___" : String(n)))
    .join(", ");
  return {
    id: makeId(),
    category: "sequence",
    statement: `Complete a sequência: ${display}`,
    answer,
    displayAnswer: sequence
      .map((n, i) => (i === missingIndex ? String(answer) : String(n)))
      .join(", "),
  };
}

const WORD_NAMES = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Elisa",
  "Felipe",
  "Gabriela",
  "Henrique",
  "Isabela",
  "João",
];

const WORD_OBJECTS = [
  "figurinhas",
  "bolinhas",
  "livros",
  "lápis",
  "canetas",
  "balas",
  "pedras",
  "sorvetes",
  "brinquedos",
  "cadernos",
];

function generateWord(grade: Grade): Question {
  const cfg = GRADE_CONFIG[grade].word;
  const name = WORD_NAMES[rand(0, WORD_NAMES.length - 1)];
  const objectName = WORD_OBJECTS[rand(0, WORD_OBJECTS.length - 1)];
  const pronoun = name.toLowerCase().endsWith("a") ? "ela" : "ele";
  const article = name.toLowerCase().endsWith("a") ? "a" : "o";
  const friendSuffix = name.toLowerCase().endsWith("a") ? "a" : "";

  if (Math.random() < 0.5) {
    const a = rand(cfg.min, cfg.max);
    const b = rand(cfg.min, cfg.max);
    return {
      id: makeId(),
      category: "word",
      statement: `${name} tinha ${a} ${objectName} e ganhou mais ${b}. Quantas ${objectName} ${pronoun} tem agora?`,
      answer: a + b,
    };
  } else {
    const b = rand(cfg.min, Math.floor(cfg.max / 2));
    const a = rand(b + cfg.min, cfg.max);
    return {
      id: makeId(),
      category: "word",
      statement: `${name} tinha ${a} ${objectName} e deu ${b} para ${article} amigo${friendSuffix}. Quantas ${objectName} sobraram?`,
      answer: a - b,
    };
  }
}

function makeGenerators(grade: Grade) {
  return {
    addition: () => generateAddition(grade),
    subtraction: () => generateSubtraction(grade),
    multiplication: () => generateMultiplication(grade),
    division: () => generateDivision(grade),
    sequence: () => generateSequence(grade),
    word: () => generateWord(grade),
  };
}

const CATEGORIES: QuestionCategory[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "sequence",
  "word",
];

export function generateQuestions(count = 20, grade: Grade = 4): Question[] {
  const generators = makeGenerators(grade);
  const questions: Question[] = [];

  // Garante distribuição equilibrada: pelo menos floor(count/categories)
  const basePerCategory = Math.floor(count / CATEGORIES.length);
  for (const category of CATEGORIES) {
    for (let i = 0; i < basePerCategory; i++) {
      questions.push(generators[category]());
    }
  }

  // Completa o restante aleatoriamente
  while (questions.length < count) {
    const category = CATEGORIES[rand(0, CATEGORIES.length - 1)];
    questions.push(generators[category]());
  }

  // Embaralha
  return questions.sort(() => Math.random() - 0.5);
}
