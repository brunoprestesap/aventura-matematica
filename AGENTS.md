<!-- BEGIN:nextjs-agent-rules -->
# Aviso importante sobre o Next.js

Este projeto usa **Next.js 16.2.9** (App Router). Antes de escrever qualquer código, observe as mudanças que afetam este projeto:

- `params` e `searchParams` em Server Components agora são `Promise`s — sempre use `await params` / `await searchParams` e desestruture os valores depois.
- `headers()` e `cookies()` também são funções assíncronas — use `await headers()` e `await cookies()`.
- `fetch` não usa mais `getStaticProps` / `getServerSideProps`. Controle de cache via `{ cache: 'force-cache' }` ou `{ next: { revalidate: N } }`.
- `use client` é obrigatório para qualquer componente que use hooks, `localStorage`, `window`, `navigator` ou eventos do DOM.
- Não há `pages/` neste projeto — todas as rotas ficam em `app/`.

> Dica: se encontrar avisos de depreciação ao rodar `npm run build`, trate-os antes de considerar a alteração finalizada.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Continha Mágica

Arquivo de referência para agentes de IA que forem trabalhar neste projeto. Leia este documento antes de fazer alterações.

---

## Visão geral do projeto

**Continha Mágica** é um site de atividades de matemática para estudantes do ensino fundamental (1º ao 9º ano). A cada carregamento da página são geradas 20 questões aleatórias, distribuídas entre seis categorias:

- Adição
- Subtração
- Multiplicação
- Divisão
- Sequência numérica
- Problemas contextualizados simples

O aluno informa seu nome, seleciona o ano escolar, responde as questões e clica em **Verificar respostas** para receber feedback visual imediato. A aplicação também mantém um histórico local de atividades, pode ser instalada como PWA e possui um sistema de ligas semanais para usuários autenticados.

O idioma do projeto é o **português brasileiro (pt-BR)**, tanto na interface quanto nos comentários e documentação.

Além do projeto Next.js na raiz, existe o diretório `continha-magica-app/`, que contém um **shell nativo** (Expo + React Native + WebView) para empacotar o PWA nas lojas de aplicativos.

---

## Identidade visual

| Elemento | Valor |
|---|---|
| Nome do produto | Continha Mágica |
| Mascote | Pixel (gato teal) |
| Slogan | matemática que encanta |
| Tipografia | Space Grotesk (Google Fonts) |
| Cor primária de marca | `#0D9488` (Teal) |
| Cor de destaque / Pixel | `#2DD4BF` (Teal claro) |
| Componente mascote | `components/Pixel.tsx` — props: pose, size, animated, className |
| Poses disponíveis | idle (neutro), correct (acerto), wrong (erro), thinking (digitando) |
| Cor de fundo escuro | `#0C1A19` (Floresta) |
| Cor de fundo suave | `#CCFBF1` (Névoa teal) |
| Cor de fundo da página | `#F8FFFE` |
| XP / estrelas | `#EAB308` (Mel) |
| Badge XP | `#FEF9C3` (Mel suave) |
| Acerto | `#10B981` |
| Erro | `#EF4444` |

Tom de voz: encantador, encorajador, nunca punitivo. Frases de feedback
usam metáforas de magia e aventura. O mascote Pixel reage a acertos,
erros e combos com frases específicas definidas em `components/Celebration.tsx`
e nos feedbacks inline do `QuizPage.tsx`.

---

## Stack tecnológica

### Projeto raiz (web / PWA)

| Tecnologia | Versão / Observação |
|------------|---------------------|
| Next.js | 16.2.9 (App Router) |
| React | 19.2.4 |
| TypeScript | 5 (strict habilitado) |
| Tailwind CSS | 4 |
| shadcn/ui | v4 (`style: base-nova`) |
| @base-ui/react | Base dos componentes de UI em `components/ui/` |
| Lucide React | Ícones |
| canvas-confetti | Animação de celebração |
| ESLint | 9 + `eslint-config-next` |
| NextAuth v5 (beta) | Auth com Google OAuth |
| Prisma + @prisma/client | ORM para PostgreSQL |
| @auth/prisma-adapter | Adapter NextAuth ↔ Prisma |
| Vitest | Testes unitários, componentes e API routes |
| @testing-library/react + jsdom | Testes de componentes |
| node-mocks-http | Simulação de requisições Next.js |
| @playwright/test | Testes end-to-end |

### Configurações relevantes

