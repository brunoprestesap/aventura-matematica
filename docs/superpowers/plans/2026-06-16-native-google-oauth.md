# Login Google (OAuth) no App Nativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir login Google no app nativo (Expo/WebView) sem cair no bloqueio de WebView do Google, estabelecendo uma sessão NextAuth válida dentro do WebView via token-handoff PKCE.

**Architecture:** O OAuth roda no **browser do sistema** (`expo-web-browser`), onde o Google permite o fluxo. Ao concluir, o backend emite um **código de uso único** (protegido por PKCE) entregue ao app por **deep link** (`continhamagica://auth-callback`). O app injeta o código + `code_verifier` no WebView, que chama `POST /api/native-auth/exchange`. Esse endpoint valida o PKCE, cria uma `Session` (NextAuth usa estratégia de sessão em banco) e responde com `Set-Cookie` da sessão — same-origin, o cookie gruda no WebView e o usuário fica logado.

**Tech Stack:** Next.js 16 (App Router) + NextAuth v5 (PrismaAdapter, DB sessions) + Prisma/Postgres; Expo SDK 55 + react-native-webview; `expo-web-browser`, `expo-crypto`, `expo-linking`. Testes: Vitest + SQLite (`prisma/schema.test.prisma`).

**Pré-requisitos / decisões já tomadas:**
- Mantenedor aprovou **novas API routes** (`/api/native-auth/*`) e **novas deps nativas** — isso supera a restrição genérica do AGENTS.md para este escopo.
- Google Cloud Console: adicionar o redirect do NextAuth normalmente já cobre o fluxo (o OAuth roda em `https://continhamagica.vercel.app`, não muda). Nenhum novo client OAuth é necessário.

**Riscos conhecidos (verificar durante execução):**
- **Persistência do cookie no iOS:** o WKWebView pode limpar cookies entre sessões (mesmo motivo do bridge de localStorage). `sharedCookiesEnabled={true}` (já ativo) sincroniza com `NSHTTPCookieStorage`, que persiste. Tarefa 12 verifica isso após reinício do app. Se falhar, follow-up: persistir o `sessionToken` no SecureStore e re-setar o cookie nativamente com `@react-native-cookies/cookies` (cookie é httpOnly, não dá para setar via `document.cookie`).
- **Nome do cookie:** Auth.js usa `__Secure-authjs.session-token` em HTTPS e `authjs.session-token` fora. `getSessionCookieName()` centraliza isso para os dois lados baterem.

---

## File Structure

**Backend (raiz do repo):**
- `lib/native-auth.ts` — *Criar.* Lógica testável: hash PKCE, emitir código, consumir código, criar sessão, nome do cookie.
- `prisma/schema.prisma` — *Modificar.* Adicionar model `NativeAuthCode`.
- `prisma/schema.test.prisma` — *Modificar.* Mesmo model (SQLite).
- `app/api/native-auth/exchange/route.ts` — *Criar.* `POST`: valida PKCE, cria sessão, seta cookie. (Núcleo de segurança — coberto por testes.)
- `app/api/native-auth/start/route.ts` — *Criar.* `GET`: valida `challenge`/`redirect`, grava em cookies httpOnly, 302 → `/native-auth/continue`.
- `app/native-auth/continue/page.tsx` — *Criar.* Server Component que renderiza o client de auto-login.
- `app/native-auth/continue/AutoStartLogin.tsx` — *Criar.* Client Component: `signIn("google", { callbackUrl: "/api/native-auth/complete" })` no mount.
- `app/api/native-auth/complete/route.ts` — *Criar.* `GET`: lê sessão + cookies PKCE, emite código, 302 → deep link com `?code=`.
- `tests/api/native-auth.test.ts` — *Criar.* Testes do `exchange` + `lib/native-auth`.

**PWA (raiz, dentro do WebView):**
- `components/LeaguePanel.tsx` — *Modificar.* Quando `window.__NATIVE_APP__`, login dispara `postMessage({type:"NATIVE_LOGIN"})` em vez de `signIn`.
- `types/global.d.ts` — *Criar (se não existir).* Tipa `window.__NATIVE_APP__`.

