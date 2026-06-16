import { describe, expect, it, vi } from "vitest";
import {
  calculateXP,
  leagueUp,
  leagueDown,
  currentWeekStart,
  LEAGUE_ORDER,
  LEAGUE_LABELS,
  LEAGUE_EMOJI,
  PROMOTION_SLOTS,
  DEMOTION_SLOTS,
  MAX_GROUP_SIZE,
} from "@/lib/league";
import type { LeagueTier } from "@prisma/client";

describe("calculateXP", () => {
  it("retorna 0 quando não há acertos", () => {
    expect(calculateXP(0, new Array(20).fill(false))).toBe(0);
  });

  it("retorna 10 XP por acerto sem combos", () => {
    expect(calculateXP(1, [true, false])).toBe(10);
    expect(calculateXP(2, [true, true, false])).toBe(20);
  });

  it("adiciona +5 XP a partir do 3º acerto consecutivo", () => {
    const answers = [true, true, true, false];
    const correct = answers.filter(Boolean).length;
    // 3 acertos = 30 base + 5 (3º consecutivo)
    expect(calculateXP(correct, answers)).toBe(35);
  });

  it("bonifica combos em sequências maiores", () => {
    const answers = new Array(20).fill(true);
    // 20 acertos = 200 base + 18 combos * 5 + 20 bônus completo
    expect(calculateXP(20, answers)).toBe(200 + 18 * 5 + 20);
  });

  it("reseta o combo após erro", () => {
    const answers = [true, true, true, false, true, true, true, true];
    const correct = answers.filter(Boolean).length;
    // 7 acertos = 70 base
    // combo 1: 3 acertos -> +5
    // erro reseta
    // combo 2: 4 acertos -> +5 +5 (a partir do 3º)
    // total combo = 15
    expect(calculateXP(correct, answers)).toBe(70 + 15);
  });

  it("adiciona bônus de sessão completa apenas com 20 respostas", () => {
    // 10 acertos consecutivos: 100 base + 8 combos * 5 + 20 bônus completo
    expect(calculateXP(10, new Array(20).fill(false).map((_, i) => i < 10))).toBe(100 + 8 * 5 + 20);
    // 10 acertos sem sessão completa: 100 base + 8 combos * 5
    expect(calculateXP(10, new Array(19).fill(false).map((_, i) => i < 10))).toBe(100 + 8 * 5);
  });
});

describe("movimentação de ligas", () => {
  it("sobe uma liga corretamente", () => {
    expect(leagueUp("bronze")).toBe("prata");
    expect(leagueUp("ouro")).toBe("safira");
  });

  it("não sobe além do diamante", () => {
    expect(leagueUp("diamante")).toBe("diamante");
  });

  it("desce uma liga corretamente", () => {
    expect(leagueDown("prata")).toBe("bronze");
    expect(leagueDown("safira")).toBe("ouro");
  });

  it("não desce abaixo do bronze", () => {
    expect(leagueDown("bronze")).toBe("bronze");
  });
});

describe("currentWeekStart", () => {
  it("retorna segunda-feira 00:00:00 UTC", () => {
    const weekStart = currentWeekStart();
    expect(weekStart.getUTCDay()).toBe(1);
    expect(weekStart.getUTCHours()).toBe(0);
    expect(weekStart.getUTCMinutes()).toBe(0);
    expect(weekStart.getUTCSeconds()).toBe(0);
    expect(weekStart.getUTCMilliseconds()).toBe(0);
  });

  it("é no máximo 6 dias antes de agora", () => {
    const now = new Date();
    const weekStart = currentWeekStart();
    const diffMs = now.getTime() - weekStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(0);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  it("no domingo, retorna a segunda-feira anterior (ramo day === 0)", () => {
    vi.useFakeTimers();
    try {
      // 2024-01-07 é um domingo (UTC); a segunda anterior é 2024-01-01
      vi.setSystemTime(new Date("2024-01-07T12:00:00.000Z"));
      const weekStart = currentWeekStart();
      expect(weekStart.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it("em dia de semana, retorna a segunda-feira da semana corrente", () => {
    vi.useFakeTimers();
    try {
      // 2024-01-10 é uma quarta-feira; a segunda da semana é 2024-01-08
      vi.setSystemTime(new Date("2024-01-10T12:00:00.000Z"));
      const weekStart = currentWeekStart();
      expect(weekStart.toISOString()).toBe("2024-01-08T00:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("constantes de liga", () => {
  it("LEAGUE_ORDER tem 10 tiers", () => {
    expect(LEAGUE_ORDER).toHaveLength(10);
    expect(LEAGUE_ORDER[0]).toBe("bronze");
    expect(LEAGUE_ORDER[9]).toBe("diamante");
  });

  it.each(LEAGUE_ORDER as LeagueTier[])("%s tem label, emoji e slots", (tier) => {
    expect(LEAGUE_LABELS[tier]).toBeTruthy();
    expect(LEAGUE_EMOJI[tier]).toBeTruthy();
    expect(typeof PROMOTION_SLOTS[tier]).toBe("number");
    expect(typeof DEMOTION_SLOTS[tier]).toBe("number");
  });

  it("promoção em diamante e rebaixamento em bronze são zero", () => {
    expect(PROMOTION_SLOTS["diamante"]).toBe(0);
    expect(DEMOTION_SLOTS["bronze"]).toBe(0);
  });

  it("MAX_GROUP_SIZE é maior que zero", () => {
    expect(MAX_GROUP_SIZE).toBeGreaterThan(0);
  });
});
