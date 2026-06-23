import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/webhooks/revenuecat/route"
import { createNextRequest, resetDatabase, createUser } from "./helpers"
import { prisma } from "@/lib/prisma"

describe("POST /api/webhooks/revenuecat", () => {
  const SECRET = "test-webhook-secret"
  const FUTURE_MS = Date.now() + 30 * 24 * 60 * 60 * 1000

  beforeEach(async () => {
    await resetDatabase()
    vi.stubEnv("REVENUECAT_WEBHOOK_SECRET", SECRET)
  })

  function makeReq(event: object, auth = `Bearer ${SECRET}`) {
    return createNextRequest({
      method: "POST",
      body: { event },
      headers: { authorization: auth },
    })
  }

  it("retorna 401 para Authorization inválido", async () => {
    const req = makeReq({ type: "INITIAL_PURCHASE", app_user_id: "u1" }, "Bearer invalido")
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("ignora eventos desconhecidos e retorna 200", async () => {
    const user = await createUser({ email: "a@test.com" })
    const req = makeReq({ type: "UNKNOWN_EVENT", app_user_id: user.id })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it("INITIAL_PURCHASE — seta subscriptionStatus=active", async () => {
    const user = await createUser({ email: "a@test.com" })
    const req = makeReq({ type: "INITIAL_PURCHASE", app_user_id: user.id, expiration_at_ms: FUTURE_MS })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("active")
    expect(updated!.subscriptionPeriodEnd).not.toBeNull()
  })

  it("RENEWAL — atualiza periodEnd", async () => {
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "active" } })
    const newExpiry = FUTURE_MS + 30 * 24 * 60 * 60 * 1000
    const req = makeReq({ type: "RENEWAL", app_user_id: user.id, expiration_at_ms: newExpiry })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("active")
    expect(updated!.subscriptionPeriodEnd!.getTime()).toBeCloseTo(newExpiry, -3)
  })

  it("CANCELLATION — seta subscriptionStatus=canceled", async () => {
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "active" } })
    const req = makeReq({ type: "CANCELLATION", app_user_id: user.id, expiration_at_ms: FUTURE_MS })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("canceled")
  })

  it("UNCANCELLATION — restaura subscriptionStatus=active", async () => {
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "canceled" } })
    const req = makeReq({ type: "UNCANCELLATION", app_user_id: user.id, expiration_at_ms: FUTURE_MS })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("active")
  })

  it("BILLING_ISSUE — seta subscriptionStatus=past_due", async () => {
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "active" } })
    const req = makeReq({ type: "BILLING_ISSUE", app_user_id: user.id })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("past_due")
  })

  it("EXPIRATION — seta subscriptionStatus=canceled", async () => {
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "active" } })
    const req = makeReq({ type: "EXPIRATION", app_user_id: user.id })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("canceled")
  })
})
