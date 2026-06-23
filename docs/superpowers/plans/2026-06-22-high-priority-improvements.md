# Melhorias de alta prioridade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover entradas de histórico corrompidas (score=0 geradas por um bug pré-22/06/2026) e adicionar cobertura de testes ao componente `ModalSheet`.

**Architecture:** A migração segue o padrão one-shot já existente em `lib/migrate.ts`: nova função `cleanCorruptedHistoryScores()` protegida por guard key, chamada no escopo de módulo de `QuizPage.tsx`. Os testes do `ModalSheet` usam o `render` customizado de `test-utils.tsx` (que envolve com `LazyMotion strict`) e `fireEvent` do Testing Library.

**Tech Stack:** TypeScript 5, Vitest, @testing-library/react, jsdom, Framer Motion (LazyMotion/skipAnimations)

## Global Constraints

- Idioma do projeto: **pt-BR** — comentários, mensagens e docs em português.
- Nunca usar `motion.*` — apenas `m.*` do `motion/react` (LazyMotion strict quebra o build).
- `"use client"` obrigatório em todo componente que use hooks ou acesse `window`/`localStorage`.
- Aliases `@/*` para todo import local (ex: `@/lib/history`, `@/components/ModalSheet`).
- Nunca criar novas chaves de `localStorage` sem (a) envolver em `try/catch` e (b) adicionar à tabela de "Persistência local" no `AGENTS.md`.
- Branch antes de commitar — nunca direto na `main`.
- Rodar `npm run test` antes de cada commit.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `lib/migrate.ts` | Modificar | Adicionar `HISTORY_CLEANED_KEY` (exportado) e `cleanCorruptedHistoryScores()` (exportada) |
| `components/QuizPage.tsx` | Modificar | Importar e chamar `cleanCorruptedHistoryScores()` junto com `migrateLocalStorage()` |
| `AGENTS.md` | Modificar | Adicionar `continha-magica-history-cleaned-v1` à tabela de persistência local |
| `tests/unit/lib/migrate.test.ts` | Criar | 5 testes unitários para `cleanCorruptedHistoryScores` |
| `tests/components/ModalSheet.test.tsx` | Criar | 9 testes de componente para `ModalSheet` |

---

## Task 1: Migração do histórico corrompido

**Files:**
- Modify: `lib/migrate.ts`
- Modify: `components/QuizPage.tsx:66-72`
- Modify: `AGENTS.md` (seção "Persistência local", tabela de chaves)
- Create (test): `tests/unit/lib/migrate.test.ts`

**Interfaces:**
- Produz: `cleanCorruptedHistoryScores(): void` e `HISTORY_CLEANED_KEY: string` exportados de `lib/migrate.ts`
- Consome: `readHistory(): ActivityHistory` e `writeHistory(h: ActivityHistory): void` de `@/lib/history`

---

- [ ] **Step 1: Criar o arquivo de teste com os 5 casos de teste**

Crie `tests/unit/lib/migrate.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { cleanCorruptedHistoryScores, HISTORY_CLEANED_KEY } from "@/lib/migrate";
import { writeHistory, readHistory, HISTORY_VERSION } from "@/lib/history";

const ANTES_DO_FIX = "2026-06-01T00:00:00.000Z";
const DEPOIS_DO_FIX = "2026-06-23T00:00:00.000Z";

describe("cleanCorruptedHistoryScores", () => {
  beforeEach(() => localStorage.clear());

  it("remove entradas com score=0 anteriores a 22/06/2026", () => {
    writeHistory({
      version: HISTORY_VERSION,
      activities: [
        { id: "corrompida", grade: 4, score: 0, total: 20, completedAt: ANTES_DO_FIX },
        { id: "legitima-antiga", grade: 4, score: 5, total: 20, completedAt: ANTES_DO_FIX },
        { id: "zero-nova", grade: 4, score: 0, total: 20, completedAt: DEPOIS_DO_FIX },
      ],
    });

    cleanCorruptedHistoryScores();

    const ids = readHistory().activities.map((a) => a.id);
    expect(ids).toEqual(["legitima-antiga", "zero-nova"]);
  });

  it("não altera o histórico quando não há entradas corrompidas", () => {
    writeHistory({
      version: HISTORY_VERSION,
      activities: [
        { id: "ok", grade: 4, score: 15, total: 20, completedAt: ANTES_DO_FIX },
      ],
    });

    cleanCorruptedHistoryScores();

    expect(readHistory().activities).toHaveLength(1);
  });

  it("grava a guard key após a execução", () => {
    cleanCorruptedHistoryScores();
    expect(localStorage.getItem(HISTORY_CLEANED_KEY)).toBe("1");
  });

  it("não executa novamente se a guard key já existe", () => {
    writeHistory({
      version: HISTORY_VERSION,
      activities: [
        { id: "ruim", grade: 4, score: 0, total: 20, completedAt: ANTES_DO_FIX },
      ],
    });
    localStorage.setItem(HISTORY_CLEANED_KEY, "1");

    cleanCorruptedHistoryScores();

    // Guard presente → atividade corrupta não deve ser removida
    expect(readHistory().activities).toHaveLength(1);
  });

  it("funciona com histórico vazio e grava a guard key", () => {
    cleanCorruptedHistoryScores();
    expect(readHistory().activities).toHaveLength(0);
    expect(localStorage.getItem(HISTORY_CLEANED_KEY)).toBe("1");
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham com "not exported"**

```bash
npm run test -- tests/unit/lib/migrate.test.ts
```

Esperado: FAIL — `cleanCorruptedHistoryScores is not a function` ou `not exported`

- [ ] **Step 3: Implementar `cleanCorruptedHistoryScores` em `lib/migrate.ts`**

Adicione ao final do arquivo `lib/migrate.ts` (após a função existente `migrateLocalStorage`):

```ts
export const HISTORY_CLEANED_KEY = "continha-magica-history-cleaned-v1";

