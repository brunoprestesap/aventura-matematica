# Histórico de quiz na nuvem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir, para usuários autenticados, um histórico de quiz que mescla os registros locais (`localStorage`) com os registros já persistidos no servidor, de forma que o histórico acompanhe o usuário entre dispositivos.

**Architecture:** Reusa o model `WeeklyScore` (já gravado a cada sessão) adicionando um campo `clientId` igual ao `id` que o cliente gera em `makeId()`. Um novo `GET /api/historico` lê esses registros; o `HistoryPanel` busca de forma lazy ao abrir e faz merge dedup por `id`/`clientId`. Anônimos continuam 100% locais.

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL (Neon prod / SQLite testes), NextAuth v5, Vitest + Testing Library.

---

## Spec de referência

`docs/superpowers/specs/2026-06-16-historico-nuvem-design.md`

## File Structure

- `prisma/schema.prisma` — adiciona `clientId String?` ao `WeeklyScore` (Postgres).
- `prisma/schema.test.prisma` — mesma adição (SQLite de testes).
- `lib/history.ts` — exporta `makeId`; `addActivity` aceita `id` opcional; nova `mergeHistories`.
- `app/api/session/route.ts` — aceita e persiste `clientId`.
- `app/api/historico/route.ts` — **novo** `GET` autenticado.
- `components/HistoryPanel.tsx` — fetch lazy + merge.
- `components/QuizPage.tsx` — envia `clientId` no `POST /api/session`.
- Testes: `tests/unit/lib/history.test.ts`, `tests/api/session.test.ts`, `tests/api/historico.test.ts` (novo), `tests/components/HistoryPanel.test.tsx`.

---

### Task 1: Schema — `clientId` no `WeeklyScore`

**Files:**
- Modify: `prisma/schema.prisma` (model `WeeklyScore`, ~linha 137-150)
- Modify: `prisma/schema.test.prisma` (model `WeeklyScore` correspondente)

- [ ] **Step 1: Adicionar o campo no schema de produção**

Em `prisma/schema.prisma`, no model `WeeklyScore`, adicione a linha do `clientId` logo após `xpEarned`:

```prisma
model WeeklyScore {
  id          String   @id @default(cuid())
  userId      String
  grade       Int
  correct     Int      // acertos (0–20)
  total       Int      // total de questões (sempre 20)
  xpEarned    Int      // XP calculado pelo servidor
  clientId    String?  // id estável gerado no cliente (makeId), p/ dedup do histórico
  sessionDate DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, sessionDate])
  @@map("weekly_scores")
}
```

- [ ] **Step 2: Adicionar o mesmo campo no schema de testes**

Em `prisma/schema.test.prisma`, localize o model `WeeklyScore` e adicione a mesma linha `clientId String?` na posição equivalente (após `xpEarned`). Mantenha o restante do model idêntico ao que já existe no arquivo de testes.

- [ ] **Step 3: Regenerar o Prisma Client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" sem erros.

- [ ] **Step 4: Aplicar o schema no banco de testes SQLite**

Run: `npm run test:db:push`
Expected: o push conclui; a coluna `clientId` passa a existir em `weekly_scores` do `prisma/test.db`.

- [ ] **Step 5: Verificar que os testes de API existentes continuam passando**

Run: `npx vitest run tests/api/session.test.ts`
Expected: PASS (campo opcional não quebra nada).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/schema.test.prisma
git commit -m "feat(db): adiciona WeeklyScore.clientId para dedup do histórico"
```

> **Nota de deploy (não executar agora):** antes/junto do deploy, aplicar a coluna no Neon via conexão **unpooled**: `DATABASE_URL="<unpooled>" npx prisma db push`. `prisma generate` já roda no script `build`.

---

### Task 2: `lib/history.ts` — `makeId` exportado, `id` opcional em `addActivity`, `mergeHistories`

**Files:**
- Modify: `lib/history.ts`
- Test: `tests/unit/lib/history.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao final de `tests/unit/lib/history.test.ts` (e inclua `mergeHistories`, `makeId`, `type ActivityRecord` no import do topo do arquivo):

