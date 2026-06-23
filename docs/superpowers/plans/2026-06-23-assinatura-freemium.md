# Assinatura Freemium (Stripe) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um modelo freemium de 14 dias ao Continha Mágica — qualquer visitante tem acesso gratuito por 14 dias e, após esse período, vê um paywall com opções de assinatura mensal (R$ 4,90) ou anual (R$ 39,90) via Stripe.

**Architecture:** Enforcement client-side no `QuizPageLoader` via hook `useSubscriptionStatus`. Trial anônimo rastreado em localStorage; ao fazer login, data é sincronizada com o DB via `POST /api/subscription/sync-trial`. Status de assinatura vive no modelo `User` do Prisma e é enriquecido na sessão NextAuth. Stripe Checkout Session para pagamento + webhooks para atualizar o DB.

**Tech Stack:** Stripe Node.js SDK (`stripe`), Prisma (PostgreSQL + SQLite para testes), NextAuth v5 (database sessions), React hooks, Tailwind CSS v4.

## Global Constraints

- Idioma da UI: pt-BR em todos os textos novos.
- Não adicione `"use client"` em arquivos de lib a menos que necessário — siga o padrão de `lib/history.ts` e `lib/user.ts`.
- Animações: use sempre `m.*` de `motion/react` (nunca `motion.*`).
- Não calcule preço no cliente — os Price IDs do Stripe são a fonte de verdade.
- Não exponha `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` em código client-side.
- Todo acesso a localStorage deve ser envolvido em `try/catch`.
- Cobertura mínima: 80% linhas/funções, 70% branches em `lib/` e `app/api/`.
- Commits em português, frequentes, ao fim de cada tarefa.
- Variáveis de ambiente novas devem ser adicionadas ao `env.example`.

---

## Mapa de arquivos

**Criar:**
- `lib/stripe.ts` — singleton do cliente Stripe
- `lib/subscription.ts` — lógica de trial + hook `useSubscriptionStatus`
- `app/api/subscription/sync-trial/route.ts` — persiste `trialStart` no DB
- `app/api/subscription/checkout/route.ts` — cria Stripe Checkout Session
- `app/api/subscription/portal/route.ts` — cria Stripe Customer Portal Session
- `app/api/webhooks/stripe/route.ts` — processa eventos do Stripe
- `app/assinatura/sucesso/page.tsx` — página de confirmação pós-pagamento
- `app/assinatura/cancelado/page.tsx` — redireciona para "/" quando cancelado
- `components/Paywall.tsx` — UI do paywall com preview bloqueado
- `tests/unit/lib/subscription.test.ts` — testes unitários do `lib/subscription.ts`
- `tests/api/subscription-sync-trial.test.ts` — testes do endpoint sync-trial
- `tests/api/subscription-checkout.test.ts` — testes do endpoint checkout
- `tests/api/webhooks-stripe.test.ts` — testes do webhook Stripe
- `tests/api/subscription-portal.test.ts` — testes do endpoint portal

**Modificar:**
- `prisma/schema.prisma` — adiciona enum `SubscriptionStatus` e campos ao `User`
- `prisma/schema.test.prisma` — espelha as mesmas mudanças (SQLite)
- `types/next-auth.d.ts` — estende `Session.user` e `User` com campos de assinatura
- `auth.ts` — enriquece sessão com `subscriptionStatus`, `subscriptionPeriodEnd`, `trialStart`
- `components/QuizPageLoader.tsx` — gate de paywall + sync-trial + badge de trial
- `env.example` — adiciona variáveis do Stripe e `NEXTAUTH_URL`
- `AGENTS.md` — adiciona `TRIAL_START_KEY` à tabela de localStorage e novas rotas à seção de API

---

## Tarefa 1 — Schema Prisma + instalar stripe + env.example

**Arquivos:**
- Modificar: `prisma/schema.prisma`
- Modificar: `prisma/schema.test.prisma`
- Modificar: `env.example`

**Interfaces:**
- Produz: enum `SubscriptionStatus` e campos `trialStart`, `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `subscriptionPeriodEnd` no model `User` — usados por todas as tarefas seguintes.

- [ ] **Passo 1: Instalar o pacote stripe**

```bash
npm install stripe
```

Confirme que foi instalado:
```bash
npm ls stripe
```
Esperado: linha com `stripe@X.Y.Z`.

- [ ] **Passo 2: Adicionar enum e campos ao `prisma/schema.prisma`**

Abra `prisma/schema.prisma`. Após o enum `LeagueTier`, adicione:

```prisma
enum SubscriptionStatus {
  free
  trialing
  active
  canceled
  past_due
}
```

No model `User`, após o campo `grade`, adicione:

```prisma
  trialStart              DateTime?
  stripeCustomerId        String?            @unique
  stripeSubscriptionId    String?            @unique
  subscriptionStatus      SubscriptionStatus @default(free)
  subscriptionPeriodEnd   DateTime?