- `next.config.ts`: configuração básica, sem opções extras no momento.
- `tsconfig.json`: paths configurados com `@/*` apontando para `./*`. **Importante:** a chave `exclude` atualmente remove `tests`, `**/*.test.ts`, `**/*.test.tsx` e `**/*.spec.ts`, o que impede a resolução de aliases nos testes (ver seção "Problemas conhecidos").
- `postcss.config.mjs`: usa o plugin `@tailwindcss/postcss`.
- `components.json`: configuração do shadcn/ui com aliases `@/components`, `@/lib/utils`, etc.
- `vitest.config.ts`: configuração do Vitest com ambiente `jsdom`, setup em `vitest.setup.ts`, cobertura mínima e `fileParallelism: false` para testes de API.
- `playwright.config.ts`: testes E2E com Chromium, servidor de desenvolvimento iniciado automaticamente.

### App nativo (`continha-magica-app/`)

| Tecnologia | Versão / Observação |
|------------|---------------------|
| Expo SDK | 55 |
| React Native | 0.83.6 |
| React | 19.2.7 |
| Expo Router | `~55.0.0` (versionado junto com o SDK 55; pasta `src/app/`) |
| react-native-webview | 13.16.0 |
| expo-secure-store | Persistência nativa sincronizada com localStorage |
| @react-native-community/netinfo | Detecção de conectividade |

---

## Arquitetura e organização de código

```
app/                          # App Router do Next.js
  layout.tsx                  # Layout raiz, metadados PWA, SessionProvider, registro do SW
  page.tsx                    # Página inicial; renderiza <QuizPageLoader />
  globals.css                 # Configuração do Tailwind v4, tema e animações
  api/
    auth/[...nextauth]/route.ts  # Handlers do NextAuth
    session/route.ts             # Registra sessão de quiz e acumula XP na liga
    historico/route.ts           # Retorna o histórico de sessões do usuário autenticado (nuvem)
    liga/semana/route.ts         # Retorna placar da liga semanal
    cron/liga/route.ts           # Processa promoção/rebaixamento (protegido por CRON_SECRET)
    native-auth/start/route.ts       # Inicia o login nativo (PKCE) no browser do sistema
    native-auth/complete/route.ts    # Callback do OAuth; emite código de uso único
    native-auth/exchange/route.ts    # Troca código + verifier por sessão NextAuth

components/                   # Componentes React
  ui/                         # Componentes do shadcn/ui (button, input, badge, card)
  QuizPage.tsx                # Página principal do quiz (estado, lógica, persistência)
  QuizPageLoader.tsx          # Carrega QuizPage sem SSR (dynamic import ssr: false)
  QuestionCard.tsx            # Card individual de questão
  QuestionCardItem.tsx        # Wrapper memoizado que liga QuestionCard à lista
  GradeSelector.tsx           # Tela de seleção do ano escolar
  NamePrompt.tsx              # Tela inicial para coletar o nome do usuário
  HistoryPanel.tsx            # Modal de histórico; mescla histórico local com o da nuvem (lazy) para autenticados
  LeaguePanel.tsx             # Painel da liga semanal (login, placar, zonas)
  Celebration.tsx             # Animação de confete para 18+ acertos
  Pixel.tsx                   # Mascote SVG com 4 poses: idle | correct | wrong | thinking
  InstallPrompt.tsx           # Modal de orientação para instalação do PWA

lib/                          # Utilitários e lógica de negócio
  questions.ts                # Geração de questões, configurações por ano, tipos
  history.ts                  # Persistência e hook do histórico no localStorage; mergeHistories/makeId
  user.ts                     # Persistência e hook do nome do usuário no localStorage
  prisma.ts                   # Cliente Prisma singleton
  league.ts                   # Constantes e regras das ligas + cálculo de XP
  migrate.ts                  # Migração one-shot do rebrand (chaves antigas → continha-magica-*)
  onboarding.ts               # Flag e hook do coachmark de primeiro uso
  auth-client.ts              # Helpers de autenticação no cliente
  native-auth.ts              # Handoff PKCE do login nativo (challenge, code de uso único)
  utils.ts                    # Função `cn` para mesclar classes Tailwind

auth.ts                       # Configuração do NextAuth v5 (Google OAuth + PrismaAdapter)

prisma/
  schema.prisma               # Schema do PostgreSQL (produção/desenvolvimento)
  schema.test.prisma          # Schema SQLite para testes de API routes
  test.db                     # Banco SQLite de testes (gerado, não commitado)

assets/                       # Arquivos-fonte dos ícones e splash (SVGs)
  icon-source.svg             # Ícone mestre com fundo #0C1A19
  icon-source-adaptive.svg    # Ícone mestre sem fundo (Android adaptive)
  splash-source.svg           # Splash screen mestre (1284×2778)

public/                       # Arquivos estáticos
  manifest.json               # Manifesto do PWA
  sw.js                       # Service worker para cache offline
  icons/                      # Ícones do PWA (192x192, 512x512, maskable 512x512)
  apple-touch-icon.png

scripts/                      # Scripts auxiliares (não fazem parte do build)
  test-questions.ts           # Validação da geração de questões por ano
  generate-icons.ts           # Gera PNGs de ícones/splash a partir dos SVGs-fonte

tests/                        # Suíte de testes
  unit/lib/                   # Testes unitários de lógica pura
  components/                 # Testes de componentes React
  api/                        # Testes de integração das API routes
  e2e/                        # Testes end-to-end com Playwright

continha-magica-app/          # Shell nativo do app (Expo + WebView)
  assets/
    icon.png                  # Ícone do app (1024×1024)
    adaptive-icon.png         # Foreground do ícone adaptativo Android
    splash.png                # Splash screen (1284×2778)
  src/
    app/                      # Rotas do Expo Router
    components/               # WebViewBridge, LoadingScreen, ErrorScreen, OfflineBanner
    hooks/                    # useNetworkStatus, useWebViewStorage
  app.json                    # Configuração do Expo
  eas.json                    # Perfis de build e submit do EAS
  package.json                # Dependências do app nativo
  AGENTS.md                   # Regras específicas do app nativo
```

