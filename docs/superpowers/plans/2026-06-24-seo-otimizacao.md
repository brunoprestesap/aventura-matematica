# SEO — Otimização para Tráfego Orgânico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o Continha Mágica indexável pelos buscadores, criando uma landing page SSR em `/`, movendo o quiz para `/jogar`, e adicionando SEO técnico completo (robots.txt, sitemap, og:image, JSON-LD).

**Architecture:** O quiz (com `ssr: false` obrigatório por causa do `localStorage`) é movido para a rota `/jogar`. A rota `/` recebe uma landing page Server Component pura (SSR), visível aos buscadores. Arquivos técnicos de SEO (`robots.ts`, `sitemap.ts`) usam as APIs nativas do Next.js App Router.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript 5 (strict), Tailwind CSS v4, Lucide React, sharp (geração da og:image via SVG-source existente), Playwright (testes E2E).

## Global Constraints

- Next.js 16.2.9 App Router — `params`/`searchParams` são Promises; usar `await`
- TypeScript strict habilitado — sem `any` implícito
- `ssr: false` em `QuizPageLoader` — não remover
- Idioma da interface: pt-BR em todo o conteúdo novo
- Paleta obrigatória: Teal `#0D9488`, Teal claro `#2DD4BF`, Floresta `#0C1A19`, Névoa `#CCFBF1`, Mel `#EAB308` — **proibido usar roxo** (`#C084FC`, `#8B5CF6`, `#1A1A2E`)
- Componentes `m.*` do Framer Motion apenas (nunca `motion.*`) — mas a landing page não usa animações
- Nome do produto: "Continha Mágica" — nunca "Aventura Matemática"

---

### Task 1: Mover quiz para /jogar e atualizar teste E2E

**Files:**
- Create: `app/jogar/page.tsx`
- Modify: `app/page.tsx` (substituir por redirect temporário)
- Modify: `tests/e2e/quiz-flow.spec.ts` (atualizar URL de navegação)

**Interfaces:**
- Consome: `QuizPageLoader` de `@/components/QuizPageLoader` — sem alteração
- Produz: rota `/jogar` com o quiz; `/` redireciona para `/jogar` (temp); teste E2E atualizado

---

- [ ] **Step 1: Criar `app/jogar/page.tsx`**

Cria o diretório e o arquivo. O conteúdo é o quiz atual com metadata de noindex adicionada:

```tsx
import type { Metadata } from "next";
import { QuizPageLoader } from "@/components/QuizPageLoader";

export const metadata: Metadata = {
  title: "Jogar Agora",
  robots: { index: false, follow: false },
};

export default function JogarPage() {
  return <QuizPageLoader />;
}
```

- [ ] **Step 2: Substituir `app/page.tsx` por redirect temporário**