```

- [ ] **Passo 3: Espelhar mudanças em `prisma/schema.test.prisma`**

Abra `prisma/schema.test.prisma`. Adicione o mesmo enum `SubscriptionStatus` após `LeagueTier`. No model `User`, adicione os mesmos 5 campos na mesma posição.

> Nota: Prisma suporta enums em SQLite (armazenados como TEXT). A sintaxe é idêntica.

- [ ] **Passo 4: Aplicar schema ao banco de desenvolvimento**

```bash
npm run db:push
```

Esperado: `Your database is now in sync with your Prisma schema`.

- [ ] **Passo 5: Aplicar schema ao banco de testes**

```bash
npm run test:db:push
```

Esperado: sem erros.

- [ ] **Passo 6: Atualizar `env.example`**

Ao final do arquivo `env.example`, adicione:

```bash
# URL base da aplicação (usada nas URLs de retorno do Stripe)
NEXTAUTH_URL="http://localhost:3000"

# Stripe — configure em https://dashboard.stripe.com
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_MONTHLY_PRICE_ID="price_..."
STRIPE_YEARLY_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

- [ ] **Passo 7: Commit**

```bash
git add prisma/schema.prisma prisma/schema.test.prisma env.example package.json package-lock.json
git commit -m "feat: adiciona campos de assinatura ao schema e instala stripe"
```

---

## Tarefa 2 — lib/stripe.ts + extensão de tipos NextAuth + callbacks de sessão

**Arquivos:**
- Criar: `lib/stripe.ts`
- Modificar: `types/next-auth.d.ts`
- Modificar: `auth.ts`

**Interfaces:**
- Consome: campos `subscriptionStatus`, `subscriptionPeriodEnd`, `trialStart` do `User` (Tarefa 1)
- Produz: `stripe` (singleton exportado de `lib/stripe.ts`); campos de assinatura em `session.user` — consumidos por `lib/subscription.ts` (Tarefa 3) e pelas API routes (Tarefas 4–7)

- [ ] **Passo 1: Criar `lib/stripe.ts`**

```typescript
import Stripe from "stripe"

// Versão da API: verifique após instalar com:
//   node -e "const S = require('stripe'); console.log(S.LATEST_API_VERSION)"
// e atualize a string abaixo se necessário.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
})
```

> Se o TypeScript reclamar do `apiVersion`, abra `node_modules/stripe/types/index.d.ts`, busque por `LatestApiVersion` e use a string literal listada.

- [ ] **Passo 2: Estender tipos NextAuth em `types/next-auth.d.ts`**

Substitua o conteúdo atual do arquivo por:

```typescript
import "next-auth"
import { SubscriptionStatus } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      subscriptionStatus: SubscriptionStatus
      subscriptionPeriodEnd: Date | null
      trialStart: Date | null
    }
  }

  interface User {
    subscriptionStatus: SubscriptionStatus
    subscriptionPeriodEnd: Date | null
    trialStart: Date | null
  }
}
```

- [ ] **Passo 3: Enriquecer a sessão em `auth.ts`**

O `auth.ts` usa NextAuth v5 com PrismaAdapter (database sessions). No callback `session`, o parâmetro `user` é o registro Prisma, que já inclui os campos novos. Adicione os campos ao objeto `session.user`:

```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { SubscriptionStatus } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      session.user.subscriptionStatus =
        user.subscriptionStatus ?? SubscriptionStatus.free
      session.user.subscriptionPeriodEnd = user.subscriptionPeriodEnd ?? null
      session.user.trialStart = user.trialStart ?? null
      return session
    },
  },
})
```

- [ ] **Passo 4: Verificar que o build não quebra**

```bash
npm run build
```

Esperado: sem erros de type-check.

- [ ] **Passo 5: Commit**

```bash
git add lib/stripe.ts types/next-auth.d.ts auth.ts
git commit -m "feat: singleton Stripe, tipos NextAuth e sessão enriquecida com dados de assinatura"
```

---

## Tarefa 3 — lib/subscription.ts + testes unitários

**Arquivos:**
- Criar: `lib/subscription.ts`
- Criar: `tests/unit/lib/subscription.test.ts`

**Interfaces:**
- Consome: `useSession` de `next-auth/react`; `SubscriptionStatus` de `@prisma/client`
- Produz:
  - `TRIAL_DAYS: number` — 14
  - `TRIAL_START_KEY: string` — `"continha-magica-trial-start"`
  - `getOrSetTrialStart(): Date` — lê/cria data de início do trial no localStorage
  - `useSubscriptionStatus(): { status: "loading" | "trial" | "active" | "expired", daysLeft: number }` — consumido por `QuizPageLoader` (Tarefa 10)

- [ ] **Passo 1: Escrever o teste primeiro**

