# Design — Assinatura Freemium com Stripe

**Data:** 2026-06-23
**Status:** Aprovado

---

## Problema

O Continha Mágica é hoje 100% gratuito. Para sustentar o produto, precisamos de uma fonte de receita. O modelo escolhido é freemium: qualquer visitante (anônimo ou autenticado) tem 14 dias de acesso completo gratuito; após esse período, o app exibe um paywall e o usuário precisa assinar para continuar.

---

## Decisões definidas no brainstorm

1. **Paywall total após 2 semanas.** O quiz inteiro é bloqueado — não há plano parcial ou quota diária.
2. **Pagamento somente via web (Stripe).** Sem IAP nativo por enquanto. Mensal (R$ 4,90) e anual (R$ 39,90, desconto de ~32%).
3. **Trial para qualquer visitante.** Anônimo começa o trial imediatamente (localStorage). Se fizer login antes do fim do trial, o contador continua de onde parou.
4. **Paywall com preview.** As 20 questões são visíveis, mas os inputs ficam desabilitados. Card flutuante com CTA de assinatura.
5. **Enforcement client-side (Abordagem A).** O quiz é 100% client-side; não há dados de servidor a proteger. Enforcement no `QuizPageLoader` via hook. Usuário técnico pode burlar editando o localStorage, mas o risco é irrelevante para o público-alvo.

---

## Modelo de dados

### localStorage — nova chave

| Chave | Propósito | Gerenciado em |
|---|---|---|
| `continha-magica-trial-start` | Data ISO de início do trial (anônimo) | `lib/subscription.ts` |

A chave deve ser adicionada à tabela de persistência no `AGENTS.md` e envolta em `try/catch`.

### Prisma — campos novos em `User`

```prisma
model User {
  // campos existentes mantidos
  trialStart              DateTime?
  stripeCustomerId        String?            @unique
  stripeSubscriptionId    String?            @unique
  subscriptionStatus      SubscriptionStatus @default(free)
  subscriptionPeriodEnd   DateTime?
}

enum SubscriptionStatus {
  free       // nunca assinou (ou trial não iniciado no servidor)
  trialing   // dentro do trial (autenticado)
  active     // assinatura ativa e em dia
  canceled   // cancelou; acesso até subscriptionPeriodEnd
  past_due   // pagamento falhou; acesso suspenso
}
```

---

## Arquitetura

### `lib/subscription.ts` (novo)

Responsável por toda a lógica de estado de assinatura no cliente.

```ts
export const TRIAL_DAYS = 14
export const TRIAL_START_KEY = 'continha-magica-trial-start'

// Retorna a data de início do trial (anônimo), criando-a se necessário
export function getOrSetTrialStart(): Date

// Hook principal consumido pelo QuizPageLoader
export function useSubscriptionStatus(): {
  status: 'loading' | 'trial' | 'active' | 'expired'
  daysLeft: number  // relevante apenas quando status === 'trial'
}
```

**Lógica do hook:**

- Se o usuário está autenticado: usa `session.user.subscriptionStatus` e `session.user.trialStart` (vindos da sessão NextAuth enriquecida). Mapeia `trialing` → `trial`, `active`/`canceled`(com `subscriptionPeriodEnd` no futuro) → `active`, demais → `expired`.
- Se anônimo: lê `TRIAL_START_KEY` do localStorage (via `getOrSetTrialStart`), compara `now - trialStart` com `TRIAL_DAYS`. Retorna `trial` ou `expired`.
- Retorna `loading` enquanto a sessão NextAuth está carregando.

### Enriquecimento da sessão NextAuth (`auth.ts`)

Novos campos incluídos via callbacks JWT e session:

```ts
callbacks: {
  jwt({ token, user }) {
    if (user) {
      token.subscriptionStatus = user.subscriptionStatus
      token.subscriptionPeriodEnd = user.subscriptionPeriodEnd
      token.trialStart = user.trialStart
    }
    return token
  },
  session({ session, token }) {
    session.user.subscriptionStatus = token.subscriptionStatus
    session.user.subscriptionPeriodEnd = token.subscriptionPeriodEnd
    session.user.trialStart = token.trialStart
    return session
  }
}
```

O tipo `Session` do NextAuth deve ser estendido via `types/next-auth.d.ts`.

### Integração no `QuizPageLoader`

```tsx
const { status } = useSubscriptionStatus()
const questions = useMemo(() => generateQuestions(20, grade), [grade])

if (status === 'loading') return <LoadingSkeleton />
if (status === 'expired') return <Paywall questions={questions} />
return <QuizPage />
```

As questões são geradas antes de saber o status para que o preview do paywall exiba questões reais.

---

## API Routes (novas)

Todas devem ser adicionadas à seção de API do `AGENTS.md` e ao `prisma/schema.test.prisma` se precisarem de testes.

| Rota | Método | Auth | Descrição |
|---|---|---|---|
| `/api/subscription/checkout` | POST | obrigatória | Cria Stripe Checkout Session. Body: `{ plan: 'monthly' \| 'yearly' }`. Retorna `{ url: string }`. |
| `/api/subscription/portal` | POST | obrigatória | Cria Stripe Customer Portal Session. Retorna `{ url: string }`. |
| `/api/subscription/sync-trial` | POST | obrigatória | Persiste `trialStart` do cliente no DB. Body: `{ trialStart: string }`. Usa `min(trialStart_cliente, now)` — nunca antedatado. Idempotente: só atualiza se `User.trialStart` é null. |
| `/api/webhooks/stripe` | POST | `STRIPE_WEBHOOK_SECRET` | Processa eventos do Stripe. Não requer sessão NextAuth. |

