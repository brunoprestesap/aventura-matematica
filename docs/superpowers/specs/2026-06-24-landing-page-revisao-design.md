# Spec: Revisão Completa da Landing Page — Continha Mágica

**Data:** 2026-06-24
**Objetivo:** Atualizar `app/page.tsx` para refletir o modelo freemium implementado: hero com CTA duplo de trial, seção de preços ancorada em valor, e FAQ revisado com perguntas de assinatura.

---

## Contexto

A landing page foi criada antes das implementações de assinatura (RevenueCat, Paywall, trial de 15 dias). O hero ainda comunica o produto como "grátis", as categorias e anos estão corretos, mas falta comunicar o modelo de negócio. O FAQ menciona que "a conta é opcional" — o que não reflete mais a realidade (conta é necessária para assinar após o trial).

**Implementações existentes relevantes:**
- Trial de 15 dias rastreado por `lib/subscription.ts` (localStorage para anônimos, DB para autenticados)
- Paywall em `components/Paywall.tsx` com plano mensal R$ 4,90 e anual R$ 39,90 (32% desconto)
- Badge de aviso nos últimos 7 dias do trial em `QuizPageLoader.tsx`
- RevenueCat Web Billing com checkout embutido no `Paywall`
- Liga semanal com XP já existente

---

## Escopo das mudanças

Apenas `app/page.tsx` — sem novos arquivos, sem novos componentes.

| Bloco | Ação |
|-------|------|
| Hero | Atualizar subtítulo + substituir CTA único por CTA duplo |
| Categorias | **Sem alteração** |
| Anos escolares | **Sem alteração** |
| Preços (novo) | Adicionar entre Anos e FAQ |
| FAQ | Substituir 2 perguntas, manter 4 |
| Footer | **Sem alteração** |
| JSON-LD `FAQPage` | Atualizar para refletir 6 perguntas novas |
| `metadata.description` | Atualizar para mencionar trial de 15 dias |

---

## Bloco 1 — Hero (atualizado)

### Subtítulo
Antes: *"Questões geradas na hora, do 1º ao 9º ano — adição, subtração, multiplicação, divisão, sequências e problemas contextualizados"*

Depois: *"Do 1º ao 9º ano — adição, subtração, multiplicação, divisão, sequências e problemas contextualizados. Experimente grátis por 15 dias."*

### CTA duplo (substitui botão único)
```tsx
{/* CTA primário */}
<Link
  href="/jogar"
  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-8 py-4 text-lg font-semibold text-white hover:bg-[#0f766e] transition-colors"
>
  Começar 15 dias grátis →
</Link>

{/* CTA secundário */}
<p className="text-sm text-[#CCFBF1]">
  Já é assinante?{" "}
  <Link href="/jogar" className="underline underline-offset-2 hover:text-white transition-colors">
    Acesse aqui
  </Link>
</p>
```

### Linha de apoio removida
A linha `"Grátis · Sem cadastro · Funciona no celular"` é removida — o subtítulo já cobre o trial e o modelo mudou.

---

## Bloco 4 — Seção de preços (novo, entre Anos e FAQ)

### Estrutura
```tsx
<section className="px-4 py-16 max-w-3xl mx-auto w-full">
  <h2>Acesso completo por menos que um café</h2>

  {/* Lista de benefícios */}
  <ul>
    <li><CheckCircle /> Todas as séries do 1º ao 9º ano</li>
    <li><CheckCircle /> Questões ilimitadas, geradas na hora</li>
    <li><CheckCircle /> Liga semanal com ranking e progressão de ligas</li>
    <li><CheckCircle /> Funciona no celular, tablet e computador</li>
  </ul>

  {/* Cards de plano */}
  <div className="grid grid-cols-2 gap-3">
    {/* Card Mensal */}
    <div className="rounded-2xl border-2 border-[#CCFBF1] bg-white p-5">
      <div>Mensal</div>
      <div>R$ 4,90</div>
      <div>por mês</div>
    </div>

    {/* Card Anual — destaque */}
    <div className="relative rounded-2xl border-2 border-[#0D9488] bg-[#CCFBF1] p-5">
      <span className="absolute -top-3 right-3 bg-[#EAB308] text-white text-xs font-bold px-3 py-1 rounded-full">
        economize 32%
      </span>
      <div>Anual</div>
      <div>R$ 39,90</div>
      <div>por ano</div>
    </div>
  </div>

  {/* CTA */}
  <Link href="/jogar">Começar 15 dias grátis →</Link>
  <p>Sem cartão de crédito no trial · Cancele quando quiser</p>
</section>
```

