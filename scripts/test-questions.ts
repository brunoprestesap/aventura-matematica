import {
  generateQuestions,
  QuestionCategory,
  GRADES,
  Grade,
  getGradeConfig,
} from "../lib/questions";

const TOTAL_RUNS = 20;
const QUESTIONS_PER_RUN = 20;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

for (const grade of GRADES) {
  const cfg = getGradeConfig(grade);
  const counts: Record<QuestionCategory | "total", number> = {
    addition: 0,
    subtraction: 0,
    multiplication: 0,
    division: 0,
    sequence: 0,
    word: 0,
    total: 0,
  };

  for (let i = 0; i < TOTAL_RUNS; i++) {
    const questions = generateQuestions(QUESTIONS_PER_RUN, grade);
    assert(
      questions.length === QUESTIONS_PER_RUN,
      `[${grade}º] Esperado ${QUESTIONS_PER_RUN} questões, mas gerou ${questions.length}`
    );

    for (const q of questions) {
      counts[q.category]++;
      counts.total++;

      // Verifica limites de dificuldade
      switch (q.category) {
        case "addition":
          assert(
            q.answer <= cfg.addition.max * 2,
            `[${grade}º] Adição fora do esperado: ${q.statement} = ${q.answer}`
          );
          break;
        case "subtraction":
          assert(
            q.answer <= cfg.subtraction.max,
            `[${grade}º] Subtração fora do esperado: ${q.statement} = ${q.answer}`
          );
          break;
        case "multiplication": {
          const match = q.statement.match(/Quanto é (\d+) × (\d+)\?/);
          if (match) {
            const [, a, b] = match;
            assert(
              Number(a) <= cfg.multiplication.maxA &&
                Number(b) <= cfg.multiplication.maxB,
              `[${grade}º] Multiplicação fora do esperado: ${q.statement}`
            );
          }
          break;
        }
        case "division": {
          const match = q.statement.match(/Quanto é (\d+) ÷ (\d+)\?/);
          if (match) {
            const [, dividend, divisor] = match;
            assert(
              Number(divisor) <= cfg.division.maxDivisor,
              `[${grade}º] Divisão fora do esperado: ${q.statement}`
            );
            assert(
              Number(dividend) % Number(divisor) === 0,
              `[${grade}º] Divisão não exata: ${q.statement}`
            );
          }
          break;
        }
      }
    }
  }

  console.log(`\n[${grade}º ano] ${cfg.emoji} ${cfg.description}`);
  console.log(`  Distribuição:`);
  for (const cat of Object.keys(counts).filter(
    (k): k is QuestionCategory => k !== "total"
  )) {
    const avg = (counts[cat] / counts.total) * 100;
    console.log(`    ${cat}: ${avg.toFixed(1)}%`);
  }
}

console.log("\n✓ Todos os testes passaram para todos os anos!");
