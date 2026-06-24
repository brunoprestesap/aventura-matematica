# Revisão da Landing Page — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar `app/page.tsx` para refletir o modelo freemium implementado: hero com CTA duplo de trial, seção de preços com ancoragem em valor, e FAQ revisado com perguntas de assinatura.

**Architecture:** Uma única tarefa por bloco de mudança em `app/page.tsx` (Server Component estático). Cada tarefa modifica uma seção independente do arquivo e pode ser revisada separadamente. Não há novos arquivos, componentes ou rotas — apenas JSX estático e arrays de dados.

**Tech Stack:** Next.js 16.2.9 App Router · React 19 · TypeScript 5 strict · Tailwind v4 · Lucide React (ícones)

## Global Constraints

- **Arquivo único:** apenas `app/page.tsx` é modificado — sem novos arquivos ou componentes.
- **Server Component puro:** sem `"use client"`, sem hooks, sem estado, sem `motion.*`.
- **Idioma:** todo texto em pt-BR.
- **Paleta de cores obrigatória:** `#0D9488` (Teal), `#2DD4BF` (Teal claro), `#CCFBF1` (Névoa), `#0C1A19` (Floresta), `#EAB308` (Mel), `#F8FFFE` (fundo página), `#64748B` (texto secundário), `#475569` (texto FAQ). Proibido: `#C084FC`, `#8B5CF6`, `#1A1A2E`.
- **Preços exatos:** mensal R$ 4,90 · anual R$ 39,90 · desconto "32%".
- **Trial exato:** "15 dias", nunca "14 dias".
- **Imports Lucide:** usar somente ícones já importados ou `CheckCircle` — sem adicionar outras dependências.
- **Lint e build limpos:** `npm run lint` e `npm run build` sem novos erros.
- **Nome do produto:** "Continha Mágica" — nunca "Aventura Matemática".

---

### Task 1: Hero atualizado e metadata da página

**Files:**
- Modify: `app/page.tsx` — linhas 1–11 (metadata) e linhas 139–158 (bloco Hero)

**Interfaces:**
- Consumes: nada de tarefas anteriores
- Produces: hero com CTA duplo e `metadata.description` com trial mencionado (Task 2 não depende disto)

- [ ] **Step 1: Atualizar o export de metadata**

No início de `app/page.tsx`, substituir:

```tsx
export const metadata: Metadata = {
  alternates: {
    canonical: "https://continhamagica.vercel.app",
  },
};
```

Por:

```tsx
export const metadata: Metadata = {
  alternates: {
    canonical: "https://continhamagica.vercel.app",
  },
  description:
    "Atividades de matemática do 1º ao 9º ano com 15 dias grátis. Adição, subtração, multiplicação, divisão, sequências e problemas. Sem cadastro para começar.",
};
```

- [ ] **Step 2: Atualizar o bloco Hero**

Localizar o comentário `{/* ── Bloco 1: Hero ─────────────────────────────────────── */}` e substituir toda a `<section>` que o segue por:

```tsx
{/* ── Bloco 1: Hero ─────────────────────────────────────── */}
<section className="flex flex-col items-center justify-center gap-6 px-4 py-16 md:py-24 text-center bg-[#0C1A19]">
  <Pixel pose="idle" size={120} />
  <h1 className="text-3xl md:text-5xl font-bold text-white max-w-3xl leading-tight">
    Atividades de matemática para o ensino fundamental
  </h1>
  <p className="text-lg md:text-xl text-[#CCFBF1] max-w-2xl">
    Do 1º ao 9º ano — adição, subtração, multiplicação, divisão, sequências
    e problemas contextualizados. Experimente grátis por 15 dias.
  </p>
  <Link
    href="/jogar"
    className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-8 py-4 text-lg font-semibold text-white hover:bg-[#0f766e] transition-colors"
  >
    Começar 15 dias grátis →
  </Link>
  <p className="text-sm text-[#CCFBF1]">
    Já é assinante?{" "}
    <Link
      href="/jogar"
      className="underline underline-offset-2 hover:text-white transition-colors"
    >
      Acesse aqui
    </Link>
  </p>
</section>
```

**Nota:** a linha `"Grátis · Sem cadastro · Funciona no celular"` é removida — o novo subtítulo e o CTA secundário cobrem essa informação.