**App nativo (`continha-magica-app/`):**
- `src/hooks/useGoogleAuth.ts` — *Criar.* `loginWithGoogle()`: gera verifier/challenge, abre browser, retorna `{code, verifier}`.
- `src/components/WebViewBridge.tsx` — *Modificar.* Trata `NATIVE_LOGIN`: chama `loginWithGoogle`, injeta `fetch(exchange)` + reload.
- `continha-magica-app/package.json` — *Modificar (via `expo install`).* `expo-web-browser`, `expo-crypto`.

---

## Task 1: Model `NativeAuthCode` no schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.test.prisma`

- [ ] **Step 1: Adicionar o model em `prisma/schema.prisma`** (após o model `VerificationToken`)

```prisma
// Código de uso único para handoff de login do app nativo (PKCE).
// Emitido após OAuth no browser do sistema, trocado por uma sessão no WebView.
model NativeAuthCode {
  id        String   @id @default(cuid())
  codeHash  String   @unique // sha256(code) em base64url — nunca guardamos o code puro
  challenge String   // code_challenge = base64url(sha256(code_verifier))
  userId    String
  expires   DateTime
  consumed  Boolean  @default(false)
  createdAt DateTime @default(now())

  @@map("native_auth_codes")
}
```

- [ ] **Step 2: Adicionar o MESMO model em `prisma/schema.test.prisma`**

Cole o bloco idêntico ao do Step 1 ao final do arquivo (antes de nenhum bloco — pode ir no fim).

- [ ] **Step 3: Aplicar no banco de testes e regerar o client**

Run:
```bash
npm run test:db:push
```
Expected: `Your database is now in sync with your Prisma schema` e o Prisma Client regenerado (passa a expor `prisma.nativeAuthCode`).

- [ ] **Step 4: Aplicar no banco de dev (Postgres docker)**

Run:
```bash
docker compose up -d
npm run db:push
```
Expected: schema sincronizado sem erro.

> Produção (Neon) é aplicada no deploy: `DATABASE_URL="<unpooled>" npx prisma db push`. Não rodar agora.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/schema.test.prisma
git commit -m "feat(db): adiciona model NativeAuthCode para handoff de login nativo"
```

---

## Task 2: `lib/native-auth.ts` — helpers PKCE e nome do cookie

**Files:**
- Create: `lib/native-auth.ts`
- Test: `tests/api/native-auth.test.ts`

- [ ] **Step 1: Escrever o teste falho** em `tests/api/native-auth.test.ts`

```ts
import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase, createUser } from "./helpers";
import {
  sha256Base64Url,
  getSessionCookieName,
  mintAuthCode,
  consumeAuthCode,
  createSessionForUser,
} from "@/lib/native-auth";