### Fluxo da aplicação web

1. `app/page.tsx` renderiza `QuizPageLoader`.
2. `QuizPageLoader` importa dinamicamente `QuizPage` com `ssr: false`, garantindo que toda a lógica do quiz rode apenas no cliente (necessário por causa do `localStorage`).
3. `QuizPage` gerencia estados de:
   - Nome do usuário (`lib/user.ts`)
   - Ano selecionado (persistido em `localStorage` com chave `continha-magica-grade`)
   - Respostas, submissão e pontuação
   - Histórico de atividades (`lib/history.ts`)
4. Questões são geradas puramente no cliente por `generateQuestions(20, grade)` em `lib/questions.ts`.
5. Ao submeter, o resultado é enviado em background para `/api/session`, que registra a sessão e acumula XP na liga semanal para usuários autenticados.

### Fluxo do app nativo

1. O app nativo carrega o PWA publicado em `https://continhamagica.vercel.app` dentro de um `WebView`.
2. O `WebViewBridge` sincroniza `SecureStore` (nativo) com `localStorage` do PWA para as chaves `continha-magica-grade`, `continha-magica-history` e `continha-magica-user-name`.
3. O app detecta conectividade (`useNetworkStatus`) e exibe banner offline quando necessário.
4. O botão físico de voltar no Android é tratado no `_layout.tsx`.

---

## Geração de questões (`lib/questions.ts`)

### Função principal

```ts
export function generateQuestions(count = 20, grade: Grade = 4): Question[]
```

- `count`: número de questões a gerar (padrão: 20).
- `grade`: ano escolar de 1 a 9 (tipo `Grade = 1 | 2 | ... | 9`).
- Retorna um array embaralhado de `Question[]`.

### Tipos

```ts
export type QuestionCategory =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "sequence"
  | "word";

export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Question {
  id: string;
  category: QuestionCategory;
  statement: string;   // Enunciado exibido ao aluno
  answer: number;      // Resposta numérica correta
  explanation: string; // Explicação mostrada após a submissão
  displayAnswer?: string; // Sequência completa, usada apenas em questões de sequência
}
```

### Regras de negócio invariáveis

Ao alterar `lib/questions.ts`, **todas** estas regras devem continuar verdadeiras:

- **Divisões**: o resultado é sempre inteiro, sem resto. O dividendo é calculado como `divisor × answer`.
- **Subtrações**: o resultado é sempre maior ou igual a zero. O minuendo é sempre maior que o subtraendo.
- **Sequências numéricas**: progressão aritmética de 6 termos. A razão é sorteada dentro dos limites de `GradeConfig` (por exemplo, 1–3 no 1º ano; 5–50 no 9º ano). Um dos termos (índice 2–4) é ocultado e deve ser completado.
- **Problemas contextualizados**: sorteio aleatório entre 10 nomes (`WORD_NAMES`) e 10 objetos (`WORD_OBJECTS`), com operações de adição ou subtração. As combinações garantem variedade suficiente para não repetir o mesmo enunciado.
- **Inputs do quiz**: aceitam apenas inteiros não-negativos. O `QuizPage` sanitiza com `value.replace(/[^0-9]/g, "")` e o `Input` usa `type="number"`, `min={0}` e `pattern="[0-9]*"`.

### Escalonamento de dificuldade

