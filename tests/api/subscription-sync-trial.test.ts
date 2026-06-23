import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/subscription/sync-trial/route"
import { createNextRequest, resetDatabase, createUser } from "./helpers"
import { prisma } from "@/lib/prisma"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: () => mockAuth() }))

describe("POST /api/subscription/sync-trial", () => {
  beforeEach(async () => {
    await resetDatabase()
    mockAuth.mockResolvedValue(null)
  })

  it("retorna 401 quando não autenticado", async () => {
    const req = createNextRequest({ method: "POST", body: { trialStart: new Date().toISOString() } })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("retorna 400 para trialStart inválido", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const req = createNextRequest({ method: "POST", body: { trialStart: "não-é-data" } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("persiste trialStart e define subscriptionStatus=trialing", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const trialStart = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const req = createNextRequest({ method: "POST", body: { trialStart } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.trialStart).not.toBeNull()
    expect(updated!.subscriptionStatus).toBe("trialing")
  })

  it("limita trialStart a now quando valor está no futuro", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const req = createNextRequest({ method: "POST", body: { trialStart: futureDate } })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.trialStart!.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it("é idempotente: não altera trialStart já definido", async () => {
    const originalDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({
      where: { id: user.id },
      data: { trialStart: originalDate, subscriptionStatus: "trialing" },
    })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const newDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const req = createNextRequest({ method: "POST", body: { trialStart: newDate } })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.trialStart!.getTime()).toBeCloseTo(originalDate.getTime(), -3)
  })
})
