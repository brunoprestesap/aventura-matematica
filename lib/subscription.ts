import { useSession } from "next-auth/react"
import { SubscriptionStatus } from "@prisma/client"

export const TRIAL_DAYS = 15
export const TRIAL_START_KEY = "continha-magica-trial-start"

export function getOrSetTrialStart(): Date {
  if (typeof window === "undefined") return new Date()
  try {
    const stored = localStorage.getItem(TRIAL_START_KEY)
    if (stored) return new Date(stored)
    const now = new Date()
    localStorage.setItem(TRIAL_START_KEY, now.toISOString())
    return now
  } catch {
    return new Date()
  }
}

function trialDaysLeft(trialStart: Date): number {
  const elapsed = (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed))
}

export function useSubscriptionStatus(): {
  status: "loading" | "trial" | "active" | "expired"
  daysLeft: number
} {
  const { data: session, status: sessionStatus } = useSession()

  if (sessionStatus === "loading") return { status: "loading", daysLeft: 0 }

  if (session?.user) {
    const sub = session.user.subscriptionStatus

    if (sub === SubscriptionStatus.active) return { status: "active", daysLeft: 0 }

    if (sub === SubscriptionStatus.canceled) {
      const periodEnd = session.user.subscriptionPeriodEnd
      if (periodEnd && new Date(periodEnd) > new Date()) return { status: "active", daysLeft: 0 }
      return { status: "expired", daysLeft: 0 }
    }

    if (sub === SubscriptionStatus.trialing) {
      const trialStart = session.user.trialStart ? new Date(session.user.trialStart) : new Date()
      const left = trialDaysLeft(trialStart)
      return left > 0 ? { status: "trial", daysLeft: left } : { status: "expired", daysLeft: 0 }
    }

    // free (sync-trial não chamado ainda) → fallback localStorage
    if (sub === SubscriptionStatus.free) {
      const trialStart = getOrSetTrialStart()
      const left = trialDaysLeft(trialStart)
      if (left > 0) return { status: "trial", daysLeft: left }
    }

    return { status: "expired", daysLeft: 0 }
  }

  // Anônimo: usa localStorage
  const trialStart = getOrSetTrialStart()
  const left = trialDaysLeft(trialStart)
  return left > 0 ? { status: "trial", daysLeft: left } : { status: "expired", daysLeft: 0 }
}