A dificuldade é controlada por `GRADE_CONFIG: Record<Grade, GradeConfig>`. Cada ano define os limites de operandos, divisores, razões de sequência e valores de problemas. Em geral:

- Anos iniciais (1º–3º): números pequenos, tabuada básica, sequências curtas.
- Anos intermediários (4º–5º): números até 1000 e 9999, multiplicação com um fator de dois dígitos.
- Anos finais (6º–9º): operandos maiores, multiplicação de dois números de dois/três dígitos, divisões com resultados maiores e sequências mais amplas.

> **Importante:** antes de alterar `GRADE_CONFIG` ou os geradores, rode `npx tsx scripts/test-questions.ts` **e** `npm run test` e confirme que os limites e regras acima permanecem válidos para todos os anos.

---

## Comandos de build, desenvolvimento e lint

Instale as dependências:

```bash
npm install
```

Servidor de desenvolvimento (porta padrão 3000):

```bash
npm run dev
```

Build de produção:

```bash
npm run build
```

Iniciar servidor de produção após o build:

```bash
npm start
```

Lint:

```bash
npm run lint
```

### Banco de dados local (desenvolvimento)

O projeto inclui um `docker-compose.yml` com PostgreSQL 16. Para subir o banco localmente:

```bash
docker compose up -d
```

Depois aplique o schema:

```bash
npm run db:push
```

O script usa `dotenv-cli` para carregar `.env.local` antes de invocar o Prisma. Certifique-se de que `DATABASE_URL` no `.env.local` aponte para `postgresql://aventura:aventura@localhost:5432/continha_magica?schema=public`.

Para abrir o Prisma Studio:

```bash
npm run db:studio
```

### Banco de dados de produção (Neon)

Em produção o banco é um **PostgreSQL serverless da Neon**, provisionado pela
**Vercel Marketplace** (`vercel integration add neon`). A integração injeta
automaticamente o `DATABASE_URL` (e variáveis `POSTGRES_*`/`PG*`) nos ambientes
da Vercel.

- O `DATABASE_URL` de produção aponta para o endpoint **pooled** do Neon (valor
  equivalente ao `POSTGRES_PRISMA_URL`, com `connect_timeout=15`). Usar o pooled
  evita o erro `prepared statement "s0" already exists` do Prisma em ambiente
  serverless. Se o erro voltar a aparecer, acrescente `&pgbouncer=true`.
- Para aplicar mudanças de schema no banco de produção, use a conexão **unpooled**
  (`DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING`), apropriada para DDL:
  `DATABASE_URL="<unpooled>" npx prisma db push`.
- Desenvolvimento e produção usam bancos **separados**: dev no Postgres local
  (docker), produção no Neon. Não aponte o `.env.local` de dev para o banco de
  produção.

### App nativo (`continha-magica-app/`)

```bash
cd continha-magica-app
npm install

# Verificar saúde do projeto
npm run doctor

# Iniciar o Metro (requer development build)
npm start

# Builds
npm run build:dev:android
npm run build:dev:ios
npm run build:preview:android
npm run build:preview:ios
npm run build:prod:android
npm run build:prod:ios
```

No app nativo, prefira `npx expo install <pacote>` em vez de `npm install` direto.

---

## Testes

O projeto possui uma suíte de testes automatizados organizada em `tests/`:

```
tests/
  unit/          # Testes unitários de lógica pura
    lib/questions.test.ts
    lib/league.test.ts
    lib/history.test.ts
    lib/user.test.ts
    lib/utils.test.ts
    lib/onboarding.test.ts
    lib/auth-client.test.ts
  components/    # Testes de componentes React com Testing Library
    NamePrompt.test.tsx
    GradeSelector.test.tsx
    QuestionCard.test.tsx
    HistoryPanel.test.tsx
    LeaguePanel.test.tsx
    Pixel.test.tsx
    QuizPage.test.tsx
  api/           # Testes de integração das API routes
    session.test.ts
    historico.test.ts
    liga-semana.test.ts
    cron-liga.test.ts
    native-auth.test.ts
    helpers.ts     # Utilitários para criar requisições e resetar banco
  e2e/           # Testes end-to-end com Playwright
    quiz-flow.spec.ts
```

### Runners e ferramentas

- **Vitest** para testes unitários, de componentes e de integração.
- **@testing-library/react** + **jsdom** para componentes.
- **node-mocks-http** para simular requisições Next.js.
- **@playwright/test** para testes E2E.
- **Banco de testes SQLite** (`prisma/schema.test.prisma`) para testes de API routes.

### Scripts