- [ ] **Step 3: Verificar lint**

```bash
npm run lint
```

Esperado: sem novos erros. Se houver aviso sobre `href` aninhado (a dentro de p), verifique — `<Link>` renderiza como `<a>` e é inline, válido dentro de `<p>`.

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: build concluído sem erros de TypeScript ou Next.js.

- [ ] **Step 5: Inspecionar visualmente**

```bash
npm run dev
```

Abrir `http://localhost:3000` e verificar:
- Subtítulo novo: "Do 1º ao 9º ano — adição, subtração, multiplicação, divisão, sequências e problemas contextualizados. Experimente grátis por 15 dias."
- Botão primário: "Começar 15 dias grátis →" (fundo teal `#0D9488`)
- Texto secundário: "Já é assinante? Acesse aqui" (link sublinhado)
- A linha "Grátis · Sem cadastro · Funciona no celular" **não aparece mais**

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: atualiza hero com CTA duplo de trial e description com 15 dias grátis"
```

---

### Task 2: Seção de preços e FAQ revisado

**Files:**
- Modify: `app/page.tsx` — import de `CheckCircle` (linha 3), array `FAQ` (linhas 66–97), novo bloco entre Anos e FAQ (após linha ~210)

**Interfaces:**
- Consumes: nada de Task 1 (mudanças em partes distintas do arquivo)
- Produces: landing page final com pricing section e FAQ de assinatura; JSON-LD `FAQPage` atualizado automaticamente via array `FAQ`

- [ ] **Step 1: Adicionar import de CheckCircle**

Na linha 3 de `app/page.tsx`, atualizar o import do Lucide para incluir `CheckCircle`:

```tsx
import { Plus, Minus, X, Divide, TrendingUp, BookOpen, CheckCircle } from "lucide-react";
```

- [ ] **Step 2: Substituir o array FAQ**

Localizar a constante `FAQ` (começa com `const FAQ = [`) e substituir todo o array por:

```tsx
const FAQ = [
  {
    pergunta: "Para quais anos escolares funciona?",
    resposta:
      "Do 1º ao 9º ano do ensino fundamental. Cada ano tem dificuldade calibrada: números menores e operações básicas nos primeiros anos, operações maiores e sequências mais complexas nos finais.",
  },
  {
    pergunta: "Como funciona o período gratuito?",
    resposta:
      "Ao acessar o Continha Mágica pela primeira vez, você tem 15 dias de acesso completo gratuito, sem precisar criar conta ou informar cartão. Após esse período, é necessário assinar um dos planos para continuar.",
  },
  {
    pergunta: "O que está incluído na assinatura?",
    resposta:
      "A assinatura dá acesso ilimitado a todas as séries (1º ao 9º ano), questões geradas na hora, e ao sistema de ligas semanais com ranking. Os planos custam R$ 4,90/mês ou R$ 39,90/ano (economia de 32%). Você pode cancelar a qualquer momento.",
  },
  {
    pergunta: "Posso usar no celular?",
    resposta:
      "Sim. O site é responsivo e pode ser instalado como aplicativo no Android e iOS (PWA). Há também um app nativo nas lojas.",
  },
  {
    pergunta: "Como funciona o sistema de ligas?",
    resposta:
      "Usuários com conta acumulam XP a cada sessão e competem em grupos semanais divididos por ano escolar e liga (Bronze, Prata, Ouro... Diamante). Os melhores sobem de liga; os últimos descem.",
  },
  {
    pergunta: "Existe versão para download?",
    resposta:
      "Sim. O app está disponível na Google Play Store e em breve na App Store. Também é possível instalar o site como PWA diretamente pelo navegador.",
  },
];
```

**Nota:** as perguntas "Preciso criar uma conta para usar?" e "As questões são sempre as mesmas?" são removidas e substituídas. O array `jsonLd` usa `FAQ.map(...)` — a atualização do JSON-LD é automática, sem código adicional.

- [ ] **Step 3: Inserir seção de preços entre Anos e FAQ**

Localizar o comentário `{/* ── Bloco 4: FAQ ─────────────────────────────────────── */}` e inserir o bloco abaixo **imediatamente antes** dele (após o fechamento da section de Anos):

```tsx
{/* ── Bloco 4: Preços ─────────────────────────────────── */}
<section className="px-4 py-16 max-w-3xl mx-auto w-full">
  <h2 className="text-2xl md:text-3xl font-bold text-[#0C1A19] text-center mb-4">
    Acesso completo por menos que um café
  </h2>
  <ul className="flex flex-col gap-3 mb-10 mt-8">
    {[
      "Todas as séries do 1º ao 9º ano",
      "Questões ilimitadas, geradas na hora",
      "Liga semanal com ranking e progressão de ligas",
      "Funciona no celular, tablet e computador",
    ].map((item) => (
      <li key={item} className="flex items-center gap-3 text-[#0C1A19]">
        <CheckCircle className="w-5 h-5 text-[#0D9488] shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
  <div className="grid grid-cols-2 gap-3 mb-6">
    <div className="rounded-2xl border-2 border-[#CCFBF1] bg-white p-5 flex flex-col gap-1">
      <div className="text-xs text-[#64748B] font-medium">Mensal</div>
      <div className="text-2xl font-bold text-[#0C1A19]">R$ 4,90</div>
      <div className="text-xs text-[#64748B]">por mês</div>
    </div>
    <div className="relative rounded-2xl border-2 border-[#0D9488] bg-[#CCFBF1] p-5 flex flex-col gap-1">
      <span className="absolute -top-3 right-3 bg-[#EAB308] text-white text-[10px] font-bold px-3 py-1 rounded-full">
        economize 32%
      </span>
      <div className="text-xs text-[#64748B] font-medium">Anual</div>
      <div className="text-2xl font-bold text-[#0C1A19]">R$ 39,90</div>
      <div className="text-xs text-[#64748B]">por ano</div>
    </div>
  </div>
  <div className="flex flex-col items-center gap-3">
    <Link
      href="/jogar"
      className="inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-8 py-4 text-lg font-semibold text-white hover:bg-[#0f766e] transition-colors"
    >
      Começar 15 dias grátis →
    </Link>
    <p className="text-sm text-[#64748B]">
      Sem cartão de crédito no trial · Cancele quando quiser
    </p>
  </div>
</section>
```

O bloco FAQ existente (agora Bloco 5 no arquivo, mas o comentário pode ser mantido como "Bloco 4" ou renomeado para "Bloco 5" — sem obrigação de renomear os comentários, pois não afeta funcionalidade).

- [ ] **Step 4: Verificar lint**

```bash
npm run lint
```

Esperado: sem novos erros.

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Esperado: build concluído sem erros. Se `CheckCircle` não for reconhecido, confirmar que o import foi adicionado corretamente no Step 1.

- [ ] **Step 6: Verificar testes existentes**

```bash
npm run test
```

Esperado: todos os 299 testes passam (nenhum teste cobre `app/page.tsx` diretamente — os testes verificam que o restante do sistema não foi quebrado).

- [ ] **Step 7: Inspecionar visualmente**

```bash
npm run dev
```

Abrir `http://localhost:3000` e verificar de cima para baixo:

1. **Hero:** "Começar 15 dias grátis →" e "Já é assinante? Acesse aqui"
2. **Categorias:** inalteradas (6 cards)
3. **Anos escolares:** inalterados (3 cards na seção escura)
4. **Seção de preços:**
   - Título: "Acesso completo por menos que um café"
   - 4 itens com ícone CheckCircle teal
   - Card Mensal: borda `#CCFBF1`, fundo branco, "R$ 4,90 / por mês"
   - Card Anual: borda `#0D9488`, fundo `#CCFBF1`, badge amarelo "economize 32%", "R$ 39,90 / por ano"
   - Botão "Começar 15 dias grátis →" (mesmo estilo do hero)
   - Nota "Sem cartão de crédito no trial · Cancele quando quiser"
5. **FAQ:** 6 perguntas — as duas novas são "Como funciona o período gratuito?" e "O que está incluído na assinatura?"
6. **Footer:** inalterado

Verificar no DevTools (Network → Preview ou View Page Source) que o JSON-LD inclui as duas novas perguntas do FAQ e não inclui mais "Preciso criar uma conta" nem "As questões são sempre as mesmas?".

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "feat: adiciona seção de preços e revisa FAQ com perguntas de assinatura"
```
