import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { POST } from "@/app/api/session/route";
import { prisma } from "@/lib/prisma";
import { createNextRequest, resetDatabase, createUser } from "./helpers";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";

const mockedAuth = vi.mocked(auth);

describe("POST /api/session", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retorna xp 0 para usuário não autenticado", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = createNextRequest({
      method: "POST",
      body: { grade: 4, correct: 10, answers: new Array(20).fill(true) },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, xpEarned: 0, authenticated: false });
  });

  it("retorna 400 para payload inválido", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } } as never);

    const req = createNextRequest({
      method: "POST",
      body: { grade: 10, correct: 10, answers: new Array(20).fill(true) },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Payload inválido" });
  });

  it("registra sessão, atualiza grade e cria grupo/membro para usuário autenticado", async () => {
    const user = await createUser({ email: "ana@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const answers = new Array(20).fill(false).map((_, i) => i < 15);
    const req = createNextRequest({
      method: "POST",
      body: { grade: 5, correct: 15, answers },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.authenticated).toBe(true);
    expect(json.xpEarned).toBeGreaterThan(0);

    const weeklyScores = await prisma.weeklyScore.findMany({ where: { userId: user.id } });
    expect(weeklyScores).toHaveLength(1);
    expect(weeklyScores[0].correct).toBe(15);
    expect(weeklyScores[0].grade).toBe(5);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.grade).toBe(5);

    const members = await prisma.leagueMember.findMany({ where: { userId: user.id } });
    expect(members).toHaveLength(1);
    expect(members[0].xpWeekly).toBe(json.xpEarned);
  });

  it("incrementa XP em grupo existente", async () => {
    const user = await createUser({ email: "bruno@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    // Cria um grupo manualmente para a semana atual
    const { currentWeekStart } = await import("@/lib/league");
    const group = await prisma.leagueGroup.create({
      data: { tier: "bronze", grade: 4, weekStart: currentWeekStart() },
    });

    await prisma.leagueMember.create({
      data: { userId: user.id, groupId: group.id, xpWeekly: 50 },
    });

    const answers = new Array(20).fill(false).map((_, i) => i < 10);
    const req = createNextRequest({
      method: "POST",
      body: { grade: 4, correct: 10, answers },
    });

    const res = await POST(req);
    const json = await res.json();

    const member = await prisma.leagueMember.findFirstOrThrow({ where: { userId: user.id } });
    expect(member.xpWeekly).toBe(50 + json.xpEarned);
  });
});
