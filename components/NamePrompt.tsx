"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smile, Star, Rocket } from "lucide-react";

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

export function NamePrompt({ onSubmit }: NamePromptProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl shadow-purple-200/60 sm:rounded-[2rem] sm:p-8 md:p-10">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700 shadow-sm sm:mb-4 sm:text-base">
            <Smile className="size-5" aria-hidden="true" />
            <span>Ei, pequeno matemático!</span>
          </div>

          <h2 className="mb-2 text-2xl font-black leading-tight text-slate-800 sm:text-3xl md:text-4xl">
            Como devo te chamar? 🚀
          </h2>

          <p className="mx-auto max-w-xs text-base leading-relaxed text-slate-600 sm:max-w-sm sm:text-lg">
            Me conta seu nome para deixar a aventura ainda mais divertida!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4 sm:mb-6">
            <label
              htmlFor="child-name"
              className="mb-2 block text-left text-sm font-bold text-slate-700 sm:text-base"
            >
              Seu nome
            </label>
            <Input
              id="child-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite aqui"
              maxLength={30}
              autoFocus
              autoComplete="given-name"
              className="h-14 w-full rounded-2xl border-2 border-purple-200 bg-slate-50 px-5 text-center text-lg font-bold text-slate-800 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus-visible:border-purple-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-purple-300/50 sm:h-16 sm:text-xl"
            />
          </div>

          <div className="mb-5 sm:mb-6">
            <Button
              type="submit"
              size="lg"
              disabled={!name.trim()}
              className="h-14 w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 text-base font-bold text-white shadow-lg shadow-purple-300/40 transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:h-16 sm:text-lg"
            >
              <Rocket className="mr-2 size-5" aria-hidden="true" />
              Começar aventura
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500 sm:text-sm">
            <Star className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>Seu nome fica guardado neste aparelho</span>
          </div>
        </form>
      </div>
    </div>
  );
}
