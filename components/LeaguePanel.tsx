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

  // Usuário não autenticado
  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Entre com sua conta Google para participar das ligas semanais.
        </p>
        <button
          onClick={() => signIn("google")}
          className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!data?.authenticated || !data.hasGroup) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <span className="text-3xl">{data?.leagueEmoji ?? "🥉"}</span>
        <p className="font-medium">{data?.leagueLabel ?? "Bronze"}</p>
        <p className="text-sm text-muted-foreground">
          Complete uma sessão de quiz para entrar no grupo desta semana!
        </p>
        <button
          onClick={() => signOut()}
          className="mt-2 text-xs text-muted-foreground underline"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho da liga */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.leagueEmoji}</span>
          <div>
            <p className="text-sm font-medium">{data.leagueLabel}</p>
            <p className="text-xs text-muted-foreground">Liga desta semana</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-xs text-muted-foreground underline"
        >
          Sair
        </button>
      </div>

      {/* Legenda de zonas */}
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Top {data.promotionSlots} sobem
        </span>
        {(data.demotionSlots ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            Últimos {data.demotionSlots} descem
          </span>
        )}
      </div>

      {/* Placar */}
      <ul className="flex flex-col gap-1">
        {data.placar?.map((entry) => (
          <li
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              entry.isCurrentUser && "bg-brand-light font-medium dark:bg-bg-dark",
              entry.zone === "promotion" && "border-l-2 border-green-500",
              entry.zone === "demotion" && "border-l-2 border-red-400"
            )}
          >
            <span className="w-5 text-center text-xs text-muted-foreground">
              {entry.rank}
            </span>
            {entry.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.image}
                alt={entry.name}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-brand-light dark:bg-bg-dark" />
            )}
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {entry.xpWeekly} XP
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
