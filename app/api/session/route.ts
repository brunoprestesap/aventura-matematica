import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateXP, currentWeekStart, MAX_GROUP_SIZE } from "@/lib/league";
import { LeagueTier } from "@prisma/client";

interface SessionPayload {
  grade: number;        // 1–9
  correct: number;      // 0–20
  answers: boolean[];   // array de booleanos
  clientId?: string;    // id estável do registro local (dedup do histórico)
}

export async function POST(req: NextRequest) {
  const session = await auth();

  // Usuários não autenticados podem jogar, mas não acumulam XP na liga
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true, xpEarned: 0, authenticated: false });
  }

  const body = (await req.json()) as SessionPayload;

  // Validação básica
  if (
    typeof body.grade !== "number" ||
    body.grade < 1 || body.grade > 9 ||
    typeof body.correct !== "number" ||
    body.correct < 0 || body.correct > 20 ||
    !Array.isArray(body.answers) ||
    body.answers.length !== 20
  ) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  // clientId é opcional; se vier, precisa ser uma string curta
  if (body.clientId !== undefined &&
      (typeof body.clientId !== "string" || body.clientId.length > 64)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const userId = session.user.id;

  // Recalcula o número de acertos no servidor para não confiar no cliente
  const correctCount = body.answers.filter(Boolean).length;

  // Calcula XP no servidor (não confia no cliente)
  const xpEarned = calculateXP(correctCount, body.answers);

  const weekStart = currentWeekStart();

  // Executa tudo em uma transação
  await prisma.$transaction(async (tx) => {
    // 1. Registra a sessão para auditoria
    await tx.weeklyScore.create({
      data: {
        userId,
        grade: body.grade,
        correct: correctCount,
        total: 20,
        xpEarned,
        clientId: body.clientId ?? null,
      },
    });

    // 2. Garante que o usuário tem um grade salvo (sincroniza do cliente)
    await tx.user.update({
      where: { id: userId },
      data: { grade: body.grade },
    });

    // 3. Busca o grupo da liga atual do usuário nesta semana
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currentLeague: true, grade: true },
    });

    let member = await tx.leagueMember.findFirst({
      where: {
        userId,
        group: { weekStart },
      },
    });

    // 4. Se não tem grupo esta semana, tenta entrar em um existente ou cria novo
    if (!member) {
      const existingGroup = await tx.leagueGroup.findFirst({
        where: {
          tier: user.currentLeague as LeagueTier,
          grade: user.grade,
          weekStart,
        },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "asc" },
      });

      let groupId: string;

      if (existingGroup && existingGroup._count.members < MAX_GROUP_SIZE) {
        groupId = existingGroup.id;
      } else {
        // Cria um novo grupo para esta liga/ano/semana
        const newGroup = await tx.leagueGroup.create({
          data: {
            tier: user.currentLeague as LeagueTier,
            grade: user.grade,
            weekStart,
          },
        });
        groupId = newGroup.id;
      }

      member = await tx.leagueMember.create({
        data: { userId, groupId, xpWeekly: 0 },
      });
    }

    // 5. Adiciona o XP ao membro do grupo
    await tx.leagueMember.update({
      where: { id: member.id },
      data: { xpWeekly: { increment: xpEarned } },
    });
  });

  return NextResponse.json({ ok: true, xpEarned, authenticated: true });
}
