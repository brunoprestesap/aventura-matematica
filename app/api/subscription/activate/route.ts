import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getRCSubscriber, hasActiveEntitlement } from "@/lib/revenuecat"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const rcData = await getRCSubscriber(session.user.id)

  if (!hasActiveEntitlement(rcData)) {
    return NextResponse.json({ error: "Entitlement não encontrado no RevenueCat" }, { status: 402 })
  }

  // Obtém subscriptionPeriodEnd da primeira subscription ativa
  const subscriptions = rcData.subscriber.subscriptions
  const firstExpiry = Object.values(subscriptions)
    .map(s => s.expires_date)
    .filter(Boolean)
    .sort()
    .pop()

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionStatus: "active",
      subscriptionPeriodEnd: firstExpiry ? new Date(firstExpiry) : null,
    },
  })

  return NextResponse.json({ ok: true })
}
