"use client";

import { Grade, GRADES, getGradeConfig } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { BookOpen, GraduationCap, ArrowLeft } from "lucide-react";
import { Pixel } from "@/components/Pixel";
import { Button } from "@/components/ui/button";

interface GradeSelectorProps {
  onSelect: (grade: Grade) => void;
  currentGrade?: Grade | null;
  // Nome do usuário, usado para personalizar a saudação.
  userName?: string | null;
  // Rótulo da etapa no onboarding (ex.: "Passo 2 de 2"). Ausente ao trocar de ano.
  stepLabel?: string;
  // Quando presente, mostra um botão de voltar (ex.: voltar para a tela de nome).
  onBack?: () => void;
}

export function GradeSelector({
  onSelect,
  currentGrade,
  userName,
  stepLabel,
  onBack,
}: GradeSelectorProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-4 py-6 text-center sm:min-h-[70vh] sm:py-12">
      {stepLabel && (
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">
          {stepLabel}
        </p>
      )}

      <div className="flex justify-center mb-4 animate-float">
        <Pixel pose="idle" size={72} />
      </div>

      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-dark shadow-sm sm:text-base">
        <GraduationCap className="size-5" aria-hidden="true" />
        Escolha seu ano
      </div>

      <h1 className="mb-2 text-2xl font-black text-slate-800 sm:mb-3 sm:text-3xl md:text-4xl">
        {userName ? `Em qual ano você está, ${userName}? 📚` : "Em qual ano você está? 📚"}
      </h1>
      <p className="mb-6 max-w-lg px-2 text-base text-slate-600 sm:mb-8 sm:text-lg">
        Selecione o ano do ensino fundamental para receber questões com a
        dificuldade ideal para você.
      </p>

      <div className="grid w-full grid-cols-2 gap-3 px-1 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:gap-6">
        {GRADES.map((grade) => {
          const cfg = getGradeConfig(grade);
          const isSelected = currentGrade === grade;

          return (
            <button
              key={grade}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(grade)}
              className={cn(
                "card-3d group relative flex min-h-[96px] flex-col items-center justify-center rounded-2xl bg-white p-2 text-center shadow-sm sm:min-h-[120px] sm:rounded-3xl sm:p-4 md:p-5",
                "focus-visible:outline-none focus-visible:ring-[6px] focus-visible:ring-brand/20",
                isSelected
                  ? "border-brand bg-brand-light"
                  : "border-slate-200 hover:border-brand/50"
              )}
            >
              <span
                className="mb-1 text-2xl transition-transform duration-200 group-hover:scale-110 sm:mb-2 sm:text-3xl md:text-4xl"
                aria-hidden="true"
              >
                {cfg.emoji}
              </span>
              <span
                className={cn(
                  "text-sm font-black sm:text-base",
                  isSelected ? "text-brand-dark" : cfg.color
                )}
              >
                {cfg.label}
              </span>
              <span className="mt-0.5 text-[10px] leading-tight text-slate-500 sm:mt-1 sm:text-xs">
                {cfg.description}
              </span>

              {isSelected && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-[10px] text-white shadow-md sm:-right-2 sm:-top-2 sm:size-6 sm:text-xs">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-sm sm:mt-8 sm:text-base">
        <BookOpen className="size-5 shrink-0 text-brand" aria-hidden="true" />
        <span>
          Você pode trocar de ano a qualquer momento usando o botão no topo.
        </span>
      </div>

      {onBack && (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="mt-4 text-sm font-medium text-slate-500 hover:text-brand"
        >
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
          Voltar
        </Button>
      )}
    </div>
  );
}
