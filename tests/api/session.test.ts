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

  it("cria um novo grupo quando o grupo existente está cheio", async () => {
    const { currentWeekStart, MAX_GROUP_SIZE } = await import("@/lib/league");
    const weekStart = currentWeekStart();

    // Cria um grupo bronze/ano 4 já no limite de MAX_GROUP_SIZE membros
    const fullGroup = await prisma.leagueGroup.create({
      data: { tier: "bronze", grade: 4, weekStart },
    });
    const fillers = await Promise.all(
      Array.from({ length: MAX_GROUP_SIZE }, (_, i) =>
        createUser({ email: `filler${i}@example.com` })
      )
    );
    await prisma.leagueMember.createMany({
      data: fillers.map((u) => ({ userId: u.id, groupId: fullGroup.id, xpWeekly: 0 })),
    });

    const user = await createUser({ email: "novo@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const req = createNextRequest({
      method: "POST",
      body: { grade: 4, correct: 20, answers: new Array(20).fill(true) },
    });
    await POST(req);

    // O grupo estava cheio → deve ter sido criado um segundo grupo
    const groups = await prisma.leagueGroup.findMany({
      where: { tier: "bronze", grade: 4, weekStart },
    });
    expect(groups).toHaveLength(2);

    const member = await prisma.leagueMember.findFirstOrThrow({ where: { userId: user.id } });
    expect(member.groupId).not.toBe(fullGroup.id);
  });

  it("entra em grupo existente com vaga em vez de criar outro", async () => {
    const { currentWeekStart } = await import("@/lib/league");
    const weekStart = currentWeekStart();

    // Grupo bronze/ano 4 com vaga (apenas 1 membro)
    const group = await prisma.leagueGroup.create({
      data: { tier: "bronze", grade: 4, weekStart },
    });
    const other = await createUser({ email: "outro@example.com" });
    await prisma.leagueMember.create({
      data: { userId: other.id, groupId: group.id, xpWeekly: 0 },
    });

    const user = await createUser({ email: "entrante@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const req = createNextRequest({
      method: "POST",
      body: { grade: 4, correct: 20, answers: new Array(20).fill(true) },
    });
    await POST(req);

    // Não cria novo grupo: entra no existente (ramo `_count.members < MAX_GROUP_SIZE`)
    const groups = await prisma.leagueGroup.findMany({
      where: { tier: "bronze", grade: 4, weekStart },
    });
    expect(groups).toHaveLength(1);

    const member = await prisma.leagueMember.findFirstOrThrow({ where: { userId: user.id } });
    expect(member.groupId).toBe(group.id);
  });

  it("persiste o clientId no WeeklyScore quando enviado", async () => {
    const user = await createUser({ email: "client@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const req = createNextRequest({
      method: "POST",
      body: {
        grade: 4,
        correct: 10,
        answers: new Array(20).fill(false).map((_, i) => i < 10),
        clientId: "abc123",
      },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.authenticated).toBe(true);

    const score = await prisma.weeklyScore.findFirstOrThrow({ where: { userId: user.id } });
    expect(score.clientId).toBe("abc123");
  });

  it("aceita payload sem clientId (compatibilidade)", async () => {
    const user = await createUser({ email: "noclient@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const req = createNextRequest({
      method: "POST",
      body: { grade: 4, correct: 10, answers: new Array(20).fill(false).map((_, i) => i < 10) },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const score = await prisma.weeklyScore.findFirstOrThrow({ where: { userId: user.id } });
    expect(score.clientId).toBeNull();
  });
});