```bash
# Todos os testes unitários, de componentes e de API
npm run test

# Modo watch
npm run test:watch

# Preparar banco de testes (rode ao alterar o schema)
npm run test:db:push

# Testes E2E
npm run test:e2e

# Testes E2E com interface
npm run test:e2e:ui

# Validação legada das questões
npx tsx scripts/test-questions.ts
```

### Cobertura mínima

- `lib/`: 80% linhas/funções/declarações, 70% branches.
- `app/api/`: 80% linhas/funções/declarações.

A cobertura é configurada em `vitest.config.ts`.

### Cuidados ao alterar código

- Ao modificar `lib/questions.ts`, rode `npx tsx scripts/test-questions.ts` **e** `npm run test`.
- Testes de API routes usam o banco SQLite; eles rodam em série (`fileParallelism: false`) para evitar conflitos de dados.
- Antes dos testes de API, rode `npm run test:db:push` (o `prisma/test.db` pode estar com 0 bytes até o primeiro push).
- Cobertura: `npx vitest run --coverage` (provider v8, pacote `@vitest/coverage-v8`). Thresholds: 80% lines/funcs/stmts, 70% branches.
- Não remova o `HISTORY_KEY`, `HISTORY_VERSION`, `USER_NAME_KEY` e `parseHistory` — eles são exportados para os testes.

---

## Estilo e convenções de código

- **TypeScript estrito**: `strict: true` está habilitado no `tsconfig.json`.
- **Componentes clientes**: quando usam hooks ou acessam `window`/`localStorage`, devem começar com `"use client"`.
- **SSR**: evite acessar `localStorage` ou `window` durante a renderização no servidor. O projeto usa `dynamic(..., { ssr: false })` e checagens `typeof window !== "undefined"`.
- **Tailwind**: as classes são mescladas com a função `cn` (`lib/utils.ts`).
- **shadcn/ui**: os componentes em `components/ui/` seguem o padrão base-nova e usam `@base-ui/react`.
- **Responsividade**: os componentes usam breakpoints `sm:`, `md:`, `lg:` e valores adaptados a telas pequenas (público infantil).
- **Acessibilidade**: inputs possuem `aria-label`, modais usam `role="dialog"` e `aria-modal="true"`, e animações respeitam `prefers-reduced-motion`.
- **Comentários**: prefira comentários em português, conforme o restante do código.

### Imports

Use os aliases configurados no `tsconfig.json`:

```tsx
import { Button } from "@/components/ui/button";
import { generateQuestions } from "@/lib/questions";
import { cn } from "@/lib/utils";
```

No app nativo, use os aliases configurados em `continha-magica-app/tsconfig.json`:

```tsx
import { WebViewBridge } from "@/components/WebViewBridge";
```

---

## PWA e Service Worker

- `public/manifest.json`: define nome, ícones, cores e comportamento `standalone`.
- `public/sw.js`: service worker simples que pré-cacheia `/` e `/manifest.json` e faz cache runtime de assets estáticos.
- `app/layout.tsx`: registra o service worker via `navigator.serviceWorker.register('/sw.js')`.
- `components/InstallPrompt.tsx`: exibe instruções de instalação para Android e iOS.
- `assets/icon-source.svg` e `assets/icon-source-adaptive.svg`: arquivos-fonte SVG dos ícones.
- `scripts/generate-icons.ts`: gera todos os PNGs (PWA, Expo e splash) a partir dos SVGs-fonte via `sharp`.

> ⚠️ **Ao atualizar o projeto:** em qualquer deploy que altere assets, siga estes passos obrigatórios:
>
> 1. Incremente a constante `CACHE_NAME` em `public/sw.js` (ex: `continha-magica-v2` → `continha-magica-v3`) para invalidar o cache antigo.
> 2. Valide `public/manifest.json` com um linter de JSON antes do commit.
> 3. Verifique que `public/icons/` contém os três tamanhos: `icon-192x192.png`, `icon-512x512.png` e `maskable-icon-512x512.png`.
> 4. Regenere os PNGs com `npx tsx scripts/generate-icons.ts` sempre que os SVGs-fonte forem alterados.

---

## Persistência local

### Web / PWA

A aplicação armazena dados no `localStorage` do navegador com as seguintes chaves:

| Chave | Propósito | Gerenciado em |
|-------|-----------|---------------|
| `continha-magica-grade` | Ano escolar selecionado | `components/QuizPage.tsx` |
| `continha-magica-history` | Histórico de atividades | `lib/history.ts` |
| `continha-magica-user-name` | Nome do usuário | `lib/user.ts` |
| `continha-magica-migrated-v1` | Controle de migração do rebrand | `lib/migrate.ts` |
| `continha-magica-onboarding-v1` | Flag "coachmark de primeiro uso visto" | `lib/onboarding.ts` |