O redirect garante que a rota `/` não fique com 404 até a landing page ser criada na Task 4:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/jogar");
}
```

- [ ] **Step 3: Atualizar `tests/e2e/quiz-flow.spec.ts`**

Alterar `page.goto("/")` para `page.goto("/jogar")`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Fluxo do quiz", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/jogar");
  });

  test("usuário completa uma rodada de quiz e vê o resultado", async ({ page }) => {
    // Tela de nome
    await expect(page.getByText(/Bem-vindo ao Continha Mágica!/i)).toBeVisible();
    await page.getByLabel(/Seu nome/i).fill("Ana Teste");
    await page.getByRole("button", { name: /Começar a magia/i }).click();

    // Tela de seleção de ano (saudação personalizada com o nome)
    await expect(page.getByText(/Em qual ano você está/i)).toBeVisible();
    await page.getByRole("button", { name: /4º ano/i }).click();

    // Quiz carregou
    await expect(page.getByText(/Hora de praticar/i)).toBeVisible();
    await expect(page.getByText(/4º ano/i)).toBeVisible();

    // Preenche as 20 respostas com "1" (provavelmente errado, mas preenche)
    const inputs = page.locator('input[aria-label^="Resposta para a questão"]').nth(0);
    await expect(inputs).toBeVisible();

    const allInputs = page.locator('input[aria-label^="Resposta para a questão"]');
    const count = await allInputs.count();
    expect(count).toBe(20);

    for (let i = 0; i < count; i++) {
      await allInputs.nth(i).fill("1");
    }

    // Verifica respostas
    await page.getByRole("button", { name: /Verificar respostas/i }).click();

    // Resultado aparece
    await expect(page.getByText(/Você acertou/i)).toBeVisible();

    // Histórico reflete a atividade
    await page.getByRole("button", { name: /Histórico/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/4º ano/i).first()).toBeVisible();
    // Fecha clicando no overlay
    await page.mouse.click(10, 10);
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Novas questões
    await page.getByRole("button", { name: /Novas questões/i }).click();
    await expect(page.getByText(/Hora de praticar/i)).toBeVisible();
  });
});
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: build concluído sem erros. A rota `/` gera um redirect estático; `/jogar` gera a página do quiz.

- [ ] **Step 5: Rodar lint**

```bash
npm run lint
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add app/jogar/page.tsx app/page.tsx tests/e2e/quiz-flow.spec.ts
git commit -m "feat: move quiz to /jogar, add noindex metadata and redirect from /"
```

---

### Task 2: SEO técnico — metadata, robots.ts, sitemap.ts

**Files:**
- Modify: `app/layout.tsx` (metadata enriquecida)
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

**Interfaces:**
- Consome: nada novo — `app/layout.tsx` já existe
- Produz: `/robots.txt` e `/sitemap.xml` servidos pelo Next.js; metadata com og:image, keywords, twitter cards e título com template

---

- [ ] **Step 1: Atualizar metadata em `app/layout.tsx`**

Substituir o objeto `metadata` atual pelo enriquecido. O restante do arquivo (imports, viewport, fonts, RootLayout) permanece igual:

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/next";
import { auth } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Continha Mágica",
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

export const viewport: Viewport = {
  themeColor: "#0D9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* refetchOnWindowFocus=false evita refetches desnecessários no WebView
            do app nativo e reduz requests quando o PWA perde/ganha foco. */}
        <SessionProvider session={session} refetchOnWindowFocus={false}>
          {children}
        </SessionProvider>
        <Analytics />
        {process.env.NODE_ENV === "production" ? (
          <Script id="register-sw" strategy="afterInteractive">
            {`
              // Registra o service worker do Continha Mágica (apenas em produção)
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `}
          </Script>
        ) : (
          <Script id="unregister-sw" strategy="afterInteractive">
            {`
              // Em desenvolvimento, nenhum service worker deve ficar ativo:
              // um SW servindo o shell em cache quebra o HMR do Next e causa
              // loops de recarregamento. Remove registros e caches existentes.
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations()
                  .then((regs) => regs.forEach((reg) => reg.unregister()))
                  .catch(() => {});
              }
              if (typeof caches !== 'undefined') {
                caches.keys()
                  .then((keys) => keys.forEach((key) => caches.delete(key)))
                  .catch(() => {});
              }
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Criar `app/robots.ts`**

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: "https://continhamagica.vercel.app/sitemap.xml",
  };
}
```

- [ ] **Step 3: Criar `app/sitemap.ts`**

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

- [ ] **Step 4: Verificar build e lint**

```bash
npm run build
npm run lint
```

Esperado: build sem erros; lint sem erros. O Next.js gera `/robots.txt` e `/sitemap.xml` automaticamente a partir dos arquivos criados.

- [ ] **Step 5: Confirmar geração dos arquivos em dev**

```bash
npm run dev &
sleep 5
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
kill %1
```

Esperado:
- `/robots.txt` contém `Disallow: /api/` e a URL do sitemap
- `/sitemap.xml` contém `https://continhamagica.vercel.app` e `https://continhamagica.vercel.app/jogar`

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/robots.ts app/sitemap.ts
git commit -m "feat: enrich metadata, add robots.txt and sitemap.xml via Next.js App Router"
```

---

### Task 3: Open Graph image — SVG-source e geração do PNG

**Files:**
- Create: `assets/og-image-source.svg`
- Modify: `scripts/generate-icons.ts` (adicionar entrada og-image)
- Output: `public/og-image.png` (gerado pelo script, commitado)

**Interfaces:**
- Consome: `sharp` (já instalado); `assets/og-image-source.svg` (novo)
- Produz: `public/og-image.png` (1200×630) referenciado pela metadata do layout

---

- [ ] **Step 1: Criar `assets/og-image-source.svg`**

SVG 1200×630, identidade visual Teal & Mel, com mascote Pixel (pose idle) inline:

```svg
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo Floresta -->
  <rect width="1200" height="630" fill="#0C1A19"/>
  <!-- Faixa Teal no topo -->
  <rect width="1200" height="8" fill="#0D9488"/>

  <!-- Título: "Continha" -->
  <text x="60" y="185" font-family="sans-serif" font-size="86" font-weight="700" fill="#2DD4BF">Continha</text>
  <!-- Título: "Mágica" -->
  <text x="60" y="275" font-family="sans-serif" font-size="86" font-weight="700" fill="white">M&#225;gica</text>

  <!-- Linha divisória -->
  <rect x="60" y="300" width="540" height="4" rx="2" fill="#0D9488"/>

  <!-- Slogan -->
  <text x="60" y="356" font-family="sans-serif" font-size="30" fill="#CCFBF1">matem&#225;tica que encanta</text>

  <!-- Descrição -->
  <text x="60" y="412" font-family="sans-serif" font-size="22" fill="#64748B">Atividades para o ensino fundamental &#8212;</text>
  <text x="60" y="442" font-family="sans-serif" font-size="22" fill="#64748B">adi&#231;&#227;o, subtra&#231;&#227;o, multiplica&#231;&#227;o, divis&#227;o e mais</text>

  <!-- Badge: 1º ao 9º ano -->
  <rect x="60" y="482" width="195" height="46" rx="23" fill="#0D9488"/>
  <text x="157" y="511" font-family="sans-serif" font-size="20" font-weight="600" fill="white" text-anchor="middle">1&#186; ao 9&#186; ano</text>

  <!-- Badge: Grátis -->
  <rect x="268" y="482" width="110" height="46" rx="23" fill="#EAB308"/>
  <text x="323" y="511" font-family="sans-serif" font-size="20" font-weight="600" fill="#0C1A19" text-anchor="middle">Gr&#225;tis</text>

  <!-- Badge: Sem cadastro -->
  <rect x="390" y="482" width="178" height="46" rx="23" fill="#132F2C"/>
  <text x="479" y="511" font-family="sans-serif" font-size="20" font-weight="600" fill="#CCFBF1" text-anchor="middle">Sem cadastro</text>

  <!-- URL -->
  <text x="60" y="598" font-family="sans-serif" font-size="18" fill="#0D9488">continhamagica.vercel.app</text>

  <!-- Mascote Pixel (pose idle), escala 4× a partir do viewBox 0 0 100 120 -->
  <g transform="translate(800, 47) scale(4)">
    <!-- Orelhas -->
    <path d="M22 42 L29 30 L35 39 L65 39 L71 30 L78 42" stroke="#2DD4BF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <!-- Cabeça -->
    <ellipse cx="50" cy="63" rx="27" ry="23" fill="#2DD4BF"/>
    <!-- Olhos idle -->
    <ellipse cx="39" cy="60" rx="5.5" ry="6.5" fill="#0C1A19"/>
    <ellipse cx="61" cy="60" rx="5.5" ry="6.5" fill="#0C1A19"/>
    <ellipse cx="40.5" cy="58.5" rx="2" ry="2.4" fill="#CCFBF1"/>
    <ellipse cx="62.5" cy="58.5" rx="2" ry="2.4" fill="#CCFBF1"/>
    <!-- Nariz -->
    <ellipse cx="50" cy="68" rx="4" ry="2.5" fill="#0D9488"/>
    <!-- Boca idle -->
    <path d="M43 73 Q50 78 57 73" stroke="#0A7A70" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <!-- Bigodes esquerda -->
    <line x1="20" y1="61" x2="28" y2="62.5" stroke="#0D9488" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="20" y1="64.5" x2="28" y2="64.5" stroke="#0D9488" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Bigodes direita -->
    <line x1="72" y1="62.5" x2="80" y2="61" stroke="#0D9488" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="72" y1="64.5" x2="80" y2="64.5" stroke="#0D9488" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Sombra do corpo -->
    <ellipse cx="50" cy="88" rx="15" ry="6.5" fill="#0D9488" opacity="0.45"/>
    <!-- Corpo -->
    <path d="M36 86 Q31 97 34 104 Q41 107 50 106 Q59 107 66 104 Q69 97 64 86" fill="#2DD4BF"/>
    <!-- Listra do corpo -->
    <path d="M42 96 Q50 101 58 96" stroke="#0D9488" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <!-- Emblema idle (× dourado) -->
    <circle cx="72" cy="36" r="9" fill="#EAB308"/>
    <text x="72" y="40.5" text-anchor="middle" fill="#0C1A19" font-size="10" font-weight="700">&#215;</text>
  </g>