```ts
import {
  // ...imports existentes...
  mergeHistories,
  makeId,
  type ActivityRecord,
} from "@/lib/history";

describe("makeId", () => {
  it("gera ids não vazios e distintos", () => {
    const a = makeId();
    const b = makeId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe("addActivity com id explícito", () => {
  it("usa o id fornecido quando passado", () => {
    const base: ActivityHistory = { version: HISTORY_VERSION, activities: [] };
    const updated = addActivity(base, 4, 18, 20, "2024-02-01T12:00:00.000Z", "fixo-1");
    expect(updated.activities[0].id).toBe("fixo-1");
  });

  it("gera um id quando nenhum é passado", () => {
    const base: ActivityHistory = { version: HISTORY_VERSION, activities: [] };
    const updated = addActivity(base, 4, 18, 20, "2024-02-01T12:00:00.000Z");
    expect(updated.activities[0].id).toBeTruthy();
  });
});

describe("mergeHistories", () => {
  const local: ActivityHistory = {
    version: HISTORY_VERSION,
    activities: [
      { id: "a", grade: 4, score: 10, total: 20, completedAt: "2024-01-02T10:00:00.000Z" },
      { id: "b", grade: 4, score: 12, total: 20, completedAt: "2024-01-01T10:00:00.000Z" },
    ],
  };

  it("deduplica por id, preferindo o registro da nuvem", () => {
    const cloud: ActivityRecord[] = [
      { id: "a", grade: 4, score: 15, total: 20, completedAt: "2024-01-02T10:00:00.000Z" },
    ];
    const merged = mergeHistories(local, cloud);
    const a = merged.activities.find((x) => x.id === "a");
    expect(merged.activities).toHaveLength(2);
    expect(a?.score).toBe(15); // veio da nuvem
  });

  it("inclui registros só da nuvem e ordena por data desc", () => {
    const cloud: ActivityRecord[] = [
      { id: "c", grade: 5, score: 20, total: 20, completedAt: "2024-01-03T10:00:00.000Z" },
    ];
    const merged = mergeHistories(local, cloud);
    expect(merged.activities.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("limita a 50 registros", () => {
    const many: ActivityRecord[] = Array.from({ length: 60 }, (_, i) => ({
      id: `cloud-${i}`,
      grade: 4,
      score: 10,
      total: 20,
      completedAt: new Date(2024, 0, 1, 0, i).toISOString(),
    }));
    const merged = mergeHistories({ version: HISTORY_VERSION, activities: [] }, many);
    expect(merged.activities).toHaveLength(50);
  });

  it("nuvem vazia retorna o local", () => {
    const merged = mergeHistories(local, []);
    expect(merged.activities).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `npx vitest run tests/unit/lib/history.test.ts`
Expected: FAIL — `mergeHistories`/`makeId` não exportados; `addActivity` não aceita 6º argumento.

- [ ] **Step 3: Implementar as mudanças em `lib/history.ts`**

Em `lib/history.ts`:

a) Tornar `makeId` exportado (trocar `function makeId` por `export function makeId`):

```ts
export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}
```

b) Aceitar `id` opcional em `addActivity` (assinatura e corpo):

```ts
export function addActivity(
  history: ActivityHistory,
  grade: Grade,
  score: number,
  total: number,
  completedAt: string,
  id: string = makeId()
): ActivityHistory {
  const activity: ActivityRecord = {
    id,
    grade,
    score,
    total,
    completedAt,
  };
  return {
    version: HISTORY_VERSION,
    activities: [activity, ...history.activities].slice(0, 50),
  };
}
```

c) Adicionar `mergeHistories` (ao final do arquivo, antes de `formatActivityDate` ou após — qualquer posição de top-level):

```ts
// Mescla histórico local com registros vindos da nuvem.
// Dedup por id (o cliente reusa o id local como clientId no servidor),
// preferindo o registro da nuvem em caso de colisão. Ordena por data desc.
export function mergeHistories(
  local: ActivityHistory,
  cloud: ActivityRecord[]
): ActivityHistory {
  const byId = new Map<string, ActivityRecord>();
  for (const record of local.activities) byId.set(record.id, record);
  for (const record of cloud) byId.set(record.id, record); // nuvem sobrescreve
  const activities = Array.from(byId.values())
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 50);
  return { version: HISTORY_VERSION, activities };
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `npx vitest run tests/unit/lib/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/history.ts tests/unit/lib/history.test.ts
git commit -m "feat(history): exporta makeId, id opcional em addActivity e mergeHistories"
```

