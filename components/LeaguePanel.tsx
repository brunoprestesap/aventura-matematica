"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface PlacarEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  xpWeekly: number;
  isCurrentUser: boolean;
  zone: "promotion" | "safe" | "demotion";
}

interface LigaData {
  authenticated: boolean;
  hasGroup?: boolean;
  currentLeague?: string;
  leagueLabel?: string;
  leagueEmoji?: string;
  weekStart?: string;
  placar?: PlacarEntry[];
  promotionSlots?: number;
  demotionSlots?: number;
}

// Medalhas do pódio para os três primeiros; demais usam o número.
const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaguePanel() {
  const { status } = useSession();
  const [data, setData] = useState<LigaData | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/liga/semana")
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData(null));
    }
  }, [status]);

  const loading = status === "authenticated" && data === null;

  // No app nativo o OAuth do Google é bloqueado dentro do WebView.
  // Delega ao shell nativo, que abre o browser do sistema e devolve a sessão.
  function handleLogin() {
    if (typeof window !== "undefined" && window.__NATIVE_APP__) {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "NATIVE_LOGIN" }));
      return;
    }
    signIn("google");
  }

  // Usuário não autenticado
  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
        <span className="grid size-14 place-items-center rounded-3xl bg-amber-50 text-3xl shadow-sm ring-1 ring-amber-100">
          🏆
        </span>
        <p className="max-w-[15rem] text-sm leading-relaxed text-slate-600">
          Entre com sua conta Google para competir nas ligas semanais e subir no
          ranking.
        </p>
        <button
          onClick={handleLogin}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand/25 transition-colors hover:bg-brand-dark"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-7 animate-spin rounded-full border-[3px] border-brand-subtle border-t-brand" />
      </div>
    );
  }

  if (!data?.authenticated || !data.hasGroup) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-subtle to-white text-4xl shadow-sm ring-1 ring-brand-light/40">
          {data?.leagueEmoji ?? "🥉"}
        </span>
        <p className="text-lg font-black text-brand-dark">
          {data?.leagueLabel ?? "Bronze"}
        </p>
        <p className="max-w-[16rem] text-sm leading-relaxed text-slate-600">
          Complete uma sessão de quiz para entrar no grupo desta semana e disputar
          a subida de liga!
        </p>
        <button
          onClick={() => signOut()}
          className="mt-1 rounded-full px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cartão da liga atual */}
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-subtle to-brand-subtle/30 p-3 ring-1 ring-brand-light/40">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
          {data.leagueEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-brand-dark">
            {data.leagueLabel}
          </p>
          <p className="text-xs font-medium text-brand">Liga desta semana</p>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-full px-3 py-1 text-xs font-medium text-brand-dark/60 transition-colors hover:bg-white/70 hover:text-brand-dark"
        >
          Sair
        </button>
      </div>

      {/* Legenda de zonas */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-500" />
          Top {data.promotionSlots} sobem
        </span>
        {(data.demotionSlots ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600">
            <span className="size-2 rounded-full bg-red-400" />
            Últimos {data.demotionSlots} descem
          </span>
        )}
      </div>

      {/* Placar */}
      <ul className="flex flex-col gap-1.5">
        {data.placar?.map((entry) => {
          const medal = MEDALS[entry.rank];
          return (
            <li
              key={entry.userId}
              className={cn(
                "relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm transition-colors",
                // Linha do usuário atual — destaque "holofote" em teal, sempre legível
                entry.isCurrentUser
                  ? "bg-gradient-to-r from-brand-dark to-[#0b5e57] text-white shadow-md shadow-brand/25"
                  : entry.zone === "promotion"
                    ? "bg-emerald-50/60"
                    : entry.zone === "demotion"
                      ? "bg-red-50/50"
                      : "bg-slate-50 hover:bg-brand-subtle/50",
                // Trilho lateral indicando a zona (vale também para o usuário atual)
                entry.zone === "promotion" && "border-l-4 border-green-500",
                entry.zone === "demotion" && "border-l-4 border-red-400"
              )}
            >
              {/* Posição: medalha no pódio, número nos demais */}
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  medal && "text-base",
                  !medal &&
                    (entry.isCurrentUser
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-500 ring-1 ring-slate-200")
                )}
                aria-label={`Posição ${entry.rank}`}
              >
                {medal ?? entry.rank}
              </span>

              {/* Avatar com fallback de inicial */}
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.image}
                  alt={entry.name}
                  className="size-8 shrink-0 rounded-full object-cover ring-2 ring-white/70"
                />
              ) : (
                <div
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold uppercase",
                    entry.isCurrentUser
                      ? "bg-white/20 text-white"
                      : "bg-brand-subtle text-brand-dark"
                  )}
                  aria-hidden="true"
                >
                  {entry.name?.charAt(0) ?? "?"}
                </div>
              )}

              <span
                className={cn(
                  "flex-1 truncate",
                  entry.isCurrentUser ? "font-bold" : "font-medium text-slate-700"
                )}
              >
                {entry.name}
              </span>

              {/* XP em destaque dourado ("Mel") */}
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums",
                  entry.isCurrentUser
                    ? "bg-amber-300 text-brand-dark"
                    : "bg-amber-50 text-amber-700"
                )}
              >
                {entry.xpWeekly} XP
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