Os hooks `useStoredGrade`, `useHistory`, `useUserName` e `useCoachmarkPending` usam `useSyncExternalStore` para reagir a mudanças no `localStorage`.

### App nativo

O app sincroniza as mesmas três chaves entre `expo-secure-store` (nativo) e `localStorage` do WebView, principalmente para contornar a limpeza de dados do WKWebView no iOS entre sessões.

---

## Sistema de ligas semanais

O backend existe exclusivamente para suportar autenticação e ligas semanais. A lógica do quiz continua 100% client-side.

### Modelo de dados (Prisma)

- `User`: usuário autenticado via Google. Campos extras: `currentLeague` (liga atual, começa em `bronze`) e `grade` (ano escolar, sincronizado do cliente).
- `Account`, `Session`, `VerificationToken`: tabelas obrigatórias do `@auth/prisma-adapter`.
- `LeagueTier`: enum com 10 ligas (`bronze`, `prata`, `ouro`, `safira`, `rubi`, `esmeralda`, `ametista`, `perola`, `obsidiana`, `diamante`).
- `LeagueGroup`: grupo semanal de usuários competindo entre si, identificado por `tier`, `grade` e `weekStart`.
- `LeagueMember`: membro de um grupo em uma semana específica, com `xpWeekly`, `finalRank`, `promoted` e `demoted`.
- `WeeklyScore`: registro individual de cada sessão de quiz para auditoria. Inclui `clientId` (id estável gerado no cliente via `makeId`) para deduplicar o histórico da nuvem com o local.
- `NativeAuthCode`: código de uso único do handoff PKCE do login nativo (`codeHash`, `challenge`, `expires`, `consumed`). Nunca guarda o code puro.

### API routes

- `POST /api/session`: recebe `grade`, `correct`, `answers` (array de 20 booleanos) e um `clientId` opcional. Recalcula os acertos e o XP no servidor, registra a sessão (com `clientId` para dedup) e atualiza o grupo semanal do usuário.
- `GET /api/historico`: retorna as últimas 50 sessões (`WeeklyScore`) do usuário autenticado, usadas pelo `HistoryPanel` para mesclar o histórico da nuvem com o local.
- `GET /api/liga/semana`: retorna o placar do grupo atual do usuário autenticado, com zonas de promoção (`promotion`), segurança (`safe`) e rebaixamento (`demotion`).
- `GET /api/cron/liga`: endpoint protegido por `CRON_SECRET` (header `Authorization: Bearer <CRON_SECRET>`). Processa os grupos da semana anterior, define `finalRank`, `promoted`, `demoted` e atualiza `currentLeague` dos usuários.
- `GET /api/native-auth/start`: inicia o login nativo (browser do sistema), grava o challenge PKCE e o deep link em cookies httpOnly.
- `GET /api/native-auth/complete`: callback do OAuth (browser do sistema); emite um código de uso único e redireciona ao deep link `continhamagica://auth-callback`.
- `POST /api/native-auth/exchange`: troca o código + verifier (PKCE) por uma sessão NextAuth (cria `Session`, seta o cookie). Chamado de dentro do WebView.

> O cron é **idempotente**: a nova liga vem de `leagueUp`/`leagueDown(group.tier)` (tier imutável) e do rank (o XP da semana encerrada não muda mais), então rodá-lo duas vezes produz o mesmo resultado. **Não** baseie a promoção em `user.currentLeague`. A zona de rebaixamento só existe se `totalMembers > promotionSlots + demotionSlots` — a mesma regra (`hasSafeZone`) deve valer no cron e no `GET /api/liga/semana`.

### Cálculo de XP (`lib/league.ts`)

- Base: 10 XP por acerto.
- Combo: +5 XP para cada acerto a partir do 3º consecutivo.
- Sessão completa: +20 XP ao responder todas as 20 questões.

> **Importante:** o cálculo de XP sempre ocorre no servidor. Nunca confie no valor enviado pelo cliente.

---

## Deploy

### Web / PWA

O projeto está configurado para deploy na **Vercel** (projeto `aventura-matematica`, servido em `https://continhamagica.vercel.app`). O arquivo `.vercel/project.json` contém as informações do projeto e não deve ser commitado em repositórios públicos.

O build inclui API routes serverless e depende do PostgreSQL para o sistema de ligas. O banco de produção é o **Neon**, provisionado via Vercel Marketplace (ver "Banco de dados de produção (Neon)"). O deploy ocorre automaticamente a cada push na branch `main` (integração GitHub ↔ Vercel); também pode ser disparado manualmente com `vercel --prod`. Não há pipelines de CI/CD próprias no repositório (nenhuma pasta `.github/workflows`, `.gitlab-ci.yml`, etc.).