</svg>
```

- [ ] **Step 2: Atualizar `scripts/generate-icons.ts`**

Adicionar leitura do SVG e entrada na lista de ícones, com suporte a imagens retangulares:

```ts
import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

const svgFull = readFileSync(join(root, "assets/icon-source.svg"));
const svgAdaptive = readFileSync(join(root, "assets/icon-source-adaptive.svg"));
const svgSplash = readFileSync(join(root, "assets/splash-source.svg"));
const svgOgImage = readFileSync(join(root, "assets/og-image-source.svg"));

// Cria versão maskable com fundo #CCFBF1 (safe zone para ícones adaptáveis)
const svgAdaptiveStr = svgAdaptive.toString("utf-8");
const maskableBackgroundRect =
  '<rect width="1024" height="1024" fill="#CCFBF1"/>';
const svgMaskable = Buffer.from(
  svgAdaptiveStr.replace(
    /(<svg[^>]*>)/,
    `$1\n  ${maskableBackgroundRect}`
  )
);

const icons: Array<{ svg: Buffer | string; out: string; size: number }> = [
  // Expo / App Store
  { svg: svgFull, out: "continha-magica-app/assets/icon.png", size: 1024 },
  {
    svg: svgAdaptive,
    out: "continha-magica-app/assets/adaptive-icon.png",
    size: 1024,
  },
  { svg: svgSplash, out: "continha-magica-app/assets/splash.png", size: 1284 },

  // PWA
  { svg: svgFull, out: "public/icons/icon-192x192.png", size: 192 },
  { svg: svgFull, out: "public/icons/icon-512x512.png", size: 512 },
  { svg: svgMaskable, out: "public/icons/maskable-icon-512x512.png", size: 512 },
  { svg: svgFull, out: "public/apple-touch-icon.png", size: 180 },

  // SEO — og:image (tamanho dummy; tratado como caso especial abaixo)
  { svg: svgOgImage, out: "public/og-image.png", size: 1200 },
];

