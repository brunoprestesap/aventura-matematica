"use client"

import dynamic from "next/dynamic"
import { useMemo, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { MotionProvider } from "@/components/MotionProvider"
import { Paywall } from "@/components/Paywall"
import { useSubscriptionStatus, TRIAL_START_KEY } from "@/lib/subscription"
import { generateQuestions } from "@/lib/questions"
import type { Grade } from "@/lib/questions"

const QuizPage = dynamic(
  () => import("@/components/QuizPage").then((mod) => mod.QuizPage),
  { ssr: false }
)

const GRADE_KEY = "continha-magica-grade"

function readStoredGrade(): Grade {
  try {
    const stored = localStorage.getItem(GRADE_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (parsed >= 1 && parsed <= 9) return parsed as Grade
    }
  } catch {
    // ignora
  }
  return 4
}

export function QuizPageLoader() {
  const { data: session, update } = useSession()
  const { status, daysLeft } = useSubscriptionStatus()
  const syncedRef = useRef(false)

  useEffect(() => {
    if (session?.user?.id && !syncedRef.current) {
      syncedRef.current = true

      // 1. Persiste trial anônimo no servidor
      try {
        const trialStart = localStorage.getItem(TRIAL_START_KEY)
        if (trialStart) {
          fetch("/api/subscription/sync-trial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trialStart }),
          }).catch(() => {
            // falha silenciosa — sincroniza na próxima sessão
          })
        }
      } catch {
        // ignora erro de localStorage
      }

      // 2. Mescla cliente RC anônimo → autenticado
      import("@revenuecat/purchases-js")
        .then(({ Purchases }) => {
          try {
            const purchases = Purchases.getSharedInstance()
            return purchases.changeUser(session.user.id)
          } catch {
            // SDK não inicializado ainda (usuário não chegou ao Paywall) — ignora
          }
        })
        .catch(() => {
          // RC indisponível — ignora
        })
        .finally(() => {
          update()
        })
    }
  }, [session?.user?.id, update])

  const grade = useMemo(() => readStoredGrade(), [])
  const questions = useMemo(() => generateQuestions(20, grade), [grade])

  if (status === "loading") return null

  if (status === "expired") {
    return (
      <MotionProvider>
        <Paywall questions={questions} />
      </MotionProvider>
    )
  }

  return (
    <MotionProvider>
      {status === "trial" && daysLeft <= 7 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          ✨{" "}
          {daysLeft === 1
            ? "Último dia grátis"
            : `${daysLeft} dias grátis restantes`}{" "}
          — aproveite sua aventura!
        </div>
      )}
      <QuizPage />
    </MotionProvider>
  )
}