> ⚠️ **`prisma generate` faz parte do build.** O script `build` é
> `prisma generate && next build` — **não remova o `prisma generate`**. O
> Vercel restaura `node_modules` do cache e o `npm install` frequentemente
> resolve como "up to date", então o Prisma Client **não** seria regenerado
> sozinho. Sem o `prisma generate` explícito, qualquer **novo model ou campo**
> no `schema.prisma` quebra o deploy com erros de type-check do tipo
> `Property '<model>' does not exist on type 'PrismaClient'`, mesmo que o build
> passe localmente (onde o client já está atualizado). Esse erro derrubou o
> primeiro deploy que adicionou o model `NativeAuthCode`.
>
> Ao alterar o `schema.prisma`, aplique a mudança no banco de produção (Neon)
> com a conexão **unpooled** antes/junto do deploy — ver "Banco de dados de
> produção (Neon)".

### App nativo

O app nativo usa **EAS (Expo Application Services)**. As configurações de build e submit estão em `continha-magica-app/eas.json`. O `projectId` do EAS está configurado em `continha-magica-app/app.json`.

O app carrega a web app da URL definida em `extra.webAppUrl` no `app.json` (`https://continhamagica.vercel.app`). Ao alterar o PWA, o app nativo reflete as mudanças automaticamente (exceto atualizações nativas que exijam novo build).

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL. Em dev, Postgres local (docker); em produção, conexão pooled do Neon (provisionada pela integração Vercel). |
| `AUTH_SECRET` | Segredo do NextAuth (gere com `openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Client ID do Google OAuth (Google Cloud Console) |
| `AUTH_GOOGLE_SECRET` | Client Secret do Google OAuth |
| `CRON_SECRET` | Segredo para autenticar chamadas do Vercel Cron ao endpoint `/api/cron/liga` |

Todas as variáveis devem estar em `.env.local` (desenvolvimento) e no painel da Vercel (produção). Nenhuma delas deve ser commitada no repositório. Um template está disponível em `env.example`.

> O `DATABASE_URL` (e as variáveis `POSTGRES_*`/`PG*`) em produção são
> **provisionados automaticamente pela integração Neon** na Vercel — não os
> preencha manualmente. Atenção: `vercel env pull` sobrescreve o `.env.local`
> e pode remover variáveis que só existem em alguns ambientes (ex.: `AUTH_*`
> definidas só em Production); confira o arquivo após puxar.

Os testes carregam `env.test` via `vitest.setup.ts`.

---

## Considerações de segurança

- **Autenticação via Google OAuth**: gerenciada pelo NextAuth v5. Nunca exponha `AUTH_SECRET`, `AUTH_GOOGLE_ID` ou `AUTH_GOOGLE_SECRET`.
- **Sanitização de input**: o `QuizPage` limita as respostas a dígitos numéricos (`value.replace(/[^0-9]/g, "")`).
- **Service worker**: faz cache de recursos locais e de assets externos com extensões conhecidas. Não execute código arbitrário no SW.
- **localStorage / SecureStore**: todas as operações estão envolvidas em `try/catch` para evitar crashes em contextos privados ou com storage cheio.
- **Variáveis de ambiente sensíveis**: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` e `CRON_SECRET` devem estar em `.env.local` e no painel da Vercel, nunca commitadas.
- **Endpoint de cron**: `/api/cron/liga` exige o header `Authorization: Bearer ${CRON_SECRET}`. Não remova essa proteção.
- **Cálculo de XP**: sempre realizado no servidor (`lib/league.ts`). Nunca aceite XP vindo do cliente.
- **Login nativo (handoff PKCE):** o app nativo não autentica via WebView (o Google bloqueia OAuth embutido). O OAuth roda no browser do sistema e a sessão é transferida ao WebView por um código de uso único protegido por PKCE (`lib/native-auth.ts`). O `code_verifier` nunca sai do app; o código é single-use, expira em 60s e é consumido atomicamente.

---

## Decisões de arquitetura

As escolhas abaixo são intencionais. Não as reverta sem discutir com o mantenedor:

- **Backend ativo (sistema de ligas):** o projeto possui backend PostgreSQL + Prisma para o sistema de ligas semanais. A lógica de quiz continua 100% client-side. O backend existe exclusivamente para: autenticação (NextAuth v5 + Google), registro de sessões (`POST /api/session`), placar semanal (`GET /api/liga/semana`) e cron de promoção/rebaixamento (`GET /api/cron/liga`).
- **SSR desabilitado via `ssr: false`**: o `QuizPageLoader` usa `dynamic(..., { ssr: false })` propositalmente. Não remova essa configuração — ela é necessária para o acesso ao `localStorage` funcionar corretamente.
- **Geração de questões no cliente**: `generateQuestions` roda no cliente a cada carregamento. Isso é intencional para garantir questões sempre novas sem necessidade de API.
- **App nativo como shell de WebView**: o diretório `continha-magica-app/` não reescreve a lógica do PWA. Ele apenas empacota a web app publicada em um WebView nativo.

---

## Restrições

- **NÃO** adicione dependências `npm` sem aprovação explícita do mantenedor — o bundle é intencionalmente leve.
- **NÃO** acesse `localStorage` diretamente nos componentes — use exclusivamente os hooks `useStoredGrade` (`QuizPage.tsx`), `useHistory` (`lib/history.ts`) e `useUserName` (`lib/user.ts`).
- **NÃO** remova o `ssr: false` do `QuizPageLoader`.
- **NÃO** traduza a interface — o idioma do projeto é pt-BR e deve permanecer assim.
- **NÃO** crie novas chaves de `localStorage` sem adicionar à tabela na seção "Persistência local" e sem envolver em `try/catch`.
- **NÃO** adicione novas API routes sem discutir com o mantenedor. (As rotas `/api/native-auth/*` foram adicionadas com aprovação para o login nativo.)
- **NÃO** calcule XP no cliente — o cálculo é sempre feito em `lib/league.ts` no servidor.
- **NÃO** exponha o `CRON_SECRET` ou `AUTH_SECRET` em código ou logs.
- **NÃO** altere a lógica de geração de questões em `lib/questions.ts` sem rodar `npx tsx scripts/test-questions.ts` e confirmar que os resultados são válidos para todos os anos (1º ao 9º).
- **NÃO** modifique o PWA a partir do diretório `continha-magica-app/`. O projeto Next.js fica na raiz.
- **NÃO** use `SafeAreaView` do `react-native` no app nativo. Use `useSafeAreaInsets` de `react-native-safe-area-context`.
- **NÃO** teste o app nativo no Expo Go. `react-native-webview` exige Development Build.
- **NÃO** adicione `newArchEnabled` ao `app.json` do app nativo. A Legacy Architecture foi removida no React Native 0.82.
- **NÃO** use o nome "Aventura Matemática" em nenhum arquivo novo — o nome
  do produto é "Continha Mágica" desde o rebrand de junho/2026.
- **NÃO** use cores da paleta roxa anterior (`#C084FC`, `#8B5CF6`, `#1A1A2E`)
  — a paleta definitiva é Teal & Mel desde junho/2026.

---

## Problemas conhecidos e pontos de atenção

1. **Resolução de aliases nos testes**: embora o `tsconfig.json` exclua `tests`/`*.test.*`, os testes **rodam normalmente** — o `vitest.config.ts` resolve `@/*` via `resolve.alias` explícito + `vite-tsconfig-paths`. O plugin emite um aviso de depreciação inofensivo. Não tente "consertar" isso.
2. **Lint limpo**: `npm run lint` passa sem erros.
3. **Build limpo**: `npm run build` passa sem erros.
4. **Geração de IDs**: `makeId()` usa `Math.random()`, o que é aceitável para IDs locais, mas não é criptograficamente seguro.
5. **Service worker**: a estratégia de cache é simples. Em novas versões, lembre-se de atualizar a constante `CACHE_NAME` em `public/sw.js` para invalidar caches antigos.
6. **Ícones PWA**: a pasta `public/icons/` deve conter os tamanhos referenciados no `manifest.json` (`192x192`, `512x512` e máscara `maskable-icon-512x512`).
7. **App nativo**: o `projectId` do EAS em `app.json` já está configurado. Sempre valide com `npx expo-doctor` antes de considerar uma alteração finalizada.
8. **Vercel CLI (gotchas)**: a CLI instalada (50.x) está desatualizada. `vercel env rm <NOME> production` remove a variável de **todos** os ambientes; `vercel env add <NOME> preview` exige a branch como 3º argumento (o caminho "todas as branches" não-interativo falha nesta versão); `vercel env pull` **sobrescreve** `.env.local` e pode apagar variáveis que só existem em alguns ambientes (ex.: `AUTH_*` só em Production). Para Preview, prefira o painel da Vercel.

---

## Links úteis

- Repositório local: `/Users/brunoprestes/projects/aventura-matematica`
- Documentação do Next.js 16: `node_modules/next/dist/docs/`
- README para usuários humanos: `README.md`
- Regras específicas do app nativo: `continha-magica-app/AGENTS.md`
