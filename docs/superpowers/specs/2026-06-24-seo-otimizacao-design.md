# Spec: Otimização de SEO — Continha Mágica

**Data:** 2026-06-24  
**Objetivo:** Aumentar tráfego orgânico via Google/Bing com landing page SSR indexável, SEO técnico completo e dados estruturados para rich snippets.

---

## Contexto e Problema

O quiz roda hoje em `/` com `ssr: false` — os buscadores indexam uma página quase vazia. Não há `robots.txt`, `sitemap.xml`, `og:image` nem dados estruturados. O produto tem potencial de ranquear para termos como "atividades de matemática ensino fundamental", "exercícios de multiplicação 3º ano" e "quiz de matemática online", mas hoje é invisível para buscadores.

**Público-alvo da busca orgânica:** professores buscando atividades, pais buscando exercícios para os filhos, e alunos do fundamental praticando por conta própria. Abrange todos os anos (1º ao 9º).

---

## Arquitetura de Rotas

| Rota | Antes | Depois |
|------|-------|--------|
| `/` | Quiz (client-side, ssr: false) | Landing page SSR (nova) |
| `/jogar` | — | Quiz completo (movido de `/`) |

**Implementação:**
- `app/page.tsx` atual → `app/jogar/page.tsx` (mover arquivo, sem alterar lógica)
- `app/jogar/layout.tsx` herda o layout raiz; pode ter metadata própria
- `app/page.tsx` novo → componente `LandingPage` (Server Component, sem `"use client"`)

**App nativo:** zero impacto — o WebView carrega `https://continhamagica.vercel.app`. O quiz em `/jogar` funciona identicamente ao que estava em `/`. Nenhum rebuild nativo necessário.

---

## Landing Page (`app/page.tsx`)

Server Component puro (SSR), sem `"use client"`. Usa identidade visual Teal & Mel do projeto.

### Bloco 1 — Hero

- Mascote Pixel (pose `idle`, tamanho grande)
- **H1:** "Atividades de matemática para o ensino fundamental"
- **Subtítulo:** "Questões geradas na hora para do 1º ao 9º ano — adição, subtração, multiplicação, divisão, sequências e problemas contextualizados"
- **CTA primário:** botão `<Link href="/jogar">Começar agora →</Link>`
- **Texto de apoio:** "Grátis · Sem cadastro · Funciona no celular"

### Bloco 2 — Categorias de questões

- **H2:** "O que o Continha Mágica pratica?"
- Grid 2×3 (mobile) / 3×2 (desktop) com 6 cards, um por categoria:

| Categoria | Ícone Lucide | Descrição curta |
|-----------|-------------|-----------------|
| Adição | `Plus` | Contas de somar com números de até 5 dígitos |
| Subtração | `Minus` | Subtrações sem resultado negativo |
| Multiplicação | `X` | Tabuada e multiplicação com dois fatores |
| Divisão | `Divide` | Divisões exatas com resultado inteiro |
| Sequência numérica | `TrendingUp` | Complete a progressão aritmética |
| Problemas contextualizados | `BookOpen` | Situações do dia a dia em texto |

### Bloco 3 — Anos escolares

- **H2:** "Para todos os anos do ensino fundamental"
- 3 grupos com badge colorido e descrição de 2–3 linhas:
  - **Anos iniciais (1º ao 3º):** números pequenos, primeiros passos na tabuada, sequências simples
  - **Anos intermediários (4º e 5º):** operações com números até 9.999, multiplicação de dois dígitos, problemas com mais contexto
  - **Anos finais (6º ao 9º):** divisões com resultados maiores, sequências com razões amplas, operações com números de três dígitos
- CTA secundário: `<Link href="/jogar">Escolha seu ano e comece →</Link>`

### Bloco 4 — FAQ

- **H2:** "Perguntas frequentes"
- 6 itens em lista estática simples (sem JavaScript — melhor para SEO e indexação):

1. **Para quais anos escolares funciona?** — Do 1º ao 9º ano do ensino fundamental. Cada ano tem dificuldade calibrada: números menores e operações básicas nos primeiros anos, operações maiores e sequências mais complexas nos finais.
2. **Preciso criar uma conta para usar?** — Não. O quiz funciona sem cadastro. A conta (login com Google) é opcional e desbloqueia o sistema de ligas semanais.
3. **Posso usar no celular?** — Sim. O site é responsivo e pode ser instalado como aplicativo no Android e iOS (PWA). Há também um app nativo nas lojas.
4. **As questões são sempre as mesmas?** — Não. A cada acesso, 20 questões novas são geradas aleatoriamente dentro das categorias e do nível de dificuldade do ano selecionado.
5. **Como funciona o sistema de ligas?** — Usuários com conta acumulam XP a cada sessão e competem em grupos semanais divididos por ano escolar e liga (Bronze, Prata, Ouro... Diamante). Os melhores sobem de liga; os últimos descem.
6. **Existe versão para download?** — Sim. O app está disponível na Google Play Store e em breve na App Store. Também é possível instalar o site como PWA diretamente pelo navegador.

### Bloco 5 — Footer mínimo

- Links: "Começar" → `/jogar` · "Política de Privacidade" (placeholder, página futura)
- Copyright: `© 2026 Continha Mágica — matemática que encanta`

---

## SEO Técnico

### Metadata (`app/layout.tsx`)

Adicionar template de título e enriquecer campos:

```ts
export const metadata: Metadata = {
  title: {
    default: "Continha Mágica — Atividades de Matemática para o Ensino Fundamental",
    template: "%s | Continha Mágica",
  },
  description:
    "Atividades de matemática gratuitas para do 1º ao 9º ano: adição, subtração, multiplicação, divisão, sequências e problemas. Geradas na hora, sem cadastro.",
  keywords: [
    "atividades de matemática",
    "exercícios de matemática ensino fundamental",
    "quiz de matemática online",
    "matemática 1 ano",
    "matemática 2 ano",
    "matemática 3 ano",
    "matemática 4 ano",
    "matemática 5 ano",
    "matemática 6 ano",
    "matemática 7 ano",
    "matemática 8 ano",
    "matemática 9 ano",
    "adição subtração multiplicação divisão",
    "atividades matemática crianças",
  ],
  authors: [{ name: "Continha Mágica" }],
  creator: "Continha Mágica",
  metadataBase: new URL("https://continhamagica.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Continha Mágica — Atividades de Matemática para o Ensino Fundamental",
    description:
      "Atividades de matemática gratuitas para do 1º ao 9º ano. Geradas na hora, sem cadastro.",
    url: "https://continhamagica.vercel.app",
    siteName: "Continha Mágica",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Continha Mágica — Atividades de Matemática para o Ensino Fundamental",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Continha Mágica — Atividades de Matemática",
    description: "Questões de matemática para do 1º ao 9º ano. Grátis, sem cadastro.",
    images: ["/og-image.png"],
  },
};
```

### Metadata da rota `/jogar` (`app/jogar/layout.tsx` ou `page.tsx`)

```ts
export const metadata: Metadata = {
  title: "Jogar Agora",
  robots: { index: false, follow: false },
};
```

O `robots: noindex` em `/jogar` evita que o Google indexe a página do quiz (conteúdo gerado dinamicamente, sem texto estático relevante) e concentra a autoridade na landing page.

### `app/robots.ts`

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    sitemap: "https://continhamagica.vercel.app/sitemap.xml",
  };
}
```

### `app/sitemap.ts`

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://continhamagica.vercel.app",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://continhamagica.vercel.app/jogar",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
```

### Open Graph Image (`public/og-image.png`)

Imagem estática `1200×630` criada manualmente (ou via `scripts/generate-icons.ts` como os outros assets):
- Fundo: `#0C1A19` (Floresta)
- Logo / nome "Continha Mágica" em Space Grotesk
- Mascote Pixel (pose `idle`) à direita
- Slogan: "matemática que encanta" em Teal claro `#2DD4BF`
- Badge com "1º ao 9º ano · Grátis · Sem cadastro"

**Nota:** a imagem é um arquivo estático em `public/`. Criada como SVG-source em `assets/og-image-source.svg` e exportada para PNG via `scripts/generate-icons.ts` (mesmo fluxo dos ícones PWA com `sharp`). Não usa `ImageResponse` (edge), pois o projeto evita complexidade desnecessária de runtime.

---

## Dados Estruturados JSON-LD

Injetados na landing page (`app/page.tsx`) via `<script type="application/ld+json">`.

### Schema 1 — `WebApplication`

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Continha Mágica",
  "description": "Atividades de matemática para do 1º ao 9º ano do ensino fundamental",
  "url": "https://continhamagica.vercel.app",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web, Android, iOS",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL" },
  "inLanguage": "pt-BR",
  "audience": {
    "@type": "EducationalAudience",
    "educationalRole": "student",
    "audienceType": "Estudantes do ensino fundamental (1º ao 9º ano)"
  }
}
```

### Schema 2 — `FAQPage`

Objeto com `mainEntity` contendo as 6 perguntas/respostas do Bloco 4 no formato `Question` + `Answer`. Habilita rich snippets de FAQ diretamente nos resultados de busca.

### Implementação

Os dois schemas são emitidos em um único bloco `<script>` com array JSON-LD, ou em dois blocos separados — ambos são válidos segundo o Google. Preferir array único para reduzir número de `<script>` tags.

---

## Arquivos Afetados / Criados

| Ação | Arquivo |
|------|---------|
| Mover | `app/page.tsx` → `app/jogar/page.tsx` |
| Criar | `app/page.tsx` (nova landing page) |
| Criar | `app/jogar/layout.tsx` (metadata noindex) |
| Modificar | `app/layout.tsx` (metadata enriquecida) |
| Criar | `app/robots.ts` |
| Criar | `app/sitemap.ts` |
| Criar | `public/og-image.png` (asset estático) |

---

## Fora do Escopo

- Rotas por ano escolar (`/1-ano`, `/2-ano` etc.) — consideradas na Opção B, descartadas
- Blog ou seção de artigos — requer criação de conteúdo contínuo
- Geração dinâmica de og:image via `ImageResponse` — complexidade desnecessária
- Página de Política de Privacidade — referenciada no footer como placeholder
- Google Search Console / Analytics — já existe `@vercel/analytics`, configuração do GSC é manual

---

## Critérios de Sucesso

- `npm run build` passa sem erros
- `npm run lint` passa sem erros
- Landing page em `/` renderiza completamente no servidor (verificável via `curl https://continhamagica.vercel.app | grep "ensino fundamental"`)
- `/robots.txt` acessível e correto
- `/sitemap.xml` acessível com ambas as URLs
- Lighthouse SEO score ≥ 90 em `/`
- Rich results test do Google valida `WebApplication` e `FAQPage`
