"use client";

import {
  useMemo,
  useState,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { AnswerStatus } from "@/components/QuestionCard";
import { QuestionCardItem } from "@/components/QuestionCardItem";
import { Celebration } from "@/components/Celebration";
import {
  generateQuestions,
  Question,
  Grade,
  getGradeConfig,
} from "@/lib/questions";
import { GradeSelector } from "@/components/GradeSelector";
import { HistoryPanel } from "@/components/HistoryPanel";
import { NamePrompt } from "@/components/NamePrompt";
import {
  readHistory,
  writeHistory,
  addActivity,
  notifyHistoryChanged,
} from "@/lib/history";
import {
  writeUserName,
  notifyUserNameChanged,
  useUserName,
} from "@/lib/user";
import {
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Trophy,
  GraduationCap,
} from "lucide-react";

const STORAGE_KEY = "aventura-matematica-grade";

function readStoredGrade(): Grade | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved) as Grade;
      if (parsed >= 1 && parsed <= 9) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveStoredGrade(grade: Grade) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(grade));
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new StorageEvent("storage", { key: STORAGE_KEY, newValue: String(grade) })
  );
}

function subscribeToGrade(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

function useStoredGrade(): Grade | null {
  return useSyncExternalStore(
    subscribeToGrade,
    readStoredGrade,
    () => null
  );
}

export function QuizPage() {
  const storedGrade = useStoredGrade();
  const userName = useUserName();
  const [isSelecting, setIsSelecting] = useState(false);
  const [questionKey, setQuestionKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedGrade = isSelecting ? null : storedGrade;

  const questions = useMemo<Question[]>(() => {
    if (selectedGrade === null) return [];
    return generateQuestions(20, selectedGrade);
    // questionKey é usado apenas para forçar a regeneração das questões
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, questionKey]);

  const handleSetName = useCallback((name: string) => {
    writeUserName(name);
    notifyUserNameChanged();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSelectGrade = useCallback((grade: Grade) => {
    saveStoredGrade(grade);
    setIsSelecting(false);
    setAnswers({});
    setSubmitted(false);
    setQuestionKey(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNewQuestions = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
    setQuestionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const statuses = useMemo<Record<string, AnswerStatus>>(() => {
    const map: Record<string, AnswerStatus> = {};
    if (!submitted) {
      for (const q of questions) {
        map[q.id] = "idle";
      }
      return map;
    }
    for (const q of questions) {
      const value = answers[q.id]?.trim();
      if (value === "") {
        map[q.id] = "incorrect";
      } else {
        map[q.id] = Number(value) === q.answer ? "correct" : "incorrect";
      }
    }
    return map;
  }, [answers, questions, submitted]);

  // Com até 20 itens, o custo dessas derivações é desprezível;
  // evitamos useMemo para não pagar o overhead de hooks.
  const answeredCount = questions.filter(
    (q) => answers[q.id]?.trim() !== ""
  ).length;
  const score = Object.values(statuses).filter((s) => s === "correct").length;

  const focusFirstUnanswered = useCallback(() => {
    const firstUnanswered = questions.find((q) => !answers[q.id]?.trim());
    if (firstUnanswered) {
      inputRefs.current[firstUnanswered.id]?.focus();
      inputRefs.current[firstUnanswered.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [answers, questions]);

  const handleAnswerChange = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: value.replace(/[^0-9]/g, ""),
      }));
    },
    []
  );

  const handleSetInputRef = useCallback(
    (el: HTMLInputElement | null, questionId: string) => {
      inputRefs.current[questionId] = el;
    },
    []
  );

  const handleVerify = useCallback(() => {
    if (!selectedGrade || submitted) return;

    // Feedback imediato para o usuário; persistência do histórico
    // acontece localmente sem round-trip de rede.
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const history = readHistory();
    writeHistory(
      addActivity(
        history,
        selectedGrade,
        score,
        questions.length,
        new Date().toISOString()
      )
    );
    notifyHistoryChanged();
  }, [selectedGrade, submitted, score, questions.length]);

  const allAnswered = answeredCount === questions.length;

  if (userName === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-50 to-pink-100 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
        <NamePrompt onSubmit={handleSetName} />
      </div>
    );
  }

  if (selectedGrade === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-50 to-pink-100 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
        <GradeSelector
          onSelect={handleSelectGrade}
          currentGrade={isSelecting ? storedGrade : null}
        />
      </div>
    );
  }

  const gradeConfig = getGradeConfig(selectedGrade);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-50 to-pink-100 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
      <Celebration
        score={score}
        total={questions.length}
        trigger={submitted && score >= 18}
      />

      <main className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 text-center sm:mb-8 md:mb-10">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-purple-700 shadow-sm sm:mb-3 sm:gap-2 sm:px-5 sm:py-2 sm:text-base md:text-lg">
            <Sparkles className="size-4 sm:size-5" aria-hidden="true" />
            Aventura Matemática
          </div>
          <h1 className="mb-2 text-2xl font-black tracking-tight text-slate-800 sm:mb-3 sm:text-3xl md:text-4xl lg:text-5xl">
            Hora de praticar! 🚀
          </h1>
          <p className="mx-auto max-w-xl px-1 text-base leading-snug text-slate-600 sm:text-lg md:text-xl">
            Resolva as 20 questões abaixo. Quando terminar, clique em{" "}
            <strong className="text-purple-700">Verificar respostas</strong>.
          </p>

          {/* Ano selecionado + trocar */}
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm sm:text-base"
              style={{ backgroundColor: "white" }}
            >
              <span aria-hidden="true">{gradeConfig.emoji}</span>
              <span className={gradeConfig.color}>{gradeConfig.label}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{gradeConfig.description}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSelecting(true)}
              className="rounded-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
            >
              <GraduationCap className="mr-1 size-4" aria-hidden="true" />
              Trocar ano
            </Button>
            <HistoryPanel />
          </div>
        </header>

        {/* Progresso */}
        {!submitted && (
          <div className="mx-auto mb-6 max-w-2xl rounded-2xl bg-white p-3 shadow-sm sm:mb-8 sm:p-4 md:p-5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600 sm:text-base">
              <span>Progresso</span>
              <span>
                {answeredCount} de {questions.length}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 sm:h-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                aria-valuenow={answeredCount}
                aria-valuemax={questions.length}
                role="progressbar"
              />
            </div>
          </div>
        )}

        {/* Resultado */}
        {submitted && (
          <div className="mx-auto mb-6 max-w-3xl rounded-2xl bg-white p-5 text-center shadow-lg ring-2 ring-purple-200 sm:mb-8 sm:p-6 md:mb-10 md:rounded-3xl md:p-8">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700 sm:text-base">
              <Trophy className="size-4 sm:size-5" aria-hidden="true" />
              Resultado
            </div>
            <p className="mb-2 text-3xl font-black text-purple-700 sm:text-4xl md:text-5xl">
              Você acertou {score} de {questions.length}! 🎉
            </p>
            <p className="text-base text-slate-500 sm:text-lg">
              {score === questions.length
                ? "Incrível! Nota máxima!"
                : score >= 18
                  ? "Mandou muito bem!"
                  : score >= 14
                    ? "Bom trabalho! Continue praticando!"
                    : "Não desista! Tente novamente!"}
            </p>
          </div>
        )}

        {/* Grid de questões */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {questions.map((question, index) => (
            <QuestionCardItem
              key={question.id}
              question={question}
              index={index}
              value={answers[question.id] ?? ""}
              status={statuses[question.id] ?? "idle"}
              disabled={submitted}
              onChange={handleAnswerChange}
              setInputRef={handleSetInputRef}
            />
          ))}
        </div>

        {/* Barra de ações sticky */}
        <div className="sticky bottom-0 left-0 right-0 z-30 mt-6 border-t border-white/50 bg-white/90 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md sm:bottom-4 sm:mx-auto sm:mt-8 sm:max-w-xl sm:rounded-2xl sm:border sm:border-slate-200/60 sm:p-4 md:bottom-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {!submitted && (
              <Button
                size="lg"
                onClick={handleVerify}
                className="h-12 w-full rounded-xl bg-green-500 px-6 text-base font-bold text-white shadow-md transition-colors hover:bg-green-600 active:scale-[0.98] sm:h-14 sm:w-auto sm:rounded-2xl sm:px-8 sm:text-lg"
              >
                <CheckCircle2 className="mr-2 size-5 sm:size-6" aria-hidden="true" />
                Verificar respostas
              </Button>
            )}

            {submitted && (
              <Button
                size="lg"
                onClick={handleNewQuestions}
                className="h-12 w-full rounded-xl bg-purple-500 px-6 text-base font-bold text-white shadow-md transition-colors hover:bg-purple-600 active:scale-[0.98] sm:h-14 sm:w-auto sm:rounded-2xl sm:px-8 sm:text-lg"
              >
                <RotateCcw className="mr-2 size-5 sm:size-6" aria-hidden="true" />
                Novas questões
              </Button>
            )}

            {!allAnswered && !submitted && (
              <Button
                type="button"
                variant="ghost"
                onClick={focusFirstUnanswered}
                className="h-auto w-full px-2 py-1 text-xs font-medium text-slate-500 hover:text-purple-600 sm:w-auto sm:text-sm"
              >
                Faltam {questions.length - answeredCount} questões — ir para a próxima
              </Button>
            )}
          </div>
        </div>

        {/* Espaço extra para não cobrir conteúdo com a barra sticky */}
        <div className="h-4 sm:h-6" aria-hidden="true" />
      </main>
    </div>
  );
}