describe("lib/native-auth", () => {
  beforeEach(async () => {
    await resetDatabase();
    await prisma.nativeAuthCode.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sha256Base64Url é determinístico e em base64url", () => {
    const a = sha256Base64Url("abc");
    expect(a).toBe(sha256Base64Url("abc"));
    expect(a).not.toMatch(/[+/=]/); // base64url não tem +, /, =
  });

  it("getSessionCookieName usa nome não-secure fora de produção", () => {
    expect(getSessionCookieName()).toBe("authjs.session-token");
  });

  it("consumeAuthCode aceita code+verifier válidos uma única vez", async () => {
    const user = await createUser({ email: "a@example.com" });
    const verifier = "verifier-secreto-123";
    const challenge = sha256Base64Url(verifier);
    const code = await mintAuthCode(user.id, challenge);

    const userId = await consumeAuthCode(code, verifier);
    expect(userId).toBe(user.id);

    // segundo uso falha (single-use)
    expect(await consumeAuthCode(code, verifier)).toBeNull();
  });

  it("consumeAuthCode rejeita verifier errado (PKCE)", async () => {
    const user = await createUser({ email: "b@example.com" });
    const code = await mintAuthCode(user.id, sha256Base64Url("certo"));
    expect(await consumeAuthCode(code, "errado")).toBeNull();
  });

  it("consumeAuthCode rejeita código expirado", async () => {
    const user = await createUser({ email: "c@example.com" });
    const verifier = "v";
    const code = await mintAuthCode(user.id, sha256Base64Url(verifier));
    // força expiração
    await prisma.nativeAuthCode.updateMany({
      data: { expires: new Date(Date.now() - 1000) },
    });
    expect(await consumeAuthCode(code, verifier)).toBeNull();
  });

  it("createSessionForUser cria uma Session válida", async () => {
    const user = await createUser({ email: "d@example.com" });
    const { sessionToken, expires } = await createSessionForUser(user.id);
    const row = await prisma.session.findUnique({ where: { sessionToken } });
    expect(row?.userId).toBe(user.id);
    expect(expires.getTime()).toBeGreaterThan(Date.now());
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run tests/api/native-auth.test.ts`
Expected: FAIL — `Cannot find module '@/lib/native-auth'`.

- [ ] **Step 3: Implementar `lib/native-auth.ts`**

```ts
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Janela curta: o app troca o código imediatamente após o deep link.
export const CODE_TTL_MS = 60_000;
// Sessão nativa de longa duração (mesma ordem do padrão NextAuth).
export const NATIVE_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** sha256 em base64url — usado para hashear o code e para o challenge PKCE. */
export function sha256Base64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

/**
 * Nome do cookie de sessão do Auth.js. Em HTTPS (produção) o Auth.js usa o
 * prefixo __Secure-; fora dele, não. Os dois lados (exchange e auth()) precisam
 * usar exatamente o mesmo nome.
 */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

/** Emite um código de uso único atrelado a um challenge PKCE. Retorna o code puro. */
export async function mintAuthCode(
  userId: string,
  challenge: string
): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  await prisma.nativeAuthCode.create({
    data: {
      codeHash: sha256Base64Url(code),
      challenge,
      userId,
      expires: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Valida e consome um código. Retorna o userId se: existe, não foi consumido,
 * não expirou e sha256(verifier) === challenge. Consome de forma atômica.
 */
export async function consumeAuthCode(
  code: string,
  verifier: string
): Promise<string | null> {
  const row = await prisma.nativeAuthCode.findUnique({
    where: { codeHash: sha256Base64Url(code) },
  });
  if (!row || row.consumed) return null;
  if (row.expires.getTime() < Date.now()) return null;
  if (row.challenge !== sha256Base64Url(verifier)) return null;

  // Consumo atômico: só um exchange concorrente vence.
  const updated = await prisma.nativeAuthCode.updateMany({
    where: { id: row.id, consumed: false },
    data: { consumed: true },
  });
  if (updated.count !== 1) return null;

  return row.userId;
}

/** Cria uma Session (estratégia DB do NextAuth) e devolve token + expiração. */
export async function createSessionForUser(
  userId: string
): Promise<{ sessionToken: string; expires: Date }> {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + NATIVE_SESSION_MAX_AGE_MS);
  await prisma.session.create({ data: { sessionToken, userId, expires } });
  return { sessionToken, expires };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run tests/api/native-auth.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/native-auth.ts tests/api/native-auth.test.ts
git commit -m "feat(auth): lib de handoff PKCE para login nativo"
```

---

## Task 3: `POST /api/native-auth/exchange`

**Files:**
- Create: `app/api/native-auth/exchange/route.ts`
- Test: `tests/api/native-auth.test.ts` (adicionar bloco)

- [ ] **Step 1: Adicionar testes do exchange** ao final de `tests/api/native-auth.test.ts` (dentro do arquivo, novo `describe`)

```ts
import { POST as exchange } from "@/app/api/native-auth/exchange/route";
import { createNextRequest } from "./helpers";

describe("POST /api/native-auth/exchange", () => {
  beforeEach(async () => {
    await resetDatabase();
    await prisma.nativeAuthCode.deleteMany();
  });

  it("troca code+verifier válidos por uma sessão e seta o cookie", async () => {
    const user = await createUser({ email: "ex@example.com" });
    const verifier = "verifier-xyz";
    const code = await mintAuthCode(user.id, sha256Base64Url(verifier));

    const req = createNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/native-auth/exchange",
      body: { code, verifier },
    });
    const res = await exchange(req);

    expect(res.status).toBe(200);
    expect(res.cookies.get(getSessionCookieName())?.value).toBeTruthy();

    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(1);
  });

  it("rejeita verifier inválido com 401 e sem criar sessão", async () => {
    const user = await createUser({ email: "ex2@example.com" });
    const code = await mintAuthCode(user.id, sha256Base64Url("certo"));

    const req = createNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/native-auth/exchange",
      body: { code, verifier: "errado" },
    });
    const res = await exchange(req);

    expect(res.status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it("rejeita payload sem code/verifier com 400", async () => {
    const req = createNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/native-auth/exchange",
      body: {},
    });
    const res = await exchange(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run tests/api/native-auth.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/native-auth/exchange/route'`.

- [ ] **Step 3: Implementar `app/api/native-auth/exchange/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  consumeAuthCode,
  createSessionForUser,
  getSessionCookieName,
} from "@/lib/native-auth";

/**
 * Chamado DE DENTRO do WebView (same-origin) com o código do deep link e o
 * code_verifier guardado nativamente. Valida o PKCE, cria a sessão e responde
 * com Set-Cookie — o cookie gruda no WebView e loga o usuário.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code, verifier } = body as { code?: unknown; verifier?: unknown };

  if (typeof code !== "string" || typeof verifier !== "string") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const userId = await consumeAuthCode(code, verifier);
  if (!userId) {
    return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  }

  const { sessionToken, expires } = await createSessionForUser(userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
```

- [ ] **Step 4: Rodar e confirmar passagem**

Run: `npx vitest run tests/api/native-auth.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add app/api/native-auth/exchange/route.ts tests/api/native-auth.test.ts
git commit -m "feat(api): rota exchange troca código PKCE por sessão NextAuth"
```

---

## Task 4: `GET /api/native-auth/start`

**Files:**
- Create: `app/api/native-auth/start/route.ts`

- [ ] **Step 1: Implementar a rota**

```ts
import { NextRequest, NextResponse } from "next/server";

const TEN_MIN = 10 * 60;

/**
 * Ponto de entrada do login nativo, aberto no BROWSER DO SISTEMA.
 * Guarda challenge (PKCE) e redirect (deep link) em cookies httpOnly e
 * encaminha para a página que dispara o signIn do Google.
 */
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  const redirect = req.nextUrl.searchParams.get("redirect");

  // Só aceita deep link do próprio app — evita open redirect.
  if (!challenge || !redirect || !redirect.startsWith("continhamagica://")) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const res = NextResponse.redirect(new URL("/native-auth/continue", req.url));
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TEN_MIN,
  };
  res.cookies.set("native-auth-challenge", challenge, cookieOpts);
  res.cookies.set("native-auth-redirect", redirect, cookieOpts);
  return res;
}
```

- [ ] **Step 2: Verificar build/types**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/native-auth/start/route.ts
git commit -m "feat(api): rota start grava PKCE e inicia OAuth nativo"
```

---

## Task 5: Página `/native-auth/continue` (auto-signIn)

**Files:**
- Create: `app/native-auth/continue/page.tsx`
- Create: `app/native-auth/continue/AutoStartLogin.tsx`

- [ ] **Step 1: Client component que dispara o signIn**

`app/native-auth/continue/AutoStartLogin.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export function AutoStartLogin() {
  useEffect(() => {
    // Roda no browser do sistema (não no WebView) — o Google permite OAuth aqui.
    // Ao concluir, NextAuth redireciona para /api/native-auth/complete.
    signIn("google", { callbackUrl: "/api/native-auth/complete" });
  }, []);

  return <p style={{ fontFamily: "sans-serif", padding: 24 }}>Conectando ao Google…</p>;
}
```

- [ ] **Step 2: Server component wrapper**

`app/native-auth/continue/page.tsx`:
```tsx
import { AutoStartLogin } from "./AutoStartLogin";

export default function ContinuePage() {
  return <AutoStartLogin />;
}
```

- [ ] **Step 3: Verificar types**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/native-auth/continue/
git commit -m "feat(web): página de continuação que dispara signIn do Google"
```

---

## Task 6: `GET /api/native-auth/complete` (emite código + deep link)

**Files:**
- Create: `app/api/native-auth/complete/route.ts`

- [ ] **Step 1: Implementar a rota**

```ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { mintAuthCode } from "@/lib/native-auth";

/**
 * callbackUrl do NextAuth após o OAuth. Roda no BROWSER DO SISTEMA, já com a
 * sessão criada. Emite um código de uso único e redireciona para o deep link
 * do app. O verifier NUNCA passou por aqui (só o challenge), preservando PKCE.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const challenge = req.cookies.get("native-auth-challenge")?.value;
  const redirect = req.cookies.get("native-auth-redirect")?.value;

  // Limpa os cookies de handoff em qualquer caminho de saída.
  const clear = [
    "native-auth-challenge=; Path=/; Max-Age=0",
    "native-auth-redirect=; Path=/; Max-Age=0",
  ];

  if (!session?.user?.id || !challenge || !redirect?.startsWith("continhamagica://")) {
    return new Response("Sessão inválida. Feche e tente novamente.", {
      status: 400,
      headers: { "Set-Cookie": clear.join(", ") },
    });
  }

  const code = await mintAuthCode(session.user.id, challenge);
  const location = `${redirect}?code=${encodeURIComponent(code)}`;

  // 302 manual para o esquema customizado (NextResponse.redirect valida URL http).
  const headers = new Headers({ Location: location });
  clear.forEach((c) => headers.append("Set-Cookie", c));
  return new Response(null, { status: 302, headers });
}
```

- [ ] **Step 2: Verificar types**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/native-auth/complete/route.ts
git commit -m "feat(api): rota complete emite código PKCE e redireciona ao deep link"
```

---

## Task 7: Auth.js — fixar nome do cookie de sessão

**Files:**
- Modify: `auth.ts`

- [ ] **Step 1: Configurar `cookies` explicitamente** em `auth.ts` para bater com `getSessionCookieName()`

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  // Nome de cookie explícito para que a rota exchange (login nativo) consiga
  // setar o MESMO cookie que auth() lê. Reproduz o padrão do Auth.js.
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
      session.user.id = user.id;
      return session;
    },
  },
});
```

- [ ] **Step 2: Rodar toda a suíte de testes** (garante que login web/liga não quebrou)

Run: `npm run test`
Expected: PASS (incluindo `tests/api/*`).

- [ ] **Step 3: Commit**

```bash
git add auth.ts
git commit -m "chore(auth): fixa nome do cookie de sessão para handoff nativo"
```

---

## Task 8: PWA — login nativo via postMessage

**Files:**
- Create: `types/global.d.ts`
- Modify: `components/LeaguePanel.tsx`

- [ ] **Step 1: Tipar o flag nativo** em `types/global.d.ts`

```ts
export {};

declare global {
  interface Window {
    __NATIVE_APP__?: boolean;
    __PLATFORM__?: string;
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}
```

- [ ] **Step 2: Ajustar o handler de login** em `components/LeaguePanel.tsx`

Localize o botão de login (atual: `onClick={() => signIn("google")}` em `components/LeaguePanel.tsx:52`) e troque por um handler que detecta o contexto nativo:

```tsx
// Adicione esta função dentro do componente LeaguePanel:
function handleLogin() {
  // No app nativo o OAuth do Google é bloqueado dentro do WebView.
  // Delega ao shell nativo, que abre o browser do sistema e devolve a sessão.
  if (typeof window !== "undefined" && window.__NATIVE_APP__) {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "NATIVE_LOGIN" }));
    return;
  }
  signIn("google");
}
```

E altere o botão:
```tsx
onClick={handleLogin}
```

> Logout permanece `signOut()` — funciona same-origin dentro do WebView (apaga a Session e o cookie normalmente).

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add types/global.d.ts components/LeaguePanel.tsx
git commit -m "feat(web): login delega ao shell nativo quando em WebView"
```

---

## Task 9: App nativo — instalar deps de OAuth

**Files:**
- Modify: `continha-magica-app/package.json` (via CLI)

- [ ] **Step 1: Instalar com expo install** (de dentro de `continha-magica-app/`)

Run:
```bash
cd continha-magica-app && npx expo install expo-web-browser expo-crypto
```
Expected: ambos adicionados com versões compatíveis com o SDK 55. (`expo-linking` já está instalado.)

- [ ] **Step 2: Confirmar saúde do projeto**

Run: `cd continha-magica-app && npx expo-doctor`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add continha-magica-app/package.json continha-magica-app/package-lock.json
git commit -m "build(app): adiciona expo-web-browser e expo-crypto"
```

---

## Task 10: Hook `useGoogleAuth` (PKCE + browser do sistema)

**Files:**
- Create: `continha-magica-app/src/hooks/useGoogleAuth.ts`

- [ ] **Step 1: Implementar o hook**

```ts
import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

const WEB_APP_URL =
  (Constants.expoConfig?.extra?.webAppUrl as string | undefined) ??
  "https://continhamagica.vercel.app";

// Necessário para finalizar sessões de auth pendentes no Android.
WebBrowser.maybeCompleteAuthSession();

/** Converte bytes em base64url (sem +, /, =). */
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function useGoogleAuth() {
  /**
   * Abre o OAuth do Google no browser do sistema e retorna o código de
   * handoff + o verifier PKCE. Retorna null se o usuário cancelar/falhar.
   */
  const loginWithGoogle = useCallback(async (): Promise<
    { code: string; verifier: string } | null
  > => {
    // 1. Gera o code_verifier e o code_challenge = base64url(sha256(verifier)).
    const verifier = toBase64Url(Crypto.getRandomBytes(32));
    const challenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    ).then((b64) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));

    // 2. Deep link de retorno. createURL respeita o scheme do app.json.
    const redirectUri = Linking.createURL("auth-callback");

    const startUrl =
      `${WEB_APP_URL}/api/native-auth/start` +
      `?challenge=${encodeURIComponent(challenge)}` +
      `&redirect=${encodeURIComponent(redirectUri)}`;

    // 3. Abre no browser do sistema e aguarda o redirect de volta ao app.
    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);
    if (result.type !== "success" || !result.url) return null;

    // 4. Extrai o código do deep link.
    const { queryParams } = Linking.parse(result.url);
    const code = queryParams?.code;
    if (typeof code !== "string") return null;

    return { code, verifier };
  }, []);

  return { loginWithGoogle };
}
```

> **Atenção PKCE:** `redirectUri` de `Linking.createURL("auth-callback")` em build standalone resolve para `continhamagica://auth-callback`. A rota `start` valida `startsWith("continhamagica://")`. Em dev client o scheme pode diferir (`exp://`) — testar SEMPRE em development/preview build, nunca Expo Go.

- [ ] **Step 2: Verificar types**

Run: `cd continha-magica-app && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add continha-magica-app/src/hooks/useGoogleAuth.ts
git commit -m "feat(app): hook de login Google via browser do sistema (PKCE)"
```

---

## Task 11: WebViewBridge — tratar NATIVE_LOGIN e injetar exchange

**Files:**
- Modify: `continha-magica-app/src/components/WebViewBridge.tsx`

- [ ] **Step 1: Importar e usar o hook**

No topo de `WebViewBridge.tsx`, adicione:
```tsx
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
```

Dentro do componente, junto aos outros hooks:
```tsx
const { loginWithGoogle } = useGoogleAuth();
```

- [ ] **Step 2: Adicionar o handler de login nativo** (após `handleMessage`)

```tsx
// Recebe NATIVE_LOGIN do PWA, faz o OAuth no browser do sistema e injeta o
// código no WebView para troca por sessão (same-origin → cookie gruda aqui).
const handleNativeLogin = useCallback(async () => {
  const result = await loginWithGoogle();
  if (!result) return;
  const payload = JSON.stringify(result); // { code, verifier }
  webViewRef.current?.injectJavaScript(`
    (function() {
      fetch('/api/native-auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '${payload.replace(/'/g, "\\'")}'
      }).then(function(r) {
        if (r.ok) { window.location.reload(); }
      }).catch(function() {});
    })();
    true;
  `);
}, [loginWithGoogle]);
```

- [ ] **Step 3: Despachar NATIVE_LOGIN dentro de `handleMessage`**

No `handleMessage`, adicione o ramo (antes do `} catch`):
```tsx
        } else if (data.type === "NATIVE_LOGIN") {
          handleNativeLogin();
        }
```

E inclua `handleNativeLogin` nas deps do `useCallback` de `handleMessage`:
```tsx
    [saveItem, removeItem, clearItems, handleNativeLogin]
```

> Ordem: declare `handleNativeLogin` ANTES de `handleMessage` para a referência existir. Se preferir, mantenha `handleMessage` depois do handler.

- [ ] **Step 4: Verificar types**

Run: `cd continha-magica-app && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add continha-magica-app/src/components/WebViewBridge.tsx
git commit -m "feat(app): bridge trata NATIVE_LOGIN e injeta troca de sessão"
```

---

## Task 12: Verificação end-to-end (manual)

**Files:** nenhum (validação).

- [ ] **Step 1: Aplicar schema no dev e subir o PWA**

Run:
```bash
docker compose up -d && npm run db:push && npm run dev
```
Expected: PWA em `http://localhost:3000`. (Para o fluxo nativo completo, é preciso o app apontar para uma URL HTTPS pública; ver Step 3.)

- [ ] **Step 2: Build de desenvolvimento do app**

Run:
```bash
cd continha-magica-app && npm run build:dev:android
```
Expected: build gerado. Instalar no dispositivo/emulador. (NÃO usar Expo Go — `react-native-webview` + deep link exigem development build.)

- [ ] **Step 3: Testar o fluxo de login no app**

1. Abrir o app → ir ao painel da liga → tocar em "Entrar com Google".
2. Confirmar que abre o **browser do sistema** (não erro 403 dentro do WebView).
3. Concluir o login Google.
4. Confirmar retorno automático ao app (deep link) e que o WebView recarrega **já autenticado** (nome/avatar aparecem, placar da liga carrega).

Expected: usuário logado dentro do WebView.

- [ ] **Step 4: Verificar persistência (risco iOS)**

1. Fechar completamente o app e reabrir.
2. Confirmar se continua logado.

Expected: continua logado (graças a `sharedCookiesEnabled`).
**Se deslogar no iOS:** abrir follow-up para persistir `sessionToken` no SecureStore + setar cookie nativamente com `@react-native-cookies/cookies` no boot (cookie httpOnly não pode ser setado via JS injetado).

- [ ] **Step 5: Verificar logout**

1. Tocar em "Sair".
2. Confirmar que volta ao estado deslogado e que a `Session` foi removida (Prisma Studio: `npm run db:studio`).

Expected: logout limpa a sessão.

- [ ] **Step 6: Suíte automatizada final**

Run: `npm run test`
Expected: PASS.

---

## Task 13: Documentação

**Files:**
- Modify: `AGENTS.md` (raiz)
- Modify: `continha-magica-app/AGENTS.md`

- [ ] **Step 1: Documentar as rotas e o fluxo** na seção de API routes do `AGENTS.md` da raiz

Adicionar à lista de API routes:
```md
- `GET /api/native-auth/start`: inicia o login nativo (browser do sistema), grava PKCE em cookies httpOnly.
- `GET /api/native-auth/complete`: callback do OAuth; emite código de uso único e redireciona ao deep link `continhamagica://auth-callback`.
- `POST /api/native-auth/exchange`: troca o código + verifier (PKCE) por uma sessão NextAuth (cria `Session`, seta cookie). Chamado de dentro do WebView.
```

E uma nota na seção de segurança:
```md
- **Login nativo (handoff PKCE):** o app nativo não loga via WebView (Google bloqueia). O OAuth roda no browser do sistema e a sessão é transferida por código de uso único protegido por PKCE (`lib/native-auth.ts`). O `code_verifier` nunca sai do app.
```

- [ ] **Step 2: Documentar o lado nativo** em `continha-magica-app/AGENTS.md`

Adicionar seção:
```md
## Login Google (handoff PKCE)

O Google bloqueia OAuth em WebView. O fluxo: `useGoogleAuth.loginWithGoogle()`
abre o browser do sistema em `/api/native-auth/start`, recebe o código via deep
link `continhamagica://auth-callback`, e o `WebViewBridge` injeta uma chamada a
`/api/native-auth/exchange` (same-origin) que estabelece a sessão no WebView.
Deps: `expo-web-browser`, `expo-crypto`, `expo-linking`.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md continha-magica-app/AGENTS.md
git commit -m "docs: documenta fluxo de login nativo (handoff PKCE)"
```

---

## Notas de segurança (resumo)

- **PKCE** impede que um app malicioso que intercepte o deep link use o código: sem o `code_verifier` (que nunca sai do app), o `exchange` rejeita.
- **Código de uso único + TTL de 60s + consumo atômico** (`updateMany ... where consumed:false`) impedem replay e corrida.
- **Cookie httpOnly + Secure + SameSite=Lax** na sessão emitida.
- **Validação de `redirect`** (`startsWith("continhamagica://")`) impede open redirect na rota `start`/`complete`.
- O `exchange` só cria sessão após validar o PKCE — não confia em nada do cliente além do par code/verifier.