**Detalhes visuais:**
- Fundo da seção: `bg-[#F8FFFE]` (mesmo da página)
- Card Mensal: `border-[#CCFBF1]`, fundo branco
- Card Anual: `border-[#0D9488]`, fundo `bg-[#CCFBF1]` — destaque visual de "recomendado"
- Badge "economize 32%": fundo Mel `#EAB308`, texto branco, posicionado `absolute -top-3 right-3`
- Ícone `CheckCircle` do Lucide, cor `#0D9488`
- CTA: mesma aparência do botão do hero (fundo `#0D9488`, texto branco, rounded-full)
- Nota sob o CTA: texto pequeno, cor `#64748B`
- Os cards são **estáticos** — sem estado de seleção. A seleção acontece no Paywall dentro de `/jogar`.

---

## Bloco 5 — FAQ (revisado)

### Perguntas mantidas (4)
1. Para quais anos escolares funciona?
4. Posso usar no celular?
5. Como funciona o sistema de ligas?
6. Existe versão para download?

### Perguntas removidas (2)
- ~~"Preciso criar uma conta para usar?"~~ — respondida pela nova pergunta #2
- ~~"As questões são sempre as mesmas?"~~ — coberta pelo hero e seção de preços

### Perguntas novas (2, inseridas nas posições 2 e 3)

**2. Como funciona o período gratuito?**
> Ao acessar o Continha Mágica pela primeira vez, você tem 15 dias de acesso completo gratuito, sem precisar criar conta ou informar cartão. Após esse período, é necessário assinar um dos planos para continuar.

**3. O que está incluído na assinatura?**
> A assinatura dá acesso ilimitado a todas as séries (1º ao 9º ano), questões geradas na hora, e ao sistema de ligas semanais com ranking. Os planos custam R$ 4,90/mês ou R$ 39,90/ano (economia de 32%). Você pode cancelar a qualquer momento.

### FAQ final (ordem)
1. Para quais anos escolares funciona?
2. Como funciona o período gratuito? *(nova)*
3. O que está incluído na assinatura? *(nova)*
4. Posso usar no celular?
5. Como funciona o sistema de ligas?
6. Existe versão para download?

---

## JSON-LD `FAQPage` (atualizado)

O array `FAQ` em `app/page.tsx` é a fonte única de verdade — tanto para o HTML quanto para o JSON-LD. Atualizar o array reflete automaticamente nos dois lugares.

```ts
const FAQ = [
  {
    pergunta: "Para quais anos escolares funciona?",
    resposta: "Do 1º ao 9º ano do ensino fundamental. Cada ano tem dificuldade calibrada: números menores e operações básicas nos primeiros anos, operações maiores e sequências mais complexas nos finais.",
  },
  {
    pergunta: "Como funciona o período gratuito?",
    resposta: "Ao acessar o Continha Mágica pela primeira vez, você tem 15 dias de acesso completo gratuito, sem precisar criar conta ou informar cartão. Após esse período, é necessário assinar um dos planos para continuar.",
  },
  {
    pergunta: "O que está incluído na assinatura?",
    resposta: "A assinatura dá acesso ilimitado a todas as séries (1º ao 9º ano), questões geradas na hora, e ao sistema de ligas semanais com ranking. Os planos custam R$ 4,90/mês ou R$ 39,90/ano (economia de 32%). Você pode cancelar a qualquer momento.",
  },
  {
    pergunta: "Posso usar no celular?",
    resposta: "Sim. O site é responsivo e pode ser instalado como aplicativo no Android e iOS (PWA). Há também um app nativo nas lojas.",
  },
  {
    pergunta: "Como funciona o sistema de ligas?",
    resposta: "Usuários com conta acumulam XP a cada sessão e competem em grupos semanais divididos por ano escolar e liga (Bronze, Prata, Ouro... Diamante). Os melhores sobem de liga; os últimos descem.",
  },
  {
    pergunta: "Existe versão para download?",
    resposta: "Sim. O app está disponível na Google Play Store e em breve na App Store. Também é possível instalar o site como PWA diretamente pelo navegador.",
  },
];
```

---

## `metadata.description` (atualizado)

```ts
description: "Atividades de matemática do 1º ao 9º ano com 15 dias grátis. Adição, subtração, multiplicação, divisão, sequências e problemas. Sem cadastro para começar.",
```

---

## Imports necessários (adicionais)

```ts
import { CheckCircle } from "lucide-react";
```

Já existentes e mantidos: `Link`, `Metadata`, `Plus`, `Minus`, `X`, `Divide`, `TrendingUp`, `BookOpen`, `Pixel`.

---

## Fora do escopo

- Animações na seção de preços — Server Component, sem `motion`
- Toggle de plano interativo — acontece no Paywall em `/jogar`
- Depoimentos / social proof — produto novo, sem volume ainda
- Comparação free vs. premium em tabela — complexidade desnecessária

---

## Critérios de sucesso

- `npm run build` passa sem erros
- `npm run lint` passa sem novos erros
- `npm run test` passa (299 testes)
- Landing page em `/` renderiza o novo hero, seção de preços e FAQ no HTML do servidor
- JSON-LD atualizado (verificável com `curl https://continhamagica.vercel.app | grep "período gratuito"`)
