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
import { InstallPrompt } from "@/components/InstallPrompt";
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
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { migrateLocalStorage } from "@/lib/migrate";

// Migra os dados das chaves antigas (Aventura Matemática) ao carregar o módulo,
// antes de qualquer leitura síncrona do localStorage feita pelos hooks de store.
// O módulo só roda no cliente (QuizPageLoader usa ssr: false) e a função é
// idempotente e protegida por guarda `typeof window`.
migrateLocalStorage();

const LeaguePanel = dynamic(
  () => import("@/components/LeaguePanel").then((mod) => mod.LeaguePanel),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-muted-foreground">Carregando liga...</div>
    ),
  }
);

const STORAGE_KEY = "continha-magica-grade";

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
  const [leagueOpen, setLeagueOpen] = useState(false);
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

    // Envia resultado para a liga em background (não bloqueia a UI)
    const answersArray = questions.map(
      (q) => Number(answers[q.id]?.trim()) === q.answer
    );

    if (answersArray.length === 20) {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedGrade,
          correct: score,
          answers: answersArray,
        }),
      }).catch(() => {
        // Falha silenciosa — a liga não deve bloquear o fluxo do quiz
      });
    }
  }, [selectedGrade, submitted, score, questions, answers]);

  const allAnswered = answeredCount === questions.length;

  if (userName === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-light via-brand-light/30 to-pink-100 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
        <NamePrompt onSubmit={handleSetName} />
      </div>
    );
  }

  if (selectedGrade === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-light via-brand-light/30 to-pink-100 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
        <GradeSelector
          onSelect={handleSelectGrade}
          currentGrade={isSelecting ? storedGrade : null}
        />
      </div>
    );
  }

  const gradeConfig = getGradeConfig(selectedGrade);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-light via-brand-light/30 to-pink-100 px-3 pb-24 pt-4 sm:px-4 sm:pb-28 sm:pt-6 md:px-6 md:pb-32 md:pt-8 lg:pt-10">
      <Celebration
        score={score}
        total={questions.length}
        trigger={submitted && score >= 18}
      />

      <main className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-4 text-center sm:mb-6 md:mb-8">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-dark shadow-sm sm:mb-3 sm:gap-2 sm:px-5 sm:py-2 sm:text-sm md:text-base">
            <Sparkles className="size-4 sm:size-5" aria-hidden="true" />
            Continha Mágica
          </div>
          <h1 className="mb-1 text-xl font-black tracking-tight text-slate-800 sm:mb-2 sm:text-3xl md:text-4xl lg:text-5xl">
            Hora de praticar! 🚀
          </h1>
          <p className="mx-auto max-w-xl px-1 text-sm leading-snug text-slate-600 sm:text-base md:text-lg lg:text-xl">
            Resolva as 20 questões abaixo. Quando terminar, clique em{" "}
            <strong className="text-brand-dark">Verificar respostas</strong>.
          </p>

          {/* Ano selecionado + ações */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4 sm:gap-3">
            <div
              className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm sm:gap-2 sm:px-4 sm:text-sm"
              style={{ backgroundColor: "white" }}
            >
              <span aria-hidden="true">{gradeConfig.emoji}</span>
              <span className={gradeConfig.color}>{gradeConfig.label}</span>
              <span className="hidden text-slate-400 sm:inline">·</span>
              <span className="hidden max-w-[120px] truncate text-slate-500 sm:inline md:max-w-none">
                {gradeConfig.description}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSelecting(true)}
                className="rounded-full border-brand-light px-3 text-xs text-brand-dark hover:bg-brand-light hover:text-brand-dark sm:px-4 sm:text-sm"
              >
                <GraduationCap
                  className="mr-1 size-3.5 sm:size-4"
                  aria-hidden="true"
                />
                Trocar
              </Button>
              <HistoryPanel />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLeagueOpen(true)}
                className="rounded-full border-brand-light px-3 text-xs text-brand-dark hover:bg-brand-light hover:text-brand-dark sm:px-4 sm:text-sm"
              >
                <Trophy
                  className="mr-1 size-3.5 sm:size-4"
                  aria-hidden="true"
                />
                Liga
              </Button>
              <InstallPrompt />
            </div>
          </div>
        </header>

        {/* Progresso */}
        {!submitted && (
          <div className="mx-auto mb-4 max-w-2xl rounded-2xl bg-white p-3 shadow-sm sm:mb-6 sm:p-4 md:mb-8 md:p-5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600 sm:text-base">
              <span>Progresso</span>
              <span>
                {answeredCount} de {questions.length}
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-pink-500 transition-all duration-500 ease-out"
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
          <div className="mx-auto mb-4 max-w-3xl rounded-2xl bg-white p-4 text-center shadow-lg ring-2 ring-brand-light sm:mb-6 sm:p-5 md:mb-8 md:rounded-3xl md:p-6 lg:p-8">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-dark sm:text-sm">
              <Trophy className="size-4 sm:size-5" aria-hidden="true" />
              Resultado
            </div>
            <p className="mb-1 text-2xl font-black text-brand-dark sm:text-3xl md:text-4xl lg:text-5xl">
              Você acertou {score} de {questions.length}! 🎉
            </p>
            <p className="text-sm text-slate-500 sm:text-base">
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
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/50 bg-white/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:border-slate-200/60 sm:p-4 md:bottom-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {!submitted && (
              <Button
                size="lg"
                onClick={handleVerify}
                className="h-12 w-full rounded-xl bg-green-500 px-6 text-base font-bold text-white shadow-md transition-colors hover:bg-green-600 active:scale-[0.98] sm:h-14 sm:w-auto sm:rounded-2xl sm:px-8 sm:text-lg"
              >
                <CheckCircle2
                  className="mr-2 size-5 sm:size-6"
                  aria-hidden="true"
                />
                Verificar respostas
              </Button>
            )}

            {submitted && (
              <Button
                size="lg"
                onClick={handleNewQuestions}
                className="h-12 w-full rounded-xl bg-brand px-6 text-base font-bold text-white shadow-md transition-colors hover:bg-brand-dark active:scale-[0.98] sm:h-14 sm:w-auto sm:rounded-2xl sm:px-8 sm:text-lg"
              >
                <RotateCcw
                  className="mr-2 size-5 sm:size-6"
                  aria-hidden="true"
                />
                Novas questões
              </Button>
            )}

            {!allAnswered && !submitted && (
              <Button
                type="button"
                variant="ghost"
                onClick={focusFirstUnanswered}
                className="h-auto min-h-10 w-full px-2 py-1 text-xs font-medium text-slate-500 hover:text-brand sm:w-auto sm:text-sm"
              >
                Faltam {questions.length - answeredCount} questões — ir para a
                próxima
              </Button>
            )}
          </div>
        </div>

        {/* Modal da Liga */}
        {leagueOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setLeagueOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Liga semanal"
          >
            <div
              className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-brand-light p-4">
                <div className="flex items-center gap-2 text-brand-dark">
                  <Trophy className="size-5" aria-hidden="true" />
                  <h2 className="text-base font-black sm:text-lg">
                    Liga semanal
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLeagueOpen(false)}
                  className="rounded-full text-slate-500 hover:bg-brand-light hover:text-brand-dark"
                >
                  <X className="size-5" aria-hidden="true" />
                  <span className="sr-only">Fechar</span>
                </Button>
              </div>
              <div className="overflow-y-auto p-3 sm:p-4">
                <LeaguePanel />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
