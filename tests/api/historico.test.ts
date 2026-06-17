import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { GET } from "@/app/api/historico/route";
import { prisma } from "@/lib/prisma";
import { resetDatabase, createUser } from "./helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
const mockedAuth = vi.mocked(auth);

describe("GET /api/historico", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retorna 401 para usuário não autenticado", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retorna os registros do usuário mapeados e ordenados por data desc", async () => {
    const user = await createUser({ email: "hist@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    await prisma.weeklyScore.create({
      data: { userId: user.id, grade: 4, correct: 10, total: 20, xpEarned: 100,
              clientId: "antigo", sessionDate: new Date("2024-01-01T10:00:00.000Z") },
    });
    await prisma.weeklyScore.create({
      data: { userId: user.id, grade: 5, correct: 18, total: 20, xpEarned: 200,
              clientId: "novo", sessionDate: new Date("2024-02-01T10:00:00.000Z") },
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.activities).toHaveLength(2);
    expect(json.activities[0].id).toBe("novo");
    expect(json.activities[0].grade).toBe(5);
    expect(json.activities[0].score).toBe(18);
    expect(json.activities[0].total).toBe(20);
    expect(typeof json.activities[0].completedAt).toBe("string");
  });

  it("usa o id do registro quando clientId é nulo", async () => {
    const user = await createUser({ email: "semclient@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const created = await prisma.weeklyScore.create({
      data: { userId: user.id, grade: 4, correct: 10, total: 20, xpEarned: 100, clientId: null },
    });

    const res = await GET();
    const json = await res.json();
    expect(json.activities[0].id).toBe(created.id);
  });

  it("não retorna registros de outros usuários", async () => {
    const user = await createUser({ email: "dono@example.com" });
    const outro = await createUser({ email: "alheio@example.com" });
    await prisma.weeklyScore.create({
      data: { userId: outro.id, grade: 4, correct: 10, total: 20, xpEarned: 100 },
    });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const res = await GET();
    const json = await res.json();
    expect(json.activities).toHaveLength(0);
  });
});