### Eventos do webhook tratados

| Evento | Ação |
|---|---|
| `checkout.session.completed` | `subscriptionStatus = active`, salva `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionPeriodEnd` |
| `customer.subscription.updated` | Atualiza `subscriptionStatus` e `subscriptionPeriodEnd` |
| `customer.subscription.deleted` | `subscriptionStatus = canceled` |
| `invoice.payment_failed` | `subscriptionStatus = past_due` |

O webhook valida a assinatura via `stripe.webhooks.constructEvent` antes de processar qualquer evento.

### Páginas novas (App Router)

| Rota | Descrição |
|---|---|
| `/assinatura/sucesso` | Confirmação pós-pagamento. Chama `update()` (NextAuth v5) para refrescar o token. Exibe mensagem de boas-vindas e link para voltar ao quiz. |
| `/assinatura/cancelado` | Usuário cancelou no checkout Stripe. Redireciona de volta ao quiz (que exibirá o paywall). |

---

## UI do Paywall (`components/Paywall.tsx`)

Props: `{ questions: Question[] }`

**Estrutura:**

1. **Header** — Pixel na pose `thinking` + "Seu período gratuito terminou ✨"
2. **Preview do quiz** — 20 questões via `QuestionCardItem` com `disabled={true}` e blur leve (`blur-sm opacity-60`)
3. **Card flutuante** (sticky no mobile, centralizado no desktop):
   - Título: "Continue sua aventura matemática"
   - Dois botões de plano (selecionável):
     - Mensal: R$ 4,90/mês
     - Anual: R$ 39,90/ano + badge `#EAB308` "economize 32%"
   - CTA: botão primário "Assinar agora" (teal `#0D9488`)
   - Link: "Já sou assinante? Entrar" (só exibido se anônimo)

### Badge de trial ativo

Quando `status === 'trial'` e `daysLeft <= 7`: badge discreto no header do quiz com "X dias grátis restantes". Desaparece quando `daysLeft > 7`. Tom encorajador, nunca punitivo.

### Gerenciamento pós-assinatura

Link "Gerenciar assinatura" no menu de perfil (visível apenas para assinantes). Chama `POST /api/subscription/portal` e redireciona ao Stripe Customer Portal para cancelamento, troca de plano e histórico de faturas.

---

## Merge do trial anônimo → autenticado

Chamada automática em `QuizPage` (ou no hook de sessão) logo após o login ser detectado:

1. Lê `TRIAL_START_KEY` do localStorage
2. Se existir, chama `POST /api/subscription/sync-trial` com a data
3. O servidor persiste `min(trialStart_cliente, now)` em `User.trialStart` (somente se `null`)
4. O `session.update()` é chamado para o token refletir o novo `trialStart`

---

## Variáveis de ambiente novas

| Variável | Descrição |
|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (`sk_live_...` / `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Segredo para validar assinatura do webhook (`whsec_...`) |
| `STRIPE_MONTHLY_PRICE_ID` | ID do price mensal no Stripe (`price_...`) |
| `STRIPE_YEARLY_PRICE_ID` | ID do price anual no Stripe (`price_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública (necessária se usar Stripe.js embarcado futuramente) |

Devem ser adicionadas ao `env.example` e ao painel da Vercel. Nunca commitadas.

---

## Fluxo completo

```
Primeira visita (anônimo)
  → getOrSetTrialStart() grava trial-start no localStorage
  → useSubscriptionStatus() → { status: 'trial', daysLeft: 14 }
  → Quiz disponível; badge aparece quando daysLeft ≤ 7

Login (antes do trial expirar)
  → sync-trial envia trialStart ao servidor
  → User.trialStart = min(data_local, now)
  → session.update() → subscriptionStatus = 'trialing'
  → Trial continua de onde parou, agora server-authoritative

Trial expira (anônimo ou autenticado)
  → useSubscriptionStatus() → { status: 'expired' }
  → QuizPageLoader renderiza <Paywall questions={questions} />

Usuário clica "Assinar agora"
  → POST /api/subscription/checkout → Stripe Checkout Session
  → Redireciona para stripe.com/checkout
  → Pagamento concluído → webhook checkout.session.completed
    → User.subscriptionStatus = active
  → Stripe redireciona para /assinatura/sucesso
  → session.update() → status = 'active'
  → QuizPageLoader renderiza <QuizPage /> normalmente

Cancelamento
  → Stripe Customer Portal → webhook customer.subscription.deleted
  → User.subscriptionStatus = canceled
  → Acesso até subscriptionPeriodEnd; depois status = expired
```

---

## Restrições

- **NÃO** calcule preço ou aplique desconto no cliente — os Price IDs do Stripe são a fonte de verdade.
- **NÃO** confie no `trialStart` enviado pelo cliente além de `min(valor, now)` — evita antedatação.
- **NÃO** exponha `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` em código client-side.
- **NÃO** pule a validação da assinatura do webhook (`stripe.webhooks.constructEvent`).
- **NÃO** adicione IAP nativo sem discussão — as regras das lojas exigem revisão de arquitetura.

---

## O que está fora do escopo desta spec

- IAP (App Store / Google Play)
- Plano família ou multi-usuário
- Cupons e promoções
- E-mail transacional (confirmação de assinatura)
- Dashboard de métricas de assinatura
