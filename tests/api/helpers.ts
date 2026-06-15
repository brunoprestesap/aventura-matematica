import { createMocks } from "node-mocks-http";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export function createNextRequest(
  options: {
    method?: string;
    url?: string;
    body?: object;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { req } = createMocks({
    method: options.method ?? "GET",
    url: options.url ?? "http://localhost:3000/api/test",
    headers: options.headers ?? {},
  });

  if (options.body) {
    req.json = async () => options.body!;
  }

  return req as unknown as NextRequest;
}

export async function resetDatabase() {
  // Desabilita FKs para permitir limpeza em qualquer ordem
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
  await prisma.weeklyScore.deleteMany();
  await prisma.leagueMember.deleteMany();
  await prisma.leagueGroup.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
}

export async function createUser(data: {
  id?: string;
  email: string;
  name?: string;
  currentLeague?: "bronze" | "prata" | "ouro" | "safira" | "rubi" | "esmeralda" | "ametista" | "perola" | "obsidiana" | "diamante";
  grade?: number;
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name ?? "Anônimo",
      currentLeague: data.currentLeague ?? "bronze",
      grade: data.grade ?? 4,
    },
  });
}

export async function createGroupAndMember(data: {
  userId: string;
  tier?: "bronze" | "prata" | "ouro" | "safira" | "rubi" | "esmeralda" | "ametista" | "perola" | "obsidiana" | "diamante";
  grade?: number;
  weekStart: Date;
  xpWeekly?: number;
}) {
  const group = await prisma.leagueGroup.create({
    data: {
      tier: data.tier ?? "bronze",
      grade: data.grade ?? 4,
      weekStart: data.weekStart,
    },
  });

  const member = await prisma.leagueMember.create({
    data: {
      userId: data.userId,
      groupId: group.id,
      xpWeekly: data.xpWeekly ?? 0,
    },
  });

  return { group, member };
}