async function main() {
  for (const { svg, out, size } of icons) {
    const isSplash = out.includes("splash");
    const isOgImage = out.includes("og-image");
    const pipeline = sharp(svg);

    if (isSplash) {
      // O splash já possui dimensões exatas no viewBox (1284×2778)
      pipeline.resize(1284, 2778, { fit: "contain" });
    } else if (isOgImage) {
      // og:image padrão Open Graph: 1200×630
      pipeline.resize(1200, 630, { fit: "fill" });
    } else {
      pipeline.resize(size, size, { fit: "contain" });
    }

    await pipeline.png().toFile(out);
    console.log(`✓ ${out} gerado`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Gerar `public/og-image.png`**

```bash
npx tsx scripts/generate-icons.ts
```

Esperado: lista de arquivos gerados incluindo `✓ public/og-image.png gerado`.

- [ ] **Step 4: Verificar o PNG gerado**

```bash
ls -lh public/og-image.png
```

Esperado: arquivo existe, tamanho > 10KB.

- [ ] **Step 5: Commit**

```bash
git add assets/og-image-source.svg scripts/generate-icons.ts public/og-image.png
git commit -m "feat: add og:image source SVG and generate 1200x630 PNG for Open Graph"
```

---

### Task 4: Landing page com JSON-LD

**Files:**
- Modify: `app/page.tsx` (substituir redirect temporário pela landing page completa)

**Interfaces:**
- Consome: `Pixel` de `@/components/Pixel`; `Link` de `next/link`; ícones `Plus, Minus, X, Divide, TrendingUp, BookOpen` de `lucide-react`
- Produz: landing page SSR em `/` com 5 blocos e JSON-LD (`WebApplication` + `FAQPage`)

---

- [ ] **Step 1: Substituir `app/page.tsx` pela landing page completa**

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Minus, X, Divide, TrendingUp, BookOpen } from "lucide-react";
import { Pixel } from "@/components/Pixel";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://continhamagica.vercel.app",
  },
};

