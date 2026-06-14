"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCategoryConfig, Question } from "@/lib/questions";
import { cn } from "@/lib/utils";

export type AnswerStatus = "idle" | "correct" | "incorrect";

interface QuestionCardProps {
  question: Question;
  index: number;
  value: string;
  onChange: (value: string) => void;
  status: AnswerStatus;
  disabled?: boolean;
}

export const QuestionCard = forwardRef<HTMLInputElement, QuestionCardProps>(
  function QuestionCard(
    { question, index, value, onChange, status, disabled = false },
    ref
  ) {
    const config = getCategoryConfig(question.category);
    const isCorrect = status === "correct";
    const isIncorrect = status === "incorrect";
    const isIdle = !isCorrect && !isIncorrect;

    return (
      <article
        className={cn(
          "relative flex flex-col gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-200 sm:gap-4 sm:rounded-3xl sm:p-5",
          config.border,
          isIdle && "hover:shadow-md hover:-translate-y-0.5",
          isCorrect &&
            "border-green-400 bg-green-50 ring-2 ring-green-300/60",
          isIncorrect && "border-red-400 bg-red-50 ring-2 ring-red-300/60"
        )}
      >
        {/* Cabeçalho: badge + número + status */}
        <div className="flex items-start justify-between gap-2">
          <Badge
            className={cn(
              "rounded-full border-transparent px-2.5 py-1 text-xs font-bold sm:px-3 sm:text-sm",
              config.bg,
              config.color
            )}
          >
            <span className="mr-1" aria-hidden="true">
              {config.icon}
            </span>
            {config.label}
          </Badge>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold text-slate-400 sm:text-sm"
              aria-label={`Questão ${index}`}
            >
              #{index}
            </span>
            {isCorrect && (
              <span
                className="animate-pop text-2xl text-green-500 sm:text-3xl"
                aria-label="Correta"
                role="img"
              >
                ✓
              </span>
            )}
            {isIncorrect && (
              <span
                className="animate-pop text-2xl text-red-500 sm:text-3xl"
                aria-label="Incorreta"
                role="img"
              >
                ✗
              </span>
            )}
          </div>
        </div>

        {/* Enunciado */}
        <p className="flex-1 text-lg font-semibold leading-snug text-slate-800 sm:text-xl md:text-2xl md:leading-relaxed">
          {question.statement}
        </p>

        {/* Input e feedback */}
        <div className="flex flex-col gap-2">
          <Input
            ref={ref}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="?"
            aria-label={`Resposta para a questão ${index}: ${question.statement}`}
            className={cn(
              "h-14 w-full min-w-0 rounded-xl border-2 px-3 text-center text-2xl font-bold tracking-wider text-slate-900 shadow-inner transition-all placeholder:text-2xl placeholder:font-bold placeholder:text-slate-300 sm:h-16 sm:text-3xl sm:placeholder:text-3xl",
              "focus-visible:ring-4 focus-visible:ring-offset-2",
              isIdle &&
                "border-slate-200 bg-slate-50 hover:border-slate-300 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-blue-300",
              isCorrect &&
                "border-green-500 bg-green-100 text-green-700 focus-visible:ring-green-300",
              isIncorrect &&
                "border-red-500 bg-red-100 text-red-700 focus-visible:ring-red-300"
            )}
          />

          {isIncorrect && (
            <div className="animate-pop rounded-xl bg-red-100 p-2.5 sm:p-3">
              <p className="text-sm font-bold text-red-700 sm:text-base">
                Resposta certa: {question.answer}
              </p>
              {question.displayAnswer && (
                <p className="mt-0.5 text-xs font-medium text-red-500 sm:text-sm">
                  Sequência completa: {question.displayAnswer}
                </p>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }
);
