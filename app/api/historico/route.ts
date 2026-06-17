import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const scores = await prisma.weeklyScore.findMany({
    where: { userId: session.user.id },
    orderBy: { sessionDate: "desc" },
    take: 50,
  });

  const activities = scores.map((s) => ({
    id: s.clientId ?? s.id,
    grade: s.grade,
    score: s.correct,
    total: s.total,
    completedAt: s.sessionDate.toISOString(),
  }));

  return NextResponse.json({ activities });
}