---

### Task 3: `POST /api/session` — aceitar e persistir `clientId`

**Files:**
- Modify: `app/api/session/route.ts`
- Test: `tests/api/session.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Adicione este teste dentro do `describe("POST /api/session", ...)` em `tests/api/session.test.ts`:

```ts
it("persiste o clientId no WeeklyScore quando enviado", async () => {
  const user = await createUser({ email: "client@example.com" });
  mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

  const req = createNextRequest({
    method: "POST",
    body: {
      grade: 4,
      correct: 10,
      answers: new Array(20).fill(false).map((_, i) => i < 10),
      clientId: "abc123",
    },
  });

  const res = await POST(req);
  const json = await res.json();
  expect(json.authenticated).toBe(true);

  const score = await prisma.weeklyScore.findFirstOrThrow({ where: { userId: user.id } });
  expect(score.clientId).toBe("abc123");
});

it("aceita payload sem clientId (compatibilidade)", async () => {
  const user = await createUser({ email: "noclient@example.com" });
  mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

  const req = createNextRequest({
    method: "POST",
    body: { grade: 4, correct: 10, answers: new Array(20).fill(false).map((_, i) => i < 10) },
  });

  const res = await POST(req);
  expect(res.status).toBe(200);
  const score = await prisma.weeklyScore.findFirstOrThrow({ where: { userId: user.id } });
  expect(score.clientId).toBeNull();
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run tests/api/session.test.ts`
Expected: FAIL — `score.clientId` é `undefined`/coluna não preenchida (rota ainda não grava).

- [ ] **Step 3: Implementar em `app/api/session/route.ts`**

a) Estender a interface do payload:

```ts
interface SessionPayload {
  grade: number;        // 1–9
  correct: number;      // 0–20
  answers: boolean[];   // array de booleanos
  clientId?: string;    // id estável do registro local (dedup do histórico)
}
```

b) Validar `clientId` quando presente (logo após o bloco de validação básica existente, antes de `const userId = ...`):

```ts
  // clientId é opcional; se vier, precisa ser uma string curta
  if (body.clientId !== undefined &&
      (typeof body.clientId !== "string" || body.clientId.length > 64)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
```

c) Persistir no `create` (dentro da transação, no `tx.weeklyScore.create`):

```ts
    await tx.weeklyScore.create({
      data: {
        userId,
        grade: body.grade,
        correct: correctCount,
        total: 20,
        xpEarned,
        clientId: body.clientId ?? null,
      },
    });
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `npx vitest run tests/api/session.test.ts`
Expected: PASS (todos os testes, incluindo os antigos).

- [ ] **Step 5: Commit**

```bash
git add app/api/session/route.ts tests/api/session.test.ts
git commit -m "feat(api): /api/session persiste clientId no WeeklyScore"
```

---

### Task 4: `GET /api/historico` — novo endpoint autenticado

**Files:**
- Create: `app/api/historico/route.ts`
- Test: `tests/api/historico.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/api/historico.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { GET } from "@/app/api/historico/route";
import { prisma } from "@/lib/prisma";
import { resetDatabase, createUser } from "./helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
const mockedAuth = vi.mocked(auth);

describe("GET /api/historico", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedAuth.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retorna 401 para usuário não autenticado", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retorna os registros do usuário mapeados e ordenados por data desc", async () => {
    const user = await createUser({ email: "hist@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    await prisma.weeklyScore.create({
      data: { userId: user.id, grade: 4, correct: 10, total: 20, xpEarned: 100,
              clientId: "antigo", sessionDate: new Date("2024-01-01T10:00:00.000Z") },
    });
    await prisma.weeklyScore.create({
      data: { userId: user.id, grade: 5, correct: 18, total: 20, xpEarned: 200,
              clientId: "novo", sessionDate: new Date("2024-02-01T10:00:00.000Z") },
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.activities).toHaveLength(2);
    // mais recente primeiro
    expect(json.activities[0].id).toBe("novo");
    expect(json.activities[0].grade).toBe(5);
    expect(json.activities[0].score).toBe(18);
    expect(json.activities[0].total).toBe(20);
    expect(typeof json.activities[0].completedAt).toBe("string");
  });

  it("usa o id do registro quando clientId é nulo", async () => {
    const user = await createUser({ email: "semclient@example.com" });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const created = await prisma.weeklyScore.create({
      data: { userId: user.id, grade: 4, correct: 10, total: 20, xpEarned: 100, clientId: null },
    });

    const res = await GET();
    const json = await res.json();
    expect(json.activities[0].id).toBe(created.id);
  });

  it("não retorna registros de outros usuários", async () => {
    const user = await createUser({ email: "dono@example.com" });
    const outro = await createUser({ email: "alheio@example.com" });
    await prisma.weeklyScore.create({
      data: { userId: outro.id, grade: 4, correct: 10, total: 20, xpEarned: 100 },
    });
    mockedAuth.mockResolvedValue({ user: { id: user.id } } as never);

    const res = await GET();
    const json = await res.json();
    expect(json.activities).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run tests/api/historico.test.ts`
Expected: FAIL — módulo `@/app/api/historico/route` não existe.

- [ ] **Step 3: Implementar `app/api/historico/route.ts`**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const scores = await prisma.weeklyScore.findMany({
    where: { userId: session.user.id },
    orderBy: { sessionDate: "desc" },
    take: 50,
  });

  const activities = scores.map((s) => ({
    id: s.clientId ?? s.id,
    grade: s.grade,
    score: s.correct,
    total: s.total,
    completedAt: s.sessionDate.toISOString(),
  }));

  return NextResponse.json({ activities });
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `npx vitest run tests/api/historico.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/historico/route.ts tests/api/historico.test.ts
git commit -m "feat(api): GET /api/historico retorna histórico do usuário"
```

---

### Task 5: `HistoryPanel` — fetch lazy + merge

**Files:**
- Modify: `components/HistoryPanel.tsx`
- Test: `tests/components/HistoryPanel.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Substitua/estenda `tests/components/HistoryPanel.test.tsx`. Inclua casos para: render do botão, merge com a nuvem ao abrir, e fallback silencioso em erro. Use mock de `fetch` e seed do `localStorage`.

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HistoryPanel } from "@/components/HistoryPanel";
import { HISTORY_KEY, HISTORY_VERSION } from "@/lib/history";

function seedLocal(activities: unknown[]) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify({ version: HISTORY_VERSION, activities })
  );
}

describe("HistoryPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mescla registros locais e da nuvem ao abrir o painel", async () => {
    seedLocal([
      { id: "local-1", grade: 4, score: 10, total: 20, completedAt: "2024-01-01T10:00:00.000Z" },
    ]);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: [
          { id: "cloud-1", grade: 5, score: 18, total: 20, completedAt: "2024-02-01T10:00:00.000Z" },
        ],
      }),
    } as Response);

    render(<HistoryPanel />);
    fireEvent.click(screen.getByRole("button", { name: /histórico/i }));

    // o registro da nuvem aparece após o fetch
    await waitFor(() => expect(screen.getByText("18/20")).toBeInTheDocument());
    // o registro local permanece
    expect(screen.getByText("10/20")).toBeInTheDocument();
  });

  it("mostra apenas o local quando o fetch falha (anônimo/erro)", async () => {
    seedLocal([
      { id: "local-1", grade: 4, score: 10, total: 20, completedAt: "2024-01-01T10:00:00.000Z" },
    ]);
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 401 } as Response);

    render(<HistoryPanel />);
    fireEvent.click(screen.getByRole("button", { name: /histórico/i }));

    await waitFor(() => expect(screen.getByText("10/20")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run tests/components/HistoryPanel.test.tsx`
Expected: FAIL — o painel ainda não busca a nuvem; `18/20` não aparece.

- [ ] **Step 3: Implementar em `components/HistoryPanel.tsx`**

Atualize os imports e a lógica do componente. As mudanças-chave: estado para os registros da nuvem, `useEffect` que dispara o fetch quando `open` vira `true`, e uso de `mergeHistories` para o que é renderizado.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useHistory,
  mergeHistories,
  formatActivityDate,
  type ActivityRecord,
} from "@/lib/history";
import { getGradeConfig } from "@/lib/questions";
import { History, X, Trophy, Calendar } from "lucide-react";

export function HistoryPanel() {
  const [open, setOpen] = useState(false);
  const [cloud, setCloud] = useState<ActivityRecord[]>([]);
  const localHistory = useHistory();

  // Busca lazy: só quando o painel abre.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/historico")
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data.activities)) {
          setCloud(data.activities as ActivityRecord[]);
        }
      })
      .catch(() => {
        // Falha silenciosa — cai para o histórico local
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const history = mergeHistories(localHistory, cloud);

  return (
    // ...JSX existente, porém trocando todas as referências a `history.activities`
    // pelo `history` derivado acima (o nome da variável continua `history`,
    // então o restante do JSX permanece igual)...
  );
}
```

> **Importante:** mantenha exatamente o mesmo JSX já existente do modal (botão, overlay, lista, estado vazio). A única diferença estrutural é: (1) os novos imports, (2) o estado `cloud` + `useEffect`, (3) `const history = mergeHistories(localHistory, cloud);` no lugar de `const history = useHistory();`. Não altere classes, textos nem acessibilidade.

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `npx vitest run tests/components/HistoryPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/HistoryPanel.tsx tests/components/HistoryPanel.test.tsx
git commit -m "feat(history): painel busca histórico da nuvem (lazy) e mescla com o local"
```

---

### Task 6: `QuizPage` — enviar `clientId` no `POST /api/session`

**Files:**
- Modify: `components/QuizPage.tsx` (imports ~linha 24-29; `handleVerify` ~linha 202-240)

- [ ] **Step 1: Importar `makeId`**

No bloco de import de `@/lib/history` em `components/QuizPage.tsx`, adicione `makeId`:

```tsx
import {
  readHistory,
  writeHistory,
  addActivity,
  notifyHistoryChanged,
  makeId,
} from "@/lib/history";
```

- [ ] **Step 2: Gerar o `clientId` e reusá-lo nos dois caminhos**

Em `handleVerify`, gere o id antes do `addActivity`, passe-o como 6º argumento e inclua no payload do fetch:

```tsx
    const clientId = makeId();

    const history = readHistory();
    writeHistory(
      addActivity(
        history,
        selectedGrade,
        score,
        questions.length,
        new Date().toISOString(),
        clientId
      )
    );
    notifyHistoryChanged();

    // Envia resultado para a liga em background (não bloqueia a UI)
    const answersArray = questions.map(
      (q) => Number(answers[q.id]?.trim()) === q.answer
    );

    if (answersArray.length === 20) {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedGrade,
          correct: score,
          answers: answersArray,
          clientId,
        }),
      }).catch(() => {
        // Falha silenciosa — a liga não deve bloquear o fluxo do quiz
      });
    }
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros de tipo nem de lint.