Crie `tests/unit/lib/subscription.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"

// Mock de next-auth/react ANTES de importar o módulo testado
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
  it("é 14", () => {
    expect(TRIAL_DAYS).toBe(14)
  })
})

describe("getOrSetTrialStart — anônimo", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it("cria trial-start na primeira chamada e persiste em localStorage", () => {
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
  it("retorna loading enquanto a sessão carrega", () => {
    sessionLoading()
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("loading")
    expect(result.current.daysLeft).toBe(0)
  })
})

describe("useSubscriptionStatus — anônimo", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it("retorna trial com daysLeft=14 em primeira visita", () => {
    sessionUnauthenticated()
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("trial")
    expect(result.current.daysLeft).toBe(14)
  })

  it("retorna expired após mais de 14 dias", () => {
    sessionUnauthenticated()
    const pastDate = new Date(Date.now() - (TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000)
    localStorage.setItem(TRIAL_START_KEY, pastDate.toISOString())
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
    expect(result.current.daysLeft).toBe(0)
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
  it("retorna active quando subscriptionStatus=active", () => {
    sessionWith({ subscriptionStatus: "active", subscriptionPeriodEnd: null, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("active")
  })

  it("retorna active quando canceled mas subscriptionPeriodEnd no futuro", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    sessionWith({ subscriptionStatus: "canceled", subscriptionPeriodEnd: futureDate, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("active")
  })

  it("retorna expired quando canceled e subscriptionPeriodEnd no passado", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    sessionWith({ subscriptionStatus: "canceled", subscriptionPeriodEnd: pastDate, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })

  it("retorna trial quando trialing e trialStart recente", () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 dias atrás
    sessionWith({ subscriptionStatus: "trialing", subscriptionPeriodEnd: null, trialStart: recentDate })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("trial")
    expect(result.current.daysLeft).toBe(11) // 14 - 3
  })

  it("retorna expired quando trialing mas trialStart antigo", () => {
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    sessionWith({ subscriptionStatus: "trialing", subscriptionPeriodEnd: null, trialStart: oldDate })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })

  it("retorna expired quando subscriptionStatus=past_due", () => {
    sessionWith({ subscriptionStatus: "past_due", subscriptionPeriodEnd: null, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })

  it("retorna expired quando subscriptionStatus=free (sync-trial não chamado ainda)", () => {
    // free + sem localStorage → trial expirado (edge case: user sem histórico)
    localStorage.clear()
    // cria trialStart antigo para simular expiração
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    localStorage.setItem(TRIAL_START_KEY, oldDate.toISOString())
    sessionWith({ subscriptionStatus: "free", subscriptionPeriodEnd: null, trialStart: null })
    const { result } = renderHook(() => useSubscriptionStatus())
    expect(result.current.status).toBe("expired")
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

```bash
npm run test -- tests/unit/lib/subscription.test.ts
```

Esperado: FAIL — "Cannot find module '@/lib/subscription'".

- [ ] **Passo 3: Implementar `lib/subscription.ts`**

```typescript
import { useSession } from "next-auth/react"
import { SubscriptionStatus } from "@prisma/client"

export const TRIAL_DAYS = 14
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

function daysElapsed(from: Date): number {
  return (Date.now() - from.getTime()) / (1000 * 60 * 60 * 24)
}

function trialDaysLeft(trialStart: Date): number {
  return Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed(trialStart)))
}

