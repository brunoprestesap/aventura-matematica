import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  leagueUp,
  leagueDown,
  PROMOTION_SLOTS,
  DEMOTION_SLOTS,
  currentWeekStart,
} from "@/lib/league";
import { LeagueTier } from "@prisma/client";

// Protege o cron com um segredo compartilhado (configure CRON_SECRET no .env e na Vercel)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // A semana que ACABOU é a semana anterior à atual
  const thisWeekStart = currentWeekStart();
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

  // Busca todos os grupos da semana que acabou que ainda não foram processados
  const groups = await prisma.leagueGroup.findMany({
    where: { weekStart: lastWeekStart },
    include: {
      members: {
        orderBy: { xpWeekly: "desc" },
      },
    },
  });

  let processedGroups = 0;
  let promotedUsers = 0;
  let demotedUsers = 0;

  for (const group of groups) {
    const totalMembers = group.members.length;
    const promotionSlots = PROMOTION_SLOTS[group.tier];
    const demotionSlots = DEMOTION_SLOTS[group.tier];

    for (let i = 0; i < group.members.length; i++) {
      const member = group.members[i];
      const rank = i + 1;

      const promoted = rank <= promotionSlots;
      // Só existe zona de rebaixamento real se houver pelo menos uma posição segura
      const hasSafeZone = totalMembers > promotionSlots + demotionSlots;
      const demoted = demotionSlots > 0 && hasSafeZone && rank > totalMembers - demotionSlots;

      const newLeague: LeagueTier = promoted
        ? leagueUp(group.tier)
        : demoted
          ? leagueDown(group.tier)
          : group.tier;

      // Atualiza o membro com resultado final
      await prisma.leagueMember.update({
        where: { id: member.id },
        data: {
          finalRank: rank,
          promoted,
          demoted,
        },
      });

      // Atualiza a liga do usuário para a próxima semana
      await prisma.user.update({
        where: { id: member.userId },
        data: { currentLeague: newLeague },
      });

      if (promoted) promotedUsers++;
      if (demoted) demotedUsers++;
    }

    processedGroups++;
  }

  return NextResponse.json({
    ok: true,
    processedGroups,
    promotedUsers,
    demotedUsers,
    weekProcessed: lastWeekStart.toISOString(),
  });
}
