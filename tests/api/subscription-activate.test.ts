import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/subscription/activate/route"
import { createNextRequest, resetDatabase, createUser } from "./helpers"
import { prisma } from "@/lib/prisma"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: () => mockAuth() }))

const mockGetRCSubscriber = vi.fn()
const mockHasActiveEntitlement = vi.fn()
vi.mock("@/lib/revenuecat", () => ({
  getRCSubscriber: (...a: unknown[]) => mockGetRCSubscriber(...a),
  hasActiveEntitlement: (...a: unknown[]) => mockHasActiveEntitlement(...a),
}))

const FUTURE_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

function mockRCActive() {
  const data = {
    subscriber: {
      entitlements: { premium: { expires_date: FUTURE_DATE, product_identifier: "monthly" } },
      subscriptions: { monthly: { expires_date: FUTURE_DATE } },
    },
  }
  mockGetRCSubscriber.mockResolvedValue(data)
  mockHasActiveEntitlement.mockReturnValue(true)
}

function mockRCInactive() {
  const data = { subscriber: { entitlements: {}, subscriptions: {} } }
  mockGetRCSubscriber.mockResolvedValue(data)
  mockHasActiveEntitlement.mockReturnValue(false)
}

describe("POST /api/subscription/activate", () => {
  beforeEach(async () => {
    await resetDatabase()
    mockAuth.mockResolvedValue(null)
    mockGetRCSubscriber.mockReset()
    mockHasActiveEntitlement.mockReset()
  })

  it("retorna 401 quando não autenticado", async () => {
    const req = createNextRequest({ method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("retorna 402 quando entitlement não está ativo no RC", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    mockRCInactive()
    const req = createNextRequest({ method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(402)
  })

  it("ativa subscriptionStatus=active quando entitlement RC está ativo", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    mockRCActive()
    const req = createNextRequest({ method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("active")
    expect(updated!.subscriptionPeriodEnd).not.toBeNull()
  })

  it("chama RC API com o userId como appUserID", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    mockRCActive()
    const req = createNextRequest({ method: "POST" })
    await POST(req)
    expect(mockGetRCSubscriber).toHaveBeenCalledWith(user.id)
  })
})