const CATEGORIAS = [
  {
    Icone: Plus,
    nome: "Adição",
    descricao: "Contas de somar com números de até 5 dígitos",
  },
  {
    Icone: Minus,
    nome: "Subtração",
    descricao: "Subtrações sem resultado negativo",
  },
  {
    Icone: X,
    nome: "Multiplicação",
    descricao: "Tabuada e multiplicação com dois fatores",
  },
  {
    Icone: Divide,
    nome: "Divisão",
    descricao: "Divisões exatas com resultado inteiro",
  },
  {
    Icone: TrendingUp,
    nome: "Sequência numérica",
    descricao: "Complete a progressão aritmética",
  },
  {
    Icone: BookOpen,
    nome: "Problemas contextualizados",
    descricao: "Situações do dia a dia em texto",
  },
];

const ANOS = [
  {
    titulo: "Anos iniciais",
    faixa: "1º ao 3º ano",
    descricao:
      "Números pequenos, primeiros passos na tabuada e sequências simples.",
  },
  {
    titulo: "Anos intermediários",
    faixa: "4º e 5º ano",
    descricao:
      "Operações com números até 9.999, multiplicação de dois dígitos e problemas com mais contexto.",
  },
  {
    titulo: "Anos finais",
    faixa: "6º ao 9º ano",
    descricao:
      "Divisões com resultados maiores, sequências com razões amplas e operações com números de três dígitos.",
  },
];

