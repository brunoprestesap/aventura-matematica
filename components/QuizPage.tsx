"use client";

import {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { m, AnimatePresence } from "motion/react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AnswerStatus } from "@/components/QuestionCard";
import { QuestionCardItem } from "@/components/QuestionCardItem";
import { Celebration } from "@/components/Celebration";
import {
  generateQuestions,
  Question,
  QuestionCategory,
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
  makeId,
} from "@/lib/history";
import {
  writeUserName,
  notifyUserNameChanged,
  useUserName,
} from "@/lib/user";
import { markCoachmarkSeen, useCoachmarkPending } from "@/lib/onboarding";
import {
  screenTransition,
  staggerContainer,
  listItem,
  popIn,
  overlayFade,
  modalSpring,
} from "@/lib/motion";
import {
  getMastery,
  updateMastery,
  writeMastery,
  notifyMasteryChanged,
  CategoryResult,
} from "@/lib/mastery";
import {
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Trophy,
  GraduationCap,
  Pencil,
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
  const { data: session } = useSession();
  const coachmarkPending = useCoachmarkPending();
  const [isSelecting, setIsSelecting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [questionKey, setQuestionKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Herda o nome da conta Google quando o usuário está autenticado e ainda não
  // há um nome salvo localmente. Nunca sobrescreve um nome já informado.
  useEffect(() => {
    if (userName === null && session?.user?.name) {
      writeUserName(session.user.name);
      notifyUserNameChanged();
    }
  }, [userName, session]);

  const selectedGrade = isSelecting ? null : storedGrade;

  const questions = useMemo<Question[]>(() => {
    if (selectedGrade === null) return [];
    // getMastery() é lido imperativamente de propósito: a maestria é gravada
    // ao verificar respostas; se fosse dependência, verificar regeneraria as
    // questões sob as respostas já enviadas. Uma nova sessão (questionKey) ou
    // troca de ano relê a maestria mais recente.
    return generateQuestions(20, selectedGrade, { mastery: getMastery() });
    // questionKey é usado apenas para forçar a regeneração das questões
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, questionKey]);

  const handleSetName = useCallback((name: string) => {
    writeUserName(name);
    notifyUserNameChanged();
    setIsEditingName(false);
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
    (q) => (answers[q.id]?.trim() ?? "") !== ""
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

    const clientId = makeId();

    const history = readHistory();
    writeHistory(
      addActivity(
        history,
        selectedGrade,
        score,
        questions.length,
        new Date().toISOString(),
        clientId
      )
    );
    notifyHistoryChanged();

    // Atualiza a maestria por categoria (mesma regra de correção do
    // answersArray: vazio ⇒ incorreto). Persistido localmente; a próxima
    // sessão usa esses valores para o sorteio adaptativo.
    const tally = {} as Record<
      QuestionCategory,
      { correct: number; total: number }
    >;
    for (const q of questions) {
      const bucket =
        tally[q.category] ?? (tally[q.category] = { correct: 0, total: 0 });
      bucket.total += 1;
      const value = answers[q.id]?.trim();
      if (value && Number(value) === q.answer) bucket.correct += 1;
    }
    const results: CategoryResult[] = (
      Object.keys(tally) as QuestionCategory[]
    ).map((c) => ({
      category: c,
      correct: tally[c].correct,
      total: tally[c].total,
    }));
    writeMastery(updateMastery(getMastery(), results));
    notifyMasteryChanged();

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
          clientId,
        }),
      }).catch(() => {
        // Falha silenciosa — a liga não deve bloquear o fluxo do quiz
      });
    }
  }, [selectedGrade, submitted, score, questions, answers]);

  const allAnswered = answeredCount === questions.length;

  // Conteúdo da tela atual + chave estável para coordenar a transição entre
  // telas (nome → ano → quiz) via AnimatePresence mode="wait".
  let screenKey: string;
  let screenContent: ReactNode;

  if (userName === null || isEditingName) {
    screenKey = "name";
    screenContent = (
      <div className="min-h-screen bg-gradient-to-br from-bg-light via-brand-light/30 to-pink-100 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
        <NamePrompt
          onSubmit={handleSetName}
          initialName={isEditingName ? userName ?? "" : ""}
          stepLabel={isEditingName ? undefined : "Passo 1 de 2"}
          onCancel={isEditingName ? () => setIsEditingName(false) : undefined}
          showGoogle={!isEditingName}
        />
      </div>
    );
  } else if (selectedGrade === null) {
    const isOnboarding = !isSelecting;
    screenKey = "grade";
    screenContent = (
      <div className="min-h-screen bg-gradient-to-br from-bg-light via-brand-light/30 to-pink-100 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
        <GradeSelector
          onSelect={handleSelectGrade}
          currentGrade={isSelecting ? storedGrade : null}
          userName={userName}
          stepLabel={isOnboarding ? "Passo 2 de 2" : undefined}
          onBack={
            isOnboarding
              ? () => setIsEditingName(true)
              : () => setIsSelecting(false)
          }
        />
      </div>
    );
  } else {
    const gradeConfig = getGradeConfig(selectedGrade);
    screenKey = "quiz";
    screenContent = (
    <div className="min-h-screen bg-gradient-to-br from-bg-light via-brand-light/30 to-pink-100 px-3 pb-[calc(11rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pb-28 sm:pt-6 md:px-6 md:pb-32 md:pt-8 lg:pt-10">
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
            {userName ? `Hora de praticar, ${userName}! 🚀` : "Hora de praticar! 🚀"}
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
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
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
                Trocar ano
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingName(true)}
                className="rounded-full border-brand-light px-3 text-xs text-brand-dark hover:bg-brand-light hover:text-brand-dark sm:px-4 sm:text-sm"
              >
                <Pencil
                  className="mr-1 size-3.5 sm:size-4"
                  aria-hidden="true"
                />
                Trocar nome
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

        {/* Dica de primeiro uso (coachmark) */}
        <AnimatePresence>
          {coachmarkPending && !submitted && (
          <m.div
            variants={popIn}
            initial="initial"
            animate="animate"
            exit="exit"
            role="status"
            className="mx-auto mb-4 flex max-w-2xl items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-2 ring-brand-light sm:mb-6 sm:p-4"
          >
            <span className="shrink-0 text-2xl" aria-hidden="true">
              💡
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 sm:text-base">
                Como funciona
              </p>
              <p className="text-xs text-slate-500 sm:text-sm">
                Digite a resposta de cada questão e, ao terminar, toque em{" "}
                <strong className="text-brand-dark">Verificar respostas</strong>.
                O Pixel te avisa quando acertar!
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => markCoachmarkSeen()}
              className="shrink-0 rounded-full text-xs font-bold text-brand-dark hover:bg-brand-light sm:text-sm"
            >
              Entendi!
            </Button>
          </m.div>
          )}
        </AnimatePresence>

        {/* Progresso */}
        {!submitted && (
          <div className="mx-auto mb-4 max-w-2xl rounded-2xl bg-white p-3 shadow-sm sm:mb-6 sm:p-4 md:mb-8 md:p-5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600 sm:text-base">
              <span>Progresso</span>
              <span>
                {answeredCount} de {questions.length}
              </span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-brand via-brand-light to-pink-400 transition-all duration-500 ease-out shadow-[inset_0_-2px_4px_rgba(0,0,0,0.15)]"
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
          <m.div
            variants={popIn}
            initial="initial"
            animate="animate"
            className="mx-auto mb-4 max-w-3xl rounded-2xl bg-white p-4 text-center shadow-lg ring-2 ring-brand-light sm:mb-6 sm:p-5 md:mb-8 md:rounded-3xl md:p-6 lg:p-8"
          >
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
          </m.div>
        )}

        {/* Grid de questões — entrada escalonada (stagger) a cada nova rodada */}
        <m.div
          key={questionKey}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-10 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-12"
        >
          {questions.map((question, index) => (
            <m.div key={question.id} variants={listItem} className="h-full">
              <QuestionCardItem
                question={question}
                index={index}
                value={answers[question.id] ?? ""}
                status={statuses[question.id] ?? "idle"}
                disabled={submitted}
                onChange={handleAnswerChange}
                setInputRef={handleSetInputRef}
              />
            </m.div>
          ))}
        </m.div>

        {/* Barra de ações sticky */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/40 bg-white/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(13,148,136,0.15)] backdrop-blur-xl sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-3xl sm:border sm:border-slate-200/60 sm:p-4 md:bottom-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {!submitted && (
              <Button
                size="lg"
                onClick={handleVerify}
                className="btn-3d-base h-14 w-full rounded-2xl bg-green-500 border-b-4 border-green-700 px-6 text-base font-bold text-white shadow-md active:translate-y-1 active:border-b-0 active:mb-1 hover:bg-green-400 sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
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
                className="btn-3d-base btn-3d-brand h-14 w-full rounded-2xl px-6 text-base font-bold shadow-md sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
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
                Faltam {questions.length - answeredCount} — continuar
              </Button>
            )}
          </div>
        </div>

        {/* Modal da Liga */}
        <AnimatePresence>
          {leagueOpen && (
          <m.div
            variants={overlayFade}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setLeagueOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Liga semanal"
          >
            <m.div
              variants={modalSpring}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem] pb-[env(safe-area-inset-bottom)]"
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
            </m.div>
          </m.div>
          )}
        </AnimatePresence>
      </main>
    </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={screenKey}
        variants={screenTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {screenContent}
      </m.div>
    </AnimatePresence>
  );
}
