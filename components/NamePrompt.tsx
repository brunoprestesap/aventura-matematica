"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smile, Star, Rocket } from "lucide-react";
import { Pixel } from "@/components/Pixel";
import { signInWithGoogle } from "@/lib/auth-client";

interface NamePromptProps {
  onSubmit: (name: string) => void;
  // Nome inicial (modo edição: trocar o nome já cadastrado).
  initialName?: string;
  // Rótulo da etapa no onboarding (ex.: "Passo 1 de 2"). Ausente ao editar.
  stepLabel?: string;
  // Quando presente, mostra um botão de voltar/cancelar (modo edição).
  onCancel?: () => void;
  // Exibe a opção "Entrar com o Google" (padrão: true).
  showGoogle?: boolean;
}

export function NamePrompt({
  onSubmit,
  initialName = "",
  stepLabel,
  onCancel,
  showGoogle = true,
}: NamePromptProps) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl shadow-brand-light/60 sm:rounded-[2rem] sm:p-8 md:p-10">
        <div className="mb-6 text-center sm:mb-8">
          {stepLabel && (
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">
              {stepLabel}
            </p>
          )}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-2 text-sm font-bold text-brand-dark shadow-sm sm:mb-4 sm:text-base">
            <Smile className="size-5" aria-hidden="true" />
            <span>Ei, pequeno mago da matemática!</span>
          </div>

          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="animate-float">
              <Pixel pose="idle" size={96} />
            </div>
            <p className="text-sm text-muted-foreground">Olá! Eu sou o Pixel 👋</p>
          </div>

          <h1 className="mb-2 text-2xl font-black leading-tight text-slate-800 sm:text-3xl md:text-4xl">
            Bem-vindo ao Continha Mágica! 🪄
          </h1>

          <p className="mx-auto max-w-xs text-base leading-relaxed text-slate-600 sm:max-w-sm sm:text-lg">
            Me conta seu nome para começarmos a nossa aventura mágica!
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
              placeholder="Seu nome de mago..."
              maxLength={30}
              autoFocus
              autoComplete="given-name"
              className="h-14 w-full rounded-2xl border-4 border-brand-light bg-slate-50 px-5 text-center text-lg font-bold text-slate-800 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus-visible:border-brand focus-visible:bg-white focus-visible:ring-[6px] focus-visible:ring-brand/20 sm:h-16 sm:text-xl"
            />
          </div>

          <div className="mb-4">
            <Button
              type="submit"
              size="lg"
              disabled={!name.trim()}
              className="btn-3d-base btn-3d-magic h-14 w-full rounded-2xl px-6 text-base font-bold shadow-lg shadow-brand/40 disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:text-lg"
            >
              <Rocket className="mr-2 size-5" aria-hidden="true" />
              Começar a magia
            </Button>
          </div>

          {showGoogle && (
            <div className="mb-5 sm:mb-6">
              <div className="mb-3 flex items-center gap-3 text-xs font-medium text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                ou
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => signInWithGoogle()}
                className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 sm:h-14 sm:text-base"
              >
                <GoogleIcon />
                Entrar com o Google
              </Button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Usamos o nome da sua conta e liberamos as ligas semanais.
              </p>
            </div>
          )}

          {onCancel && (
            <div className="mb-5">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="h-auto w-full text-sm font-medium text-slate-500 hover:text-brand"
              >
                Voltar
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500 sm:text-sm">
            <Star className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>Seu nome fica guardado neste aparelho</span>
          </div>
        </form>
      </div>
    </div>
  );
}

// Ícone "G" colorido do Google (inline para evitar dependência extra).
function GoogleIcon() {
  return (
    <svg className="mr-2 size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
