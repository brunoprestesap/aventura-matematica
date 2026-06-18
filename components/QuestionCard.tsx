"use client";

import { forwardRef, memo } from "react";
import { m } from "motion/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCategoryConfig, Question } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { cardFeedback } from "@/lib/motion";
import { Pixel } from "@/components/Pixel";
import type { PixelPose } from "@/components/Pixel";

export type AnswerStatus = "idle" | "correct" | "incorrect";

interface QuestionCardProps {
  question: Question;
  index: number;
  value: string;
  onChange: (value: string) => void;
  status: AnswerStatus;
  disabled?: boolean;
}

export const QuestionCard = memo(
  forwardRef<HTMLInputElement, QuestionCardProps>(function QuestionCard(
    { question, index, value, onChange, status, disabled = false },
    ref
  ) {
    const config = getCategoryConfig(question.category);
    const isCorrect = status === "correct";
    const isIncorrect = status === "incorrect";
    const isIdle = !isCorrect && !isIncorrect;

    const pixelPose: PixelPose = isCorrect
      ? "correct"
      : isIncorrect
        ? "wrong"
        : value
          ? "thinking"
          : "idle";

    return (
      <m.article
        initial={false}
        animate={status}
        variants={cardFeedback}
        className={cn(
          "relative flex min-h-full flex-col gap-3 rounded-[1.5rem] border-[3px] bg-white p-4 shadow-md transition-all duration-200 sm:gap-4 sm:rounded-[2rem] sm:border-4 sm:p-5",
          config.border,
          isIdle && "hover:-translate-y-1 hover:shadow-lg",
          isCorrect &&
            "border-green-400 bg-green-50 ring-4 ring-green-300/40",
          isIncorrect && "border-red-400 bg-red-50 ring-4 ring-red-300/40"
        )}
      >
        <div className="absolute -right-2 -top-4 z-10 origin-top-right scale-90 sm:-right-3 sm:-top-5 sm:scale-100">
          <Pixel pose={pixelPose} size={56} animated={pixelPose === "correct" || pixelPose === "thinking"} />
        </div>

        {/* Cabeçalho: badge + número + status */}
        <div className="flex items-start justify-between gap-2">
          <Badge
            className={cn(
              "shrink-0 rounded-full border-transparent px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-xs",
              config.bg,
              config.color
            )}
          >
            <span className="mr-1" aria-hidden="true">
              {config.icon}
            </span>
            {config.label}
          </Badge>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className="text-[10px] font-bold text-slate-400 sm:text-xs"
              aria-label={`Questão ${index}`}
            >
              #{index}
            </span>
            {isCorrect && (
              <span
                className="animate-pop-in text-xl text-green-500 sm:text-2xl"
                aria-label="Correta"
                role="img"
              >
                ✓
              </span>
            )}
            {isIncorrect && (
              <span
                className="animate-pop-in text-xl text-red-500 sm:text-2xl"
                aria-label="Incorreta"
                role="img"
              >
                ✗
              </span>
            )}
          </div>
        </div>

        {/* Enunciado */}
        <p className="flex-1 text-base font-semibold leading-snug text-slate-800 sm:text-lg md:text-xl md:leading-relaxed">
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
              "h-14 w-full min-w-0 rounded-2xl border-[3px] px-3 text-center text-2xl font-black tracking-wider text-slate-900 shadow-inner transition-all placeholder:text-2xl placeholder:font-black placeholder:text-slate-300 sm:h-16 sm:text-3xl sm:placeholder:text-3xl",
              "focus-visible:outline-none focus-visible:ring-[6px] focus-visible:ring-offset-0",
              isIdle &&
                "border-slate-200 bg-slate-50 hover:border-slate-300 focus-visible:border-brand-light focus-visible:bg-white focus-visible:ring-brand-light/30",
              isCorrect &&
                "border-green-500 bg-green-100 text-green-700 focus-visible:ring-green-400/40",
              isIncorrect &&
                "border-red-500 bg-red-100 text-red-700 focus-visible:ring-red-400/40"
            )}
          />

          {question.category === "sequence" && isIdle && (
            <p className="text-center text-xs font-medium text-slate-400 sm:text-sm">
              Complete o número que falta na sequência.
            </p>
          )}

          {isIncorrect && (
            <div className="animate-pop-in rounded-xl bg-red-100 p-2 sm:p-3">
              <p className="text-sm font-bold text-red-700">
                Resposta certa: {question.answer}
              </p>
              <p className="mt-0.5 text-xs font-medium text-red-600 sm:text-sm">
                {question.explanation}
              </p>
              {question.displayAnswer && (
                <p className="mt-0.5 text-xs font-medium text-red-500 sm:text-sm">
                  Sequência completa: {question.displayAnswer}
                </p>
              )}
            </div>
          )}
        </div>
      </m.article>
    );
  })
);

QuestionCard.displayName = "QuestionCard";
