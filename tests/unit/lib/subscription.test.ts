import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"

const mockUseSession = vi.fn()
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}))

import {
  TRIAL_DAYS,
  TRIAL_START_KEY,
  getOrSetTrialStart,
  useSubscriptionStatus,
} from "@/lib/subscription"

function sessionUnauthenticated() {
  mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" })
}

function sessionLoading() {
  mockUseSession.mockReturnValue({ data: null, status: "loading" })
}

function sessionWith(overrides: object) {
  mockUseSession.mockReturnValue({
    data: { user: { id: "u1", ...overrides } },
    status: "authenticated",
    update: vi.fn(),
  })
}

describe("TRIAL_DAYS", () => {
  it("é 15", () => {
    expect(TRIAL_DAYS).toBe(15)
  })
})

describe("getOrSetTrialStart", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it("cria trial-start na primeira chamada e persiste", () => {
    const before = Date.now()
    const result = getOrSetTrialStart()
    const after = Date.now()
    expect(result.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.getTime()).toBeLessThanOrEqual(after)
    expect(localStorage.getItem(TRIAL_START_KEY)).toBe(result.toISOString())
  })

  it("retorna a mesma data em chamadas subsequentes", () => {
    const first = getOrSetTrialStart()
    const second = getOrSetTrialStart()
    expect(first.toISOString()).toBe(second.toISOString())
  })
})

describe("useSubscriptionStatus — carregando", () => {
  it("retorna loading enquanto sessão carrega", () => {
    sessionLoading()
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("loading")
    expect(result.current.daysLeft).toBe(0)
  })
})

describe("useSubscriptionStatus — anônimo", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it("retorna trial com daysLeft=15 na primeira visita", () => {
    sessionUnauthenticated()
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("trial")
    expect(result.current.daysLeft).toBe(15)
  })

  it("retorna expired após 16 dias", () => {
    sessionUnauthenticated()
    const pastDate = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000)
    localStorage.setItem(TRIAL_START_KEY, pastDate.toISOString())
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })

  it("daysLeft=1 quando falta exatamente 1 dia", () => {
    sessionUnauthenticated()
    const almostExpired = new Date(Date.now() - (TRIAL_DAYS - 1) * 24 * 60 * 60 * 1000)
    localStorage.setItem(TRIAL_START_KEY, almostExpired.toISOString())
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("trial")
    expect(result.current.daysLeft).toBe(1)
  })
})

describe("useSubscriptionStatus — autenticado", () => {
  it("retorna active para subscriptionStatus=active", () => {
    sessionWith({ subscriptionStatus: "active", subscriptionPeriodEnd: null, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("active")
  })

  it("retorna active para canceled com periodEnd no futuro", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    sessionWith({ subscriptionStatus: "canceled", subscriptionPeriodEnd: future, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("active")
  })

  it("retorna expired para canceled com periodEnd no passado", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    sessionWith({ subscriptionStatus: "canceled", subscriptionPeriodEnd: past, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })

  it("retorna trial para trialing com trialStart recente", () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    sessionWith({ subscriptionStatus: "trialing", subscriptionPeriodEnd: null, trialStart: recentDate })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("trial")
    expect(result.current.daysLeft).toBe(12)
  })

  it("retorna expired para trialing com trialStart antigo", () => {
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    sessionWith({ subscriptionStatus: "trialing", subscriptionPeriodEnd: null, trialStart: oldDate })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })

  it("retorna expired para past_due", () => {
    sessionWith({ subscriptionStatus: "past_due", subscriptionPeriodEnd: null, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })

  it("retorna expired para free quando localStorage também expirou", () => {
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    localStorage.setItem(TRIAL_START_KEY, oldDate.toISOString())
    sessionWith({ subscriptionStatus: "free", subscriptionPeriodEnd: null, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })
})
