import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { GET } from "@/app/api/cron/liga/route";
import { prisma } from "@/lib/prisma";
import { currentWeekStart, leagueUp } from "@/lib/league";
import { resetDatabase, createUser, createNextRequest } from "./helpers";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";

const mockedAuth = vi.mocked(auth);

describe("GET /api/cron/liga", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retorna 401 sem autorização", async () => {
    const req = createNextRequest({ url: "http://localhost:3000/api/cron/liga" });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Não autorizado" });
  });

  it("processa promoção e rebaixamento corretamente", async () => {
    const users = await Promise.all([
      createUser({ email: "u1@example.com", currentLeague: "bronze" }),
      createUser({ email: "u2@example.com", currentLeague: "bronze" }),
      createUser({ email: "u3@example.com", currentLeague: "bronze" }),
    ]);

    const lastWeekStart = new Date(currentWeekStart());
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

    const group = await prisma.leagueGroup.create({
      data: {
        tier: "bronze",
        grade: 4,
        weekStart: lastWeekStart,
      },
    });

    await prisma.leagueMember.createMany({
      data: [
        { userId: users[0].id, groupId: group.id, xpWeekly: 300 },
        { userId: users[1].id, groupId: group.id, xpWeekly: 200 },
        { userId: users[2].id, groupId: group.id, xpWeekly: 100 },
      ],
    });

    const req = createNextRequest({
      url: "http://localhost:3000/api/cron/liga",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.processedGroups).toBe(1);

    const updatedUsers = await prisma.user.findMany({
      where: { id: { in: users.map((u) => u.id) } },
      orderBy: { email: "asc" },
    });

    // Bronze: 20 promoções, 0 rebaixamentos
    expect(updatedUsers[0].currentLeague).toBe(leagueUp("bronze"));
    expect(updatedUsers[1].currentLeague).toBe(leagueUp("bronze"));
    expect(updatedUsers[2].currentLeague).toBe(leagueUp("bronze"));
  });

  it("não promove de diamante e não promove último de bronze além dos slots", async () => {
    const diamondUser = await createUser({ email: "diamond@example.com", currentLeague: "diamante" });

    // Bronze tem 20 slots de promoção; rank 21 não deve subir
    const bronzeUsers = await Promise.all(
      Array.from({ length: 21 }, (_, i) =>
        createUser({ email: `bronze${i}@example.com`, currentLeague: "bronze" })
      )
    );

    const lastWeekStart = new Date(currentWeekStart());
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

    const diamondGroup = await prisma.leagueGroup.create({
      data: { tier: "diamante", grade: 9, weekStart: lastWeekStart },
    });
    const bronzeGroup = await prisma.leagueGroup.create({
      data: { tier: "bronze", grade: 1, weekStart: lastWeekStart },
    });

    await prisma.leagueMember.create({
      data: { userId: diamondUser.id, groupId: diamondGroup.id, xpWeekly: 999 },
    });

    await prisma.leagueMember.createMany({
      data: bronzeUsers.map((u, i) => ({
        userId: u.id,
        groupId: bronzeGroup.id,
        xpWeekly: (21 - i) * 10,
      })),
    });

    const req = createNextRequest({
      url: "http://localhost:3000/api/cron/liga",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    await GET(req);

    const afterDiamond = await prisma.user.findUniqueOrThrow({
      where: { id: diamondUser.id },
    });
    expect(afterDiamond.currentLeague).toBe("diamante");

    const afterBronze = await prisma.user.findMany({
      where: { id: { in: bronzeUsers.map((u) => u.id) } },
    });

    const promotedCount = afterBronze.filter((u) => u.currentLeague === "prata").length;
    expect(promotedCount).toBe(20);

    const lastBronze = afterBronze.find((u) => u.email === "bronze20@example.com");
    expect(lastBronze?.currentLeague).toBe("bronze");
  });
});
