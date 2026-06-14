"use client";

import { Grade, GRADES, getGradeConfig } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { BookOpen, GraduationCap } from "lucide-react";

interface GradeSelectorProps {
  onSelect: (grade: Grade) => void;
  currentGrade?: Grade | null;
}

export function GradeSelector({ onSelect, currentGrade }: GradeSelectorProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[70vh] sm:py-12">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-purple-700 shadow-sm sm:text-base">
        <GraduationCap className="size-5" aria-hidden="true" />
        Escolha seu ano
      </div>

      <h2 className="mb-3 text-2xl font-black text-slate-800 sm:text-3xl md:text-4xl">
        Em qual ano você está? 📚
      </h2>
      <p className="mb-8 max-w-lg text-base text-slate-600 sm:text-lg">
        Selecione o ano do ensino fundamental para receber questões com a
        dificuldade ideal para você.
      </p>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
        {GRADES.map((grade) => {
          const cfg = getGradeConfig(grade);
          const isSelected = currentGrade === grade;

          return (
            <button
              key={grade}
              type="button"
              onClick={() => onSelect(grade)}
              className={cn(
                "group relative flex flex-col items-center rounded-2xl border-2 bg-white p-4 text-center shadow-sm transition-all duration-200 sm:rounded-3xl sm:p-5",
                "hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300",
                isSelected
                  ? "border-purple-500 bg-purple-50 ring-2 ring-purple-300"
                  : "border-slate-200 hover:border-purple-300"
              )}
            >
              <span
                className="mb-2 text-3xl transition-transform duration-200 group-hover:scale-110 sm:text-4xl"
                aria-hidden="true"
              >
                {cfg.emoji}
              </span>
              <span
                className={cn(
                  "text-base font-black sm:text-lg",
                  isSelected ? "text-purple-700" : cfg.color
                )}
              >
                {cfg.label}
              </span>
              <span className="mt-1 text-xs leading-tight text-slate-500 sm:text-sm">
                {cfg.description}
              </span>

              {isSelected && (
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-purple-500 text-xs text-white shadow-md sm:size-7">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-sm sm:text-base">
        <BookOpen className="size-5 text-purple-600" aria-hidden="true" />
        <span>
          Você pode trocar de ano a qualquer momento usando o botão no topo.
        </span>
      </div>
    </div>
  );
}