export function useSubscriptionStatus(): {
  status: "loading" | "trial" | "active" | "expired"
  daysLeft: number
} {
  const { data: session, status: sessionStatus } = useSession()

  if (sessionStatus === "loading") return { status: "loading", daysLeft: 0 }

  if (session?.user) {
    const sub = session.user.subscriptionStatus

    if (sub === SubscriptionStatus.active) {
      return { status: "active", daysLeft: 0 }
    }

    if (sub === SubscriptionStatus.canceled) {
      const periodEnd = session.user.subscriptionPeriodEnd
      if (periodEnd && new Date(periodEnd) > new Date()) {
        return { status: "active", daysLeft: 0 }
      }
      return { status: "expired", daysLeft: 0 }
    }

    if (sub === SubscriptionStatus.trialing) {
      const trialStart = session.user.trialStart
        ? new Date(session.user.trialStart)
        : new Date()
      const left = trialDaysLeft(trialStart)
      if (left > 0) return { status: "trial", daysLeft: left }
      return { status: "expired", daysLeft: 0 }
    }

    // free (sync-trial não chamado ainda) ou past_due: fallback ao localStorage
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
  if (left > 0) return { status: "trial", daysLeft: left }
  return { status: "expired", daysLeft: 0 }
}
```

- [ ] **Passo 4: Rodar os testes e confirmar que passam**

```bash
npm run test -- tests/unit/lib/subscription.test.ts
```

Esperado: todos os testes passando.

- [ ] **Passo 5: Commit**

```bash
git add lib/subscription.ts tests/unit/lib/subscription.test.ts
git commit -m "feat: lib/subscription — lógica de trial e hook useSubscriptionStatus"
```

---

## Tarefa 4 — POST /api/subscription/sync-trial + testes

**Arquivos:**
- Criar: `app/api/subscription/sync-trial/route.ts`
- Criar: `tests/api/subscription-sync-trial.test.ts`

**Interfaces:**
- Consome: `auth()` de `@/auth`; `prisma` de `@/lib/prisma`
- Body: `{ trialStart: string }` (ISO 8601)
- Resposta: `{ ok: true }` (200) | `{ error: string }` (400/401)
- Efeito: seta `User.trialStart = min(trialStart_cliente, now)` e `subscriptionStatus = trialing` — somente se `trialStart` for null (idempotente)

- [ ] **Passo 1: Escrever os testes primeiro**

Crie `tests/api/subscription-sync-trial.test.ts`:

```typescript
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

  it("não antedatada além de now quando trialStart está no futuro", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const req = createNextRequest({ method: "POST", body: { trialStart: futureDate } })
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.trialStart!.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it("é idempotente: não altera trialStart se já definido", async () => {
    const originalDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({
      where: { id: user.id },
      data: { trialStart: originalDate, subscriptionStatus: "trialing" },
    })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const newDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const req = createNextRequest({ method: "POST", body: { trialStart: newDate } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.trialStart!.getTime()).toBeCloseTo(originalDate.getTime(), -3)
  })
})
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
npm run test -- tests/api/subscription-sync-trial.test.ts
```

Esperado: FAIL — "Cannot find module '@/app/api/subscription/sync-trial/route'".

- [ ] **Passo 3: Implementar a rota**

Crie `app/api/subscription/sync-trial/route.ts`:

```typescript
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
    // P2025: trialStart já definido — idempotente, ignora
    if ((e as { code?: string }).code !== "P2025") throw e
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

```bash
npm run test -- tests/api/subscription-sync-trial.test.ts
```

Esperado: todos os testes passando.

- [ ] **Passo 5: Commit**

```bash
git add app/api/subscription/sync-trial/route.ts tests/api/subscription-sync-trial.test.ts
git commit -m "feat: POST /api/subscription/sync-trial — persiste trial anônimo no DB"
```

---

## Tarefa 5 — POST /api/subscription/checkout + testes

**Arquivos:**
- Criar: `app/api/subscription/checkout/route.ts`
- Criar: `tests/api/subscription-checkout.test.ts`

**Interfaces:**
- Consome: `stripe` de `@/lib/stripe`; `auth()`, `prisma`
- Body: `{ plan: "monthly" | "yearly" }`
- Resposta: `{ url: string }` (URL do Stripe Checkout) | `{ error: string }` (400/401)

- [ ] **Passo 1: Escrever os testes primeiro**

Crie `tests/api/subscription-checkout.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/subscription/checkout/route"
import { createNextRequest, resetDatabase, createUser } from "./helpers"
import { prisma } from "@/lib/prisma"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: () => mockAuth() }))

const mockCustomersCreate = vi.fn()
const mockSessionsCreate = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { create: (...args: unknown[]) => mockCustomersCreate(...args) },
    checkout: { sessions: { create: (...args: unknown[]) => mockSessionsCreate(...args) } },
  },
}))

describe("POST /api/subscription/checkout", () => {
  beforeEach(async () => {
    await resetDatabase()
    mockAuth.mockResolvedValue(null)
    mockCustomersCreate.mockResolvedValue({ id: "cus_test123" })
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" })
  })

  it("retorna 401 quando não autenticado", async () => {
    const req = createNextRequest({ method: "POST", body: { plan: "monthly" } })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("retorna 400 para plano inválido", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const req = createNextRequest({ method: "POST", body: { plan: "semestral" } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("cria Stripe customer quando usuário não tem stripeCustomerId", async () => {
    const user = await createUser({ email: "a@test.com", name: "Ana" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const req = createNextRequest({ method: "POST", body: { plan: "monthly" } })
    await POST(req)
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@test.com", metadata: { userId: user.id } })
    )
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.stripeCustomerId).toBe("cus_test123")
  })

  it("reutiliza stripeCustomerId existente sem criar novo customer", async () => {
    const user = await createUser({ email: "a@test.com" })
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: "cus_existente" } })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const req = createNextRequest({ method: "POST", body: { plan: "yearly" } })
    await POST(req)
    expect(mockCustomersCreate).not.toHaveBeenCalled()
  })

  it("retorna url da Checkout Session", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const req = createNextRequest({ method: "POST", body: { plan: "monthly" } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe("https://checkout.stripe.com/pay/test")
  })
})
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
npm run test -- tests/api/subscription-checkout.test.ts
```

Esperado: FAIL — "Cannot find module '@/app/api/subscription/checkout/route'".

- [ ] **Passo 3: Implementar a rota**

Crie `app/api/subscription/checkout/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

const PRICE_IDS: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
  yearly: process.env.STRIPE_YEARLY_PRICE_ID,
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await request.json() as { plan?: string }
  const priceId = body.plan ? PRICE_IDS[body.plan] : undefined
  if (!priceId) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${baseUrl}/assinatura/sucesso`,
    cancel_url: `${baseUrl}/assinatura/cancelado`,
    locale: "pt-BR",
  })

  return NextResponse.json({ url: checkoutSession.url })
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