const BUG_FIX_DATE = "2026-06-22T00:00:00.000Z";

export function cleanCorruptedHistoryScores(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(HISTORY_CLEANED_KEY) === "1") return;
  try {
    const history = readHistory();
    const cleaned = history.activities.filter(
      (a) => !(a.score === 0 && a.completedAt < BUG_FIX_DATE)
    );
    if (cleaned.length < history.activities.length) {
      writeHistory({ ...history, activities: cleaned });
    }
    localStorage.setItem(HISTORY_CLEANED_KEY, "1");
  } catch {
    // falha silenciosa — não grava a guard key; tentará na próxima sessão
  }
}
```

Adicione ao topo do arquivo os imports necessários:

```ts
import { readHistory, writeHistory } from "@/lib/history";
```

O arquivo completo ficará assim:

```ts
import { readHistory, writeHistory } from "@/lib/history";

/**
 * Migra dados do localStorage das chaves antigas (Aventura Matemática)
 * para as chaves novas (Continha Mágica).
 *
 * Executar apenas uma vez por dispositivo, controlado pela chave de migração.
 * Seguro chamar múltiplas vezes — é idempotente.
 */
const MIGRATION_KEY = "continha-magica-migrated-v1";

const MIGRATIONS: Array<{ from: string; to: string }> = [
  { from: "aventura-matematica-grade", to: "continha-magica-grade" },
  { from: "aventura-matematica-history", to: "continha-magica-history" },
  { from: "aventura-matematica-user-name", to: "continha-magica-user-name" },
];

export function migrateLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    if (localStorage.getItem(MIGRATION_KEY) === "1") return;

    for (const { from, to } of MIGRATIONS) {
      const value = localStorage.getItem(from);
      if (value !== null) {
        if (localStorage.getItem(to) === null) {
          localStorage.setItem(to, value);
        }
        localStorage.removeItem(from);
      }
    }

    localStorage.setItem(MIGRATION_KEY, "1");
  } catch {
    // Falha silenciosa — localStorage pode estar indisponível (modo privado, etc.)
  }
}

export const HISTORY_CLEANED_KEY = "continha-magica-history-cleaned-v1";

const BUG_FIX_DATE = "2026-06-22T00:00:00.000Z";

export function cleanCorruptedHistoryScores(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(HISTORY_CLEANED_KEY) === "1") return;
  try {
    const history = readHistory();
    const cleaned = history.activities.filter(
      (a) => !(a.score === 0 && a.completedAt < BUG_FIX_DATE)
    );
    if (cleaned.length < history.activities.length) {
      writeHistory({ ...history, activities: cleaned });
    }
    localStorage.setItem(HISTORY_CLEANED_KEY, "1");
  } catch {
    // falha silenciosa — não grava a guard key; tentará na próxima sessão
  }
}
```

- [ ] **Step 4: Rodar os testes e confirmar que os 5 passam**

```bash
npm run test -- tests/unit/lib/migrate.test.ts
```

Esperado: 5 passed

- [ ] **Step 5: Atualizar `components/QuizPage.tsx` para chamar a nova função**

Localize o bloco de import e chamada em `components/QuizPage.tsx` (linhas 66–72):

```ts
import { migrateLocalStorage } from "@/lib/migrate";

// Migra os dados das chaves antigas (Aventura Matemática) ao carregar o módulo,
// antes de qualquer leitura síncrona do localStorage feita pelos hooks de store.
// O módulo só roda no cliente (QuizPageLoader usa ssr: false) e a função é
// idempotente e protegida por guarda `typeof window`.
migrateLocalStorage();
```

Substitua por:

```ts
import { migrateLocalStorage, cleanCorruptedHistoryScores } from "@/lib/migrate";

