import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { GET } from "@/app/api/liga/semana/route";
import { prisma } from "@/lib/prisma";
import { currentWeekStart } from "@/lib/league";
import { resetDatabase, createUser, createGroupAndMember } from "./helpers";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";

const mockedAuth = vi.mocked(auth);

describe("GET /api/liga/semana", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retorna authenticated false para usuário não autenticado", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(json).toEqual({ authenticated: false });
  });

  it("retorna liga atual quando usuário ainda não jogou", async () => {
    const user = await createUser({ email: "carla@example.com", currentLeague: "prata" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const res = await GET();
    const json = await res.json();

    expect(json.authenticated).toBe(true);
    expect(json.hasGroup).toBe(false);
    expect(json.currentLeague).toBe("prata");
    expect(json.leagueLabel).toBe("Prata");
  });

  it("retorna placar ordenado com zonas corretas", async () => {
    const user1 = await createUser({ email: "u1@example.com", name: "Ana" });
    const user2 = await createUser({ email: "u2@example.com", name: "Bruno" });
    const user3 = await createUser({ email: "u3@example.com", name: "Carla" });

    const weekStart = currentWeekStart();
    const { group } = await createGroupAndMember({
      userId: user1.id,
      tier: "bronze",
      grade: 4,
      weekStart,
      xpWeekly: 300,
    });

    await prisma.leagueMember.createMany({
      data: [
        { userId: user2.id, groupId: group.id, xpWeekly: 200 },
        { userId: user3.id, groupId: group.id, xpWeekly: 100 },
      ],
    });

    mockedAuth.mockResolvedValue({ user: { id: user1.id } } as never);

    const res = await GET();
    const json = await res.json();

    expect(json.authenticated).toBe(true);
    expect(json.hasGroup).toBe(true);
    expect(json.placar).toHaveLength(3);
    expect(json.placar[0]).toMatchObject({ rank: 1, name: "Ana", xpWeekly: 300, isCurrentUser: true, zone: "promotion" });
    expect(json.placar[1]).toMatchObject({ rank: 2, name: "Bruno", xpWeekly: 200, isCurrentUser: false, zone: "promotion" });
    expect(json.placar[2]).toMatchObject({ rank: 3, name: "Carla", xpWeekly: 100, isCurrentUser: false, zone: "promotion" });
  });
});