```bash
npm run test -- tests/api/subscription-checkout.test.ts
```

Esperado: todos os testes passando.

- [ ] **Passo 5: Commit**

```bash
git add app/api/subscription/checkout/route.ts tests/api/subscription-checkout.test.ts
git commit -m "feat: POST /api/subscription/checkout — cria Stripe Checkout Session"
```

---

## Tarefa 6 — POST /api/webhooks/stripe + testes

**Arquivos:**
- Criar: `app/api/webhooks/stripe/route.ts`
- Criar: `tests/api/webhooks-stripe.test.ts`

**Interfaces:**
- Consome: `stripe.webhooks.constructEvent`; `prisma`
- Header: `stripe-signature`
- Processa eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

- [ ] **Passo 1: Escrever os testes primeiro**

Crie `tests/api/webhooks-stripe.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/webhooks/stripe/route"
import { createNextRequest, resetDatabase, createUser } from "./helpers"
import { prisma } from "@/lib/prisma"

const mockConstructEvent = vi.fn()
const mockSubscriptionsRetrieve = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...a: unknown[]) => mockConstructEvent(...a) },
    subscriptions: { retrieve: (...a: unknown[]) => mockSubscriptionsRetrieve(...a) },
  },
}))

function makeRequest(body: object, sig = "valid-sig") {
  return createNextRequest({
    method: "POST",
    body,
    headers: { "stripe-signature": sig },
  })
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(async () => {
    await resetDatabase()
    mockConstructEvent.mockImplementation((_body, _sig, _secret) => {
      // lança erro quando a assinatura é inválida
      if (_sig !== "valid-sig") throw new Error("Assinatura inválida")
      return _body // devolve o objeto evento passado como body no teste
    })
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_123",
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    })
  })

  it("retorna 400 para assinatura inválida", async () => {
    const req = createNextRequest({
      method: "POST",
      body: {},
      headers: { "stripe-signature": "invalid" },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("ignora eventos desconhecidos e retorna 200", async () => {
    const user = await createUser({ email: "a@test.com", stripeCustomerId: "cus_1" })
    const event = { type: "some.unknown.event", data: { object: {} } }
    const req = makeRequest(event)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it("checkout.session.completed — seta subscriptionStatus=active", async () => {
    const user = await createUser({ email: "a@test.com", stripeCustomerId: "cus_1" })
    const event = {
      type: "checkout.session.completed",
      data: { object: { customer: "cus_1", subscription: "sub_123" } },
    }
    const req = makeRequest(event)
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("active")
    expect(updated!.stripeSubscriptionId).toBe("sub_123")
    expect(updated!.subscriptionPeriodEnd).not.toBeNull()
  })

  it("customer.subscription.updated — atualiza status e periodEnd", async () => {
    const user = await createUser({ email: "a@test.com", stripeSubscriptionId: "sub_abc" })
    const futureEnd = Math.floor(Date.now() / 1000) + 60 * 24 * 3600
    const event = {
      type: "customer.subscription.updated",
      data: { object: { id: "sub_abc", status: "active", current_period_end: futureEnd } },
    }
    const req = makeRequest(event)
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("active")
    expect(updated!.subscriptionPeriodEnd).not.toBeNull()
  })

  it("customer.subscription.deleted — seta status=canceled", async () => {
    const user = await createUser({ email: "a@test.com", stripeSubscriptionId: "sub_abc" })
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "active" } })
    const event = {
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_abc" } },
    }
    const req = makeRequest(event)
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("canceled")
  })

  it("invoice.payment_failed — seta status=past_due", async () => {
    const user = await createUser({ email: "a@test.com", stripeCustomerId: "cus_1" })
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: "active" } })
    const event = {
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1" } },
    }
    const req = makeRequest(event)
    await POST(req)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated!.subscriptionStatus).toBe("past_due")
  })
})
```

- [ ] **Passo 2: Atualizar `tests/api/helpers.ts`**

O helper `createUser` precisa aceitar `stripeCustomerId` e `stripeSubscriptionId`. Abra `tests/api/helpers.ts` e localize a função `createUser`. Adicione os campos opcionais:

```typescript
export async function createUser(data: {
  id?: string
  email: string
  name?: string
  currentLeague?: "bronze" | "prata" | "ouro" | "safira" | "rubi" | "esmeralda" | "ametista" | "perola" | "obsidiana" | "diamante"
  grade?: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}) {
  return prisma.user.create({
    data: {
      id: data.id,
      email: data.email,
      name: data.name ?? "Anônimo",
      currentLeague: data.currentLeague ?? "bronze",
      grade: data.grade ?? 4,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
    },
  })
}
```

- [ ] **Passo 3: Rodar e confirmar que falha**

```bash
npm run test -- tests/api/webhooks-stripe.test.ts
```

Esperado: FAIL — "Cannot find module '@/app/api/webhooks/stripe/route'".

- [ ] **Passo 4: Implementar a rota**

Crie `app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type Stripe from "stripe"

export const dynamic = "force-dynamic"

function stripeStatusToPrisma(
  status: string
): "active" | "trialing" | "canceled" | "past_due" {
  if (status === "active") return "active"
  if (status === "trialing") return "trialing"
  if (status === "canceled" || status === "incomplete_expired" || status === "paused") return "canceled"
  return "past_due"
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const subscriptionId = session.subscription as string
      const customerId = session.customer as string
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      await prisma.user.update({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionStatus: "active",
          stripeSubscriptionId: subscriptionId,
          subscriptionPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      })
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      await prisma.user.update({
        where: { stripeSubscriptionId: sub.id },
        data: {
          subscriptionStatus: stripeStatusToPrisma(sub.status),
          subscriptionPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      })
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      await prisma.user.update({
        where: { stripeSubscriptionId: sub.id },
        data: { subscriptionStatus: "canceled" },
      })
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      await prisma.user.update({
        where: { stripeCustomerId: invoice.customer as string },
        data: { subscriptionStatus: "past_due" },
      })
      break
    }

    default:
      // Evento desconhecido — ignora
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Passo 5: Rodar e confirmar que passa**

```bash
npm run test -- tests/api/webhooks-stripe.test.ts
```

Esperado: todos os testes passando.

- [ ] **Passo 6: Commit**

```bash
git add app/api/webhooks/stripe/route.ts tests/api/webhooks-stripe.test.ts tests/api/helpers.ts
git commit -m "feat: POST /api/webhooks/stripe — processa eventos Stripe (checkout, subscription, invoice)"
```

---

## Tarefa 7 — POST /api/subscription/portal + testes

**Arquivos:**
- Criar: `app/api/subscription/portal/route.ts`
- Criar: `tests/api/subscription-portal.test.ts`

**Interfaces:**
- Consome: `stripe.billingPortal.sessions.create`; `auth()`, `prisma`
- Resposta: `{ url: string }` | `{ error: string }` (400/401)

- [ ] **Passo 1: Escrever os testes primeiro**

Crie `tests/api/subscription-portal.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/subscription/portal/route"
import { createNextRequest, resetDatabase, createUser } from "./helpers"
import { prisma } from "@/lib/prisma"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: () => mockAuth() }))

const mockPortalCreate = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    billingPortal: { sessions: { create: (...a: unknown[]) => mockPortalCreate(...a) } },
  },
}))

