"use client"

import { useState, useCallback } from "react"
import { signIn, useSession } from "next-auth/react"
import { m } from "motion/react"
import { Pixel } from "@/components/Pixel"
import { Button } from "@/components/ui/button"
import { QuestionCardItem } from "@/components/QuestionCardItem"
import { cn } from "@/lib/utils"
import type { Question } from "@/lib/questions"

type Plan = "monthly" | "yearly"

// Identifiers configurados no dashboard RevenueCat
const RC_PACKAGE_IDS: Record<Plan, string> = {
  monthly: "$rc_monthly",
  yearly: "$rc_annual",
}

interface PaywallProps {
  questions: Question[]
}

export function Paywall({ questions }: PaywallProps) {
  const { data: session, update } = useSession()
  const [plan, setPlan] = useState<Plan>("yearly")
  const [loading, setLoading] = useState(false)

  const handleSubscribe = useCallback(async () => {
    if (!session?.user?.id) {
      // Usuário anônimo precisa logar antes de assinar
      signIn("google", { callbackUrl: "/" })
      return
    }

    setLoading(true)
    try {
      const { Purchases } = await import("@revenuecat/purchases-js")
      const purchases = Purchases.configure(
        process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY!,
        session.user.id
      )

      const offerings = await purchases.getOfferings()
      const pkg = offerings.current?.availablePackages.find(
        (p) => p.identifier === RC_PACKAGE_IDS[plan]
      )

      if (!pkg) throw new Error(`Package ${RC_PACKAGE_IDS[plan]} não encontrado no RC`)

      await purchases.purchasePackage(pkg)

      // Ativação imediata no servidor
      await fetch("/api/subscription/activate", { method: "POST" })
      await update()
      setLoading(false)
    } catch (err) {
      // purchasePackage lança erro se o usuário cancelou — sem mensagem de erro nesses casos
      console.error("Erro ao assinar:", err)
      setLoading(false)
    }
  }, [session, plan, update])

  return (
    <div className="min-h-screen bg-[#F8FFFE]">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 pt-10 pb-6 px-4 text-center">
        <Pixel pose="thinking" size={72} animated />
        <h1 className="text-2xl font-bold text-[#0C1A19]">
          Seu período gratuito terminou ✨
        </h1>
        <p className="text-sm text-slate-500 max-w-xs">
          Assine para continuar sua aventura matemática sem interrupções.
        </p>
      </div>

      {/* Preview bloqueado */}
      <div className="pointer-events-none select-none blur-sm opacity-50 px-4 pb-60">
        <div className="max-w-2xl mx-auto space-y-3">
          {questions.map((q, i) => (
            <QuestionCardItem
              key={q.id}
              question={q}
              index={i}
              value=""
              status="idle"
              disabled
              onChange={() => {}}
              setInputRef={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Card flutuante */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-6 pb-4 px-4">
        <m.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-sm mx-auto bg-white rounded-2xl shadow-xl border border-teal-100 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-[#0C1A19] text-center">
            Continue sua aventura matemática
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPlan("monthly")}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-colors",
                plan === "monthly" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-200"
              )}
            >
              <div className="text-xs text-slate-500 font-medium">Mensal</div>
              <div className="text-base font-bold text-[#0C1A19]">R$ 4,90</div>
              <div className="text-xs text-slate-400">por mês</div>
            </button>

            <button
              onClick={() => setPlan("yearly")}
              className={cn(
                "relative rounded-xl border-2 p-3 text-left transition-colors",
                plan === "yearly" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-200"
              )}
            >
              <span className="absolute -top-2 right-2 bg-[#EAB308] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                economize 32%
              </span>
              <div className="text-xs text-slate-500 font-medium">Anual</div>
              <div className="text-base font-bold text-[#0C1A19]">R$ 39,90</div>
              <div className="text-xs text-slate-400">por ano</div>
            </button>
          </div>

          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-[#0D9488] hover:bg-[#0f766e] text-white font-semibold rounded-xl"
          >
            {loading ? "Abrindo checkout..." : "Assinar agora"}
          </Button>

          {!session && (
            <p className="text-center text-xs text-slate-400">
              Já é assinante?{" "}
              <button onClick={() => signIn("google")} className="text-teal-600 underline underline-offset-2">
                Entrar
              </button>
            </p>
          )}
        </m.div>
      </div>
    </div>
  )
}