// Migrações one-shot do localStorage. Rodam antes de qualquer leitura
// síncrona dos hooks de store. Idempotentes e protegidas por guard keys.
migrateLocalStorage();
cleanCorruptedHistoryScores();
```

- [ ] **Step 6: Atualizar a tabela de persistência no `AGENTS.md`**

Na seção "Persistência local", encontre a tabela de chaves e adicione a linha abaixo de `continha-magica-onboarding-v1`:

```markdown
| `continha-magica-history-cleaned-v1` | Guard da migration de scores corrompidos (score=0 antes de 22/06/2026) | `lib/migrate.ts` |
```

- [ ] **Step 7: Rodar toda a suíte de testes**

```bash
npm run test
```

Esperado: todos os testes passam, sem regressões.

- [ ] **Step 8: Commit**

```bash
git add lib/migrate.ts components/QuizPage.tsx AGENTS.md tests/unit/lib/migrate.test.ts
git commit -m "fix: remove histórico local com scores corrompidos (score=0 pré-22/06/2026)"
```

---

## Task 2: Testes de componente para ModalSheet

**Files:**
- Create (test): `tests/components/ModalSheet.test.tsx`

**Interfaces:**
- Consome: `ModalSheet` de `@/components/ModalSheet`
- Consome: `render`, `screen`, `fireEvent`, `waitFor` de `./test-utils`

---

- [ ] **Step 1: Criar `tests/components/ModalSheet.test.tsx` com os 9 casos de teste**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "./test-utils";
import { ModalSheet } from "@/components/ModalSheet";

describe("ModalSheet", () => {
  it("renderiza children quando open=true", () => {
    render(
      <ModalSheet open={true} onClose={() => {}}>
        <p>Conteúdo do modal</p>
      </ModalSheet>
    );
    expect(screen.getByText("Conteúdo do modal")).toBeInTheDocument();
  });

  it("não renderiza nada quando open=false", () => {
    render(
      <ModalSheet open={false} onClose={() => {}}>
        <p>Conteúdo do modal</p>
      </ModalSheet>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aplica aria-label no dialog", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} ariaLabel="Meu painel">
        conteúdo
      </ModalSheet>
    );
    expect(screen.getByRole("dialog", { name: "Meu painel" })).toBeInTheDocument();
  });

  it("aplica aria-labelledby no dialog", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} ariaLabelledBy="titulo-id">
        <h2 id="titulo-id">Título</h2>
      </ModalSheet>
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "titulo-id");
  });

  it("aplica overlayClassName ao overlay", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} overlayClassName="minha-classe-overlay">
        conteúdo
      </ModalSheet>
    );
    expect(screen.getByRole("dialog")).toHaveClass("minha-classe-overlay");
  });

  it("aplica sheetClassName ao sheet interno", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} sheetClassName="minha-classe-sheet">
        conteúdo
      </ModalSheet>
    );
    const sheet = screen.getByRole("dialog").firstElementChild;
    expect(sheet).toHaveClass("minha-classe-sheet");
  });

  it("chama onClose ao clicar no overlay (fora do sheet)", () => {
    const onClose = vi.fn();
    render(
      <ModalSheet open={true} onClose={onClose}>
        conteúdo
      </ModalSheet>
    );
    // Clica diretamente no overlay (e.target === e.currentTarget)
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("não chama onClose ao clicar dentro do sheet", () => {
    const onClose = vi.fn();
    render(
      <ModalSheet open={true} onClose={onClose}>
        <p>Conteúdo interno</p>
      </ModalSheet>
    );
    // O sheet tem stopPropagation — o clique não deve atingir o overlay
    fireEvent.click(screen.getByText("Conteúdo interno"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("chama onExitComplete após a animação de saída", async () => {
    const onExitComplete = vi.fn();
    const { rerender } = render(
      <ModalSheet open={true} onClose={() => {}} onExitComplete={onExitComplete}>
        conteúdo
      </ModalSheet>
    );

    rerender(
      <ModalSheet open={false} onClose={() => {}} onExitComplete={onExitComplete}>
        conteúdo
      </ModalSheet>
    );

    await waitFor(() => expect(onExitComplete).toHaveBeenCalledOnce());
  });
});
```

- [ ] **Step 2: Rodar os testes do ModalSheet**

```bash
npm run test -- tests/components/ModalSheet.test.tsx
```

Esperado: 9 passed

- [ ] **Step 3: Rodar toda a suíte de testes**

```bash
npm run test
```

Esperado: todos os testes passam, sem regressões.

- [ ] **Step 4: Commit**

```bash
git add tests/components/ModalSheet.test.tsx
git commit -m "test(ModalSheet): adiciona 9 casos de teste de componente"
```

---

## Critérios de aceite finais

- [ ] `npm run test` passa sem erros
- [ ] Entradas com `score=0` anteriores a `2026-06-22` são removidas do `localStorage` na primeira carga
- [ ] Guard key `continha-magica-history-cleaned-v1` é gravada após a limpeza
- [ ] `AGENTS.md` lista a nova chave na tabela de persistência
- [ ] `ModalSheet.test.tsx` contém 9 casos de teste, todos passando
- [ ] Nenhuma regressão nos testes existentes
