import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface RCWebhookEvent {
  type: string
  app_user_id: string
  expiration_at_ms?: number
}

interface RCWebhookPayload {
  event: RCWebhookEvent
}

export async function POST(request: NextRequest) {
  // Valida o token de autenticação do webhook
  const authHeader = request.headers.get("authorization") ?? ""
  const expectedToken = `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`
  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const payload = (await request.json()) as RCWebhookPayload
  const { type, app_user_id, expiration_at_ms } = payload.event

  // Converte o timestamp (ms) para Date, se presente
  const periodEnd = expiration_at_ms ? new Date(expiration_at_ms) : null

  // Busca usuário pelo ID (app_user_id = user.id para usuários autenticados)
  const user = await prisma.user.findUnique({ where: { id: app_user_id } })
  if (!user) {
    // Pode ser um usuário RC anônimo que não chegou a se autenticar — ignora silenciosamente
    return NextResponse.json({ received: true })
  }

  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
      // Assinatura ativa ou renovada
      await prisma.user.update({
        where: { id: app_user_id },
        data: { subscriptionStatus: "active", subscriptionPeriodEnd: periodEnd },
      })
      break

    case "CANCELLATION":
    case "EXPIRATION":
      // Assinatura cancelada ou expirada
      await prisma.user.update({
        where: { id: app_user_id },
        data: { subscriptionStatus: "canceled", subscriptionPeriodEnd: periodEnd },
      })
      break

    case "BILLING_ISSUE":
      // Problema de cobrança
      await prisma.user.update({
        where: { id: app_user_id },
        data: { subscriptionStatus: "past_due" },
      })
      break

    default:
      // Evento desconhecido — ignora silenciosamente
      break
  }

  return NextResponse.json({ received: true })
}