describe("POST /api/subscription/portal", () => {
  beforeEach(async () => {
    await resetDatabase()
    mockAuth.mockResolvedValue(null)
    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/test" })
  })

  it("retorna 401 quando não autenticado", async () => {
    const req = createNextRequest({ method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("retorna 400 quando usuário não tem stripeCustomerId", async () => {
    const user = await createUser({ email: "a@test.com" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const req = createNextRequest({ method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("retorna url do Customer Portal", async () => {
    const user = await createUser({ email: "a@test.com", stripeCustomerId: "cus_1" })
    mockAuth.mockResolvedValue({ user: { id: user.id } })
    const req = createNextRequest({ method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe("https://billing.stripe.com/session/test")
  })
})
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
npm run test -- tests/api/subscription-portal.test.ts
```

Esperado: FAIL — "Cannot find module '@/app/api/subscription/portal/route'".

- [ ] **Passo 3: Implementar a rota**

Crie `app/api/subscription/portal/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "Sem assinatura ativa" }, { status: 400 })
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/`,
  })

  return NextResponse.json({ url: portalSession.url })
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

```bash
npm run test -- tests/api/subscription-portal.test.ts
```

Esperado: todos os testes passando.

- [ ] **Passo 5: Commit**

```bash
git add app/api/subscription/portal/route.ts tests/api/subscription-portal.test.ts
git commit -m "feat: POST /api/subscription/portal — cria sessão no Stripe Customer Portal"
```

---

## Tarefa 8 — Páginas /assinatura/sucesso e /assinatura/cancelado

**Arquivos:**
- Criar: `app/assinatura/sucesso/page.tsx`
- Criar: `app/assinatura/cancelado/page.tsx`

**Interfaces:**
- `sucesso`: chama `update()` do NextAuth para refrescar o token com o novo `subscriptionStatus = active`
- `cancelado`: redireciona para `/` (Server Component com `redirect`)

- [ ] **Passo 1: Criar `app/assinatura/cancelado/page.tsx`**

```typescript
import { redirect } from "next/navigation"

export default function AssinaturaCanceladoPage() {
  redirect("/")
}
```

- [ ] **Passo 2: Criar `app/assinatura/sucesso/page.tsx`**

```typescript
"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Pixel } from "@/components/Pixel"

export default function AssinaturaSucessoPage() {
  const { update } = useSession()

  useEffect(() => {
    // Refresca o token para que subscriptionStatus = active reflita imediatamente
    update()
  }, [update])

  return (
    <div className="min-h-screen bg-[#F8FFFE] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <Pixel pose="correct" size={96} animated />
      <h1 className="text-3xl font-bold text-[#0C1A19]">
        Bem-vindo à aventura! ✨
      </h1>
      <p className="text-slate-500 max-w-sm">
        Sua assinatura foi confirmada. Agora você tem acesso completo ao Continha Mágica.
      </p>
      <Link
        href="/"
        className="mt-2 inline-block rounded-xl bg-[#0D9488] px-6 py-3 text-white font-semibold hover:bg-[#0f766e] transition-colors"
      >
        Começar a praticar
      </Link>
    </div>
  )
}
```

- [ ] **Passo 3: Verificar que não há erros de tipo**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Passo 4: Commit**

```bash
git add app/assinatura/sucesso/page.tsx app/assinatura/cancelado/page.tsx
git commit -m "feat: páginas de retorno do Stripe (/assinatura/sucesso e /assinatura/cancelado)"
```

---

## Tarefa 9 — components/Paywall.tsx

**Arquivos:**
- Criar: `components/Paywall.tsx`

**Interfaces:**
- Props: `{ questions: Question[] }`
- Consome: `useSession`, `signIn` de `next-auth/react`; `Pixel`, `Button`, `QuestionCardItem`; `m` de `motion/react`
- Ao clicar em "Assinar agora" (sem sessão): chama `signIn("google")`
- Ao clicar em "Assinar agora" (com sessão): faz POST `/api/subscription/checkout` e redireciona para a URL retornada

- [ ] **Passo 1: Criar `components/Paywall.tsx`**

```typescript
"use client"

import { useState, useCallback } from "react"
import { signIn, useSession } from "next-auth/react"
import { m } from "motion/react"
import { Pixel } from "@/components/Pixel"
import { Button } from "@/components/ui/button"
import { QuestionCardItem } from "@/components/QuestionCardItem"
import { cn } from "@/lib/utils"
import type { Question } from "@/lib/questions"

interface PaywallProps {
  questions: Question[]
}

export function Paywall({ questions }: PaywallProps) {
  const { data: session } = useSession()
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly")
  const [loading, setLoading] = useState(false)

  const handleSubscribe = useCallback(async () => {
    if (!session) {
      signIn("google", { callbackUrl: "/" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json() as { url?: string }
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }, [session, plan])

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

      {/* Preview das questões — bloqueado */}
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

      {/* Card flutuante sticky */}
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

          {/* Seletor de plano */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPlan("monthly")}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-colors",
                plan === "monthly"
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 hover:border-teal-200"
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
                plan === "yearly"
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 hover:border-teal-200"
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
            {loading ? "Redirecionando..." : "Assinar agora"}
          </Button>

          {!session && (
            <p className="text-center text-xs text-slate-400">
              Já é assinante?{" "}
              <button
                onClick={() => signIn("google")}
                className="text-teal-600 underline underline-offset-2"
              >
                Entrar
              </button>
            </p>
          )}
        </m.div>
      </div>
    </div>
  )
}
```

- [ ] **Passo 2: Verificar que o build não quebra**

```bash
npm run build
```

Esperado: sem erros de type-check.

- [ ] **Passo 3: Commit**

```bash
git add components/Paywall.tsx
git commit -m "feat: componente Paywall com preview bloqueado e card de assinatura"
```

---

## Tarefa 10 — QuizPageLoader: gate de paywall + sync-trial + badge de trial

**Arquivos:**
- Modificar: `components/QuizPageLoader.tsx`
- Modificar: `AGENTS.md`

**Interfaces:**
- Consome: `useSubscriptionStatus`, `TRIAL_START_KEY` de `@/lib/subscription`; `generateQuestions` de `@/lib/questions`; `Paywall` de `@/components/Paywall`; `useSession` de `next-auth/react`
- Comportamento:
  - `status === "loading"` → retorna `null` (sessão pré-populada no server, estado efêmero)
  - `status === "expired"` → renderiza `<Paywall questions={questions} />`
  - `status === "trial"` e `daysLeft <= 7` → renderiza badge + `<QuizPage />`
  - `status === "trial"/"active"` → renderiza `<QuizPage />` normalmente
  - Na primeira sessão autenticada: chama `POST /api/subscription/sync-trial` com a data do localStorage e depois `update()` para refrescar o token

- [ ] **Passo 1: Atualizar `components/QuizPageLoader.tsx`**

Substitua o conteúdo completo do arquivo:

```typescript
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

  // Sincroniza trial anônimo com o DB na primeira vez que o usuário faz login
  useEffect(() => {
    if (session?.user?.id && !syncedRef.current) {
      syncedRef.current = true
      try {
        const trialStart = localStorage.getItem(TRIAL_START_KEY)
        if (trialStart) {
          fetch("/api/subscription/sync-trial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trialStart }),
          })
            .then(() => update())
            .catch(() => {
              // falha silenciosa — o trial será sincronizado na próxima sessão
            })
        }
      } catch {
        // ignora erro de localStorage
      }
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
```

- [ ] **Passo 2: Atualizar a tabela de localStorage no `AGENTS.md`**

No `AGENTS.md`, na tabela de persistência local (seção "Persistência local"), adicione após a linha de `continha-magica-history-cleaned-v1`:

```
| `continha-magica-trial-start` | Data ISO de início do trial (anônimo) | `lib/subscription.ts` |
```

Na seção de API routes do `AGENTS.md`, adicione:

```
- `POST /api/subscription/sync-trial`: persiste `trialStart` do cliente no DB (somente se null). Idempotente.
- `POST /api/subscription/checkout`: cria Stripe Checkout Session. Body: `{ plan: 'monthly' | 'yearly' }`. Retorna `{ url }`.
- `POST /api/subscription/portal`: cria Stripe Customer Portal Session. Retorna `{ url }`.
- `POST /api/webhooks/stripe`: processa eventos do Stripe. Protegido por `STRIPE_WEBHOOK_SECRET`.
```

- [ ] **Passo 3: Rodar a suíte de testes completa**

```bash
npm run test
```

Esperado: todos os testes passando. Se houver falhas, corrija antes de continuar.

- [ ] **Passo 4: Rodar o build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Passo 5: Commit final**

```bash
git add components/QuizPageLoader.tsx AGENTS.md
git commit -m "feat: integra paywall, sync-trial e badge de trial no QuizPageLoader"
```

---

## Auto-revisão do plano

### Cobertura da spec

| Requisito da spec | Tarefa |
|---|---|
| Trial 14 dias em localStorage (anônimo) | Tarefa 3 |
| Trial server-side (autenticado, `trialStart` no DB) | Tarefa 1 + Tarefa 3 + Tarefa 4 |
| Merge trial anônimo → autenticado via `sync-trial` | Tarefa 4 + Tarefa 10 |
| Enum `SubscriptionStatus` + campos no `User` | Tarefa 1 |
| Sessão NextAuth enriquecida | Tarefa 2 |
| Stripe singleton | Tarefa 2 |
| Checkout Session (mensal + anual) | Tarefa 5 |
| Webhook: `checkout.session.completed` | Tarefa 6 |
| Webhook: `customer.subscription.updated` | Tarefa 6 |
| Webhook: `customer.subscription.deleted` | Tarefa 6 |
| Webhook: `invoice.payment_failed` | Tarefa 6 |
| Customer Portal | Tarefa 7 |
| Página `/assinatura/sucesso` + `session.update()` | Tarefa 8 |
| Página `/assinatura/cancelado` | Tarefa 8 |
| Componente `Paywall` com preview bloqueado | Tarefa 9 |
| Badge "X dias grátis restantes" (≤ 7 dias) | Tarefa 10 |
| Gate no `QuizPageLoader` | Tarefa 10 |
| `env.example` atualizado | Tarefa 1 |
| `AGENTS.md` atualizado | Tarefa 10 |
| Variáveis Stripe + `NEXTAUTH_URL` documentadas | Tarefa 1 |

Todos os requisitos cobertos.

### Checklist de tipos e consistência

- `TRIAL_START_KEY` é exportado de `lib/subscription.ts` (Tarefa 3) e importado em `QuizPageLoader.tsx` (Tarefa 10) ✓
- `getOrSetTrialStart()` usada internamente em `useSubscriptionStatus` e nos testes ✓
- `SubscriptionStatus` enum do Prisma importado em `auth.ts`, `types/next-auth.d.ts` e nos webhooks ✓
- `stripe` singleton de `lib/stripe.ts` usado em checkout, portal e webhook ✓
- `QuestionCardItem` props: `question`, `index`, `value`, `status`, `disabled`, `onChange`, `setInputRef` — todos presentes no Paywall ✓
- `createUser` em `helpers.ts` aceita `stripeCustomerId` e `stripeSubscriptionId` após Tarefa 6 ✓
- `update()` de `useSession()` usado em `QuizPageLoader` (sync-trial) e em `/assinatura/sucesso` ✓
