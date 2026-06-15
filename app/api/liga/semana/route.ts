import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  currentWeekStart,
  LEAGUE_LABELS,
  LEAGUE_EMOJI,
  PROMOTION_SLOTS,
  DEMOTION_SLOTS,
} from "@/lib/league";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false });
  }

  const userId = session.user.id;
  const weekStart = currentWeekStart();

  // Busca o membro do grupo desta semana
  const member = await prisma.leagueMember.findFirst({
    where: { userId, group: { weekStart } },
    include: {
      group: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { xpWeekly: "desc" },
          },
        },
      },
    },
  });

  if (!member) {
    // Usuário ainda não jogou esta semana
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currentLeague: true },
    });
    return NextResponse.json({
      authenticated: true,
      hasGroup: false,
      currentLeague: user.currentLeague,
      leagueLabel: LEAGUE_LABELS[user.currentLeague],
      leagueEmoji: LEAGUE_EMOJI[user.currentLeague],
    });
  }

  const { group } = member;
  const totalMembers = group.members.length;
  const promotionSlots = PROMOTION_SLOTS[group.tier];
  const demotionSlots = DEMOTION_SLOTS[group.tier];

  // Monta o placar com zonas de promoção/rebaixamento
  const placar = group.members.map((m, index) => {
    const rank = index + 1;
    const zone =
      rank <= promotionSlots
        ? "promotion"
        : rank > totalMembers - demotionSlots && demotionSlots > 0
          ? "demotion"
          : "safe";

    return {
      rank,
      userId: m.user.id,
      name: m.user.name ?? "Anônimo",
      image: m.user.image,
      xpWeekly: m.xpWeekly,
      isCurrentUser: m.userId === userId,
      zone, // "promotion" | "safe" | "demotion"
    };
  });

  return NextResponse.json({
    authenticated: true,
    hasGroup: true,
    currentLeague: group.tier,
    leagueLabel: LEAGUE_LABELS[group.tier],
    leagueEmoji: LEAGUE_EMOJI[group.tier],
    weekStart: weekStart.toISOString(),
    placar,
    promotionSlots,
    demotionSlots,
  });
}