- [ ] **Step 4: Commit**

```bash
git add components/QuizPage.tsx
git commit -m "feat(quiz): envia clientId ao registrar sessão para dedup do histórico"
```

---

### Task 7: Verificação final

**Files:** nenhum (apenas verificação)

- [ ] **Step 1: Suíte completa de testes unitários/componentes/API**

Run: `npm run test`
Expected: todos os testes PASS.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 3: Build de produção**

Run: `npm run build`
Expected: build conclui sem erros (inclui `prisma generate`).

- [ ] **Step 4: Cobertura (confirmar thresholds)**

Run: `npx vitest run --coverage`
Expected: thresholds mantidos — `lib/` 80% linhas/funcs/stmts, 70% branches; `app/api/` 80%.

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "test: verificação final do histórico na nuvem" || echo "nada a commitar"
```

> **Pós-merge / deploy (fora do escopo de código):** aplicar a coluna `clientId` no banco Neon de produção via conexão **unpooled** antes/junto do deploy (ver AGENTS.md → "Banco de dados de produção (Neon)").

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** estratégia de merge → Task 2/5; `WeeklyScore.clientId` → Task 1/3; sem backfill → garantido por não criar endpoint de lote; fetch lazy → Task 5 (`useEffect` em `open`); GET autenticado → Task 4; envio do clientId → Task 6. ✅
- **Placeholders:** nenhum "TBD/TODO"; todo código de teste e implementação está completo. O único trecho elidido é o JSX inalterado do `HistoryPanel`, explicitamente marcado como "manter idêntico". ✅
- **Consistência de tipos:** `ActivityRecord` (id, grade, score, total, completedAt) usado de forma idêntica em `history.ts`, no GET (`score: s.correct`) e nos testes; `mergeHistories(local, cloud)` e `addActivity(..., id?)` com assinaturas estáveis entre tasks. ✅