const FAQ = [
  {
    pergunta: "Para quais anos escolares funciona?",
    resposta:
      "Do 1º ao 9º ano do ensino fundamental. Cada ano tem dificuldade calibrada: números menores e operações básicas nos primeiros anos, operações maiores e sequências mais complexas nos finais.",
  },
  {
    pergunta: "Preciso criar uma conta para usar?",
    resposta:
      "Não. O quiz funciona sem cadastro. A conta (login com Google) é opcional e desbloqueia o sistema de ligas semanais.",
  },
  {
    pergunta: "Posso usar no celular?",
    resposta:
      "Sim. O site é responsivo e pode ser instalado como aplicativo no Android e iOS (PWA). Há também um app nativo nas lojas.",
  },
  {
    pergunta: "As questões são sempre as mesmas?",
    resposta:
      "Não. A cada acesso, 20 questões novas são geradas aleatoriamente dentro das categorias e do nível de dificuldade do ano selecionado.",
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

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Continha Mágica",
    description:
      "Atividades de matemática para do 1º ao 9º ano do ensino fundamental",
    url: "https://continhamagica.vercel.app",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Android, iOS",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    inLanguage: "pt-BR",
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      audienceType: "Estudantes do ensino fundamental (1º ao 9º ano)",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ pergunta, resposta }) => ({
      "@type": "Question",
      name: pergunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: resposta,
      },
    })),
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex flex-col min-h-screen bg-[#F8FFFE]">
        {/* ── Bloco 1: Hero ─────────────────────────────────────── */}
        <section className="flex flex-col items-center justify-center gap-6 px-4 py-16 md:py-24 text-center bg-[#0C1A19]">
          <Pixel pose="idle" size={120} />
          <h1 className="text-3xl md:text-5xl font-bold text-white max-w-3xl leading-tight">
            Atividades de matemática para o ensino fundamental
          </h1>
          <p className="text-lg md:text-xl text-[#CCFBF1] max-w-2xl">
            Questões geradas na hora para do 1º ao 9º ano — adição, subtração,
            multiplicação, divisão, sequências e problemas contextualizados
          </p>
          <Link
            href="/jogar"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-8 py-4 text-lg font-semibold text-white hover:bg-[#0f766e] transition-colors"
          >
            Começar agora →
          </Link>
          <p className="text-sm text-[#2DD4BF]">
            Grátis · Sem cadastro · Funciona no celular
          </p>
        </section>

        {/* ── Bloco 2: Categorias ───────────────────────────────── */}
        <section className="px-4 py-16 max-w-5xl mx-auto w-full">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0C1A19] text-center mb-10">
            O que o Continha Mágica pratica?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIAS.map(({ Icone, nome, descricao }) => (
              <div
                key={nome}
                className="rounded-2xl border border-[#CCFBF1] bg-white p-5 flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] flex items-center justify-center">
                  <Icone className="w-5 h-5 text-[#0D9488]" />
                </div>
                <h3 className="font-semibold text-[#0C1A19]">{nome}</h3>
                <p className="text-sm text-[#64748B]">{descricao}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bloco 3: Anos escolares ───────────────────────────── */}
        <section className="px-4 py-16 bg-[#0C1A19]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
              Para todos os anos do ensino fundamental
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {ANOS.map(({ titulo, faixa, descricao }) => (
                <div
                  key={titulo}
                  className="rounded-2xl bg-[#132F2C] p-6 flex flex-col gap-3"
                >
                  <span className="self-start rounded-full bg-[#0D9488] px-3 py-1 text-xs font-semibold text-white">
                    {faixa}
                  </span>
                  <h3 className="font-semibold text-white">{titulo}</h3>
                  <p className="text-sm text-[#CCFBF1]">{descricao}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/jogar"
                className="inline-flex items-center gap-2 rounded-full border border-[#0D9488] px-8 py-4 text-lg font-semibold text-[#2DD4BF] hover:bg-[#0D9488] hover:text-white transition-colors"
              >
                Escolha seu ano e comece →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Bloco 4: FAQ ─────────────────────────────────────── */}
        <section className="px-4 py-16 max-w-3xl mx-auto w-full">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0C1A19] text-center mb-10">
            Perguntas frequentes
          </h2>
          <dl className="flex flex-col gap-6">
            {FAQ.map(({ pergunta, resposta }) => (
              <div
                key={pergunta}
                className="rounded-2xl border border-[#CCFBF1] bg-white p-6"
              >
                <dt className="font-semibold text-[#0C1A19] mb-2">{pergunta}</dt>
                <dd className="text-[#475569]">{resposta}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Bloco 5: Footer ──────────────────────────────────── */}
        <footer className="mt-auto border-t border-[#CCFBF1] px-4 py-8">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#64748B]">
            <div className="flex gap-6">
              <Link
                href="/jogar"
                className="hover:text-[#0D9488] transition-colors"
              >
                Começar
              </Link>
              <span>Política de Privacidade</span>
            </div>
            <p>© 2026 Continha Mágica — matemática que encanta</p>
          </div>
        </footer>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: build concluído sem erros de TypeScript ou de módulo.

- [ ] **Step 3: Verificar lint**

```bash
npm run lint
```

Esperado: sem erros ou warnings.

- [ ] **Step 4: Verificar SSR da landing page em dev**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000 | grep -o "ensino fundamental"
kill %1
```

Esperado: imprime `ensino fundamental` — confirma que o conteúdo está no HTML servido pelo servidor (não apenas no JS do cliente).

- [ ] **Step 5: Verificar JSON-LD na página**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000 | grep -o "application/ld+json"
kill %1
```

Esperado: imprime `application/ld+json` — confirma que o script de dados estruturados está no HTML.

- [ ] **Step 6: Rodar testes unitários e de componentes**

```bash
npm run test
```

Esperado: todos os testes passam. Se algum teste de componente ou de API falhar por mudança de rota, verifique se referencia `/` esperando o quiz — nesse caso, atualize para `/jogar`.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add SSR landing page at / with JSON-LD structured data (WebApplication + FAQPage)"
```

---

## Verificação Final

Após completar as 4 tasks:

```bash
# Build limpo
npm run build

# Lint limpo  
npm run lint

# Testes unitários
npm run test

# Testes E2E (requer navegador Chromium instalado)
npm run test:e2e
```

Para validar SEO após deploy:
- Acesse `https://continhamagica.vercel.app/robots.txt` — deve conter `Disallow: /api/` e URL do sitemap
- Acesse `https://continhamagica.vercel.app/sitemap.xml` — deve listar `/` e `/jogar`
- Cole a URL em [https://validator.schema.org](https://validator.schema.org) — deve validar `WebApplication` e `FAQPage` sem erros
- Lighthouse em `/` (DevTools → Lighthouse → SEO) — score ≥ 90
