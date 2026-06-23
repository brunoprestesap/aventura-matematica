import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await request.json() as { trialStart?: string }
  if (!body.trialStart || isNaN(Date.parse(body.trialStart))) {
    return NextResponse.json({ error: "trialStart inválido" }, { status: 400 })
  }

  const clientDate = new Date(body.trialStart)
  const safeDate = clientDate <= new Date() ? clientDate : new Date()

  try {
    await prisma.user.update({
      where: { id: session.user.id, trialStart: null },
      data: { trialStart: safeDate, subscriptionStatus: "trialing" },
    })
  } catch (e: unknown) {
    if ((e as { code?: string }).code !== "P2025") throw e
    // P2025: trialStart já definido — idempotente, ignora
  }

  return NextResponse.json({ ok: true })
}
