# Design: Melhorias de alta prioridade — Migração do histórico e testes do ModalSheet

**Data:** 2026-06-22  
**Status:** Aprovado

---

## Contexto

Duas melhorias identificadas após o code review de junho/2026:

1. **Histórico corrompido**: um bug no `handleVerify` fazia com que `score` fosse sempre `0` ao salvar no histórico local (o `useMemo` de `statuses` retorna todos `"idle"` enquanto `submitted=false`). O bug foi corrigido em 22/06/2026. Entradas antigas no `localStorage` com `score: 0` são inválidas para a maioria dos usuários e devem ser removidas.

2. **Cobertura do ModalSheet**: o componente `components/ModalSheet.tsx` foi criado durante as correções do code review mas não possui nenhum teste de componente.

---

## Melhoria 1 — Migração do histórico corrompido

### Escopo

- Remove do `localStorage` as entradas de histórico onde `score === 0 && completedAt < "2026-06-22T00:00:00.000Z"`.
- Roda uma única vez por dispositivo (guard key).
- Não afeta o histórico da nuvem (para usuários autenticados, o `mergeHistories` já prioriza dados do servidor, que sempre foram calculados corretamente).

### Implementação

**`lib/migrate.ts`** — nova função `cleanCorruptedHistoryScores()`:

```ts
const HISTORY_CLEANED_KEY = "continha-magica-history-cleaned-v1";
const BUG_FIX_DATE = "2026-06-22T00:00:00.000Z";

export function cleanCorruptedHistoryScores(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(HISTORY_CLEANED_KEY)) return;
  try {
    const history = readHistory();
    const cleaned = history.filter(
      (a) => !(a.score === 0 && a.completedAt < BUG_FIX_DATE)
    );
    if (cleaned.length < history.length) writeHistory(cleaned);
    localStorage.setItem(HISTORY_CLEANED_KEY, "1");
  } catch {
    // ignora erros de quota ou parsing — a migration não é crítica
  }
}
```

**`components/QuizPage.tsx`** — chamar `cleanCorruptedHistoryScores()` junto com `migrateLocalStorage()` no escopo de módulo (já existente).

**`AGENTS.md` / seção "Persistência local"** — adicionar a nova chave à tabela:

| Chave | Propósito | Gerenciado em |
|-------|-----------|---------------|
| `continha-magica-history-cleaned-v1` | Guard da migration de scores corrompidos | `lib/migrate.ts` |

### Dependências

- `readHistory()` e `writeHistory()` já exportados de `lib/history.ts`.
- Sem novas dependências de pacotes.

### Comportamento esperado

- Usuário com entradas antigas `score=0` (anteriores a 22/06/2026): entradas removidas na primeira carga após o deploy.
- Usuário com entradas legítimas `score=0` posteriores a 22/06/2026: não afetadas.
- Guard key impede re-execução em cargas subsequentes.
- Falha silenciosa: se `localStorage` estiver cheio ou indisponível, a migration é ignorada e a guard key não é gravada (tentará novamente na próxima sessão).

---

## Melhoria 2 — Testes do ModalSheet

### Arquivo

`tests/components/ModalSheet.test.tsx`

### Casos de teste (9)

| # | Descrição | Verificação |
|---|-----------|-------------|
| 1 | Renderiza children quando `open=true` | `getByText` encontra o conteúdo |
| 2 | Não renderiza nada quando `open=false` | `queryByRole("dialog")` é `null` |
| 3 | `aria-label` aplicado no dialog | `getByRole("dialog", { name: "..." })` |
| 4 | `aria-labelledby` aplicado no dialog | `aria-labelledby` aponta para o id do título |
| 5 | `overlayClassName` mesclado ao overlay | overlay tem a classe customizada |
| 6 | `sheetClassName` mesclado ao sheet | sheet tem a classe customizada |
| 7 | Chama `onClose` ao clicar no overlay | `fireEvent.click(overlay)` → `onClose` chamado |
| 8 | Não chama `onClose` ao clicar no sheet | `fireEvent.click(sheet)` → `onClose` não chamado |
| 9 | `onExitComplete` chamado após saída | Mudar `open` para `false` → callback chamado |

### Infraestrutura

- Usa o `render` customizado de `tests/components/test-utils.tsx` (envolve em `LazyMotion strict`).
- `MotionGlobalConfig.skipAnimations = true` já está ativo em `vitest.setup.ts` — garante que `AnimatePresence` processa saída e chama `onExitComplete` sincronamente.
- `fireEvent` do `@testing-library/react` para interações de clique.

### Sem novas dependências

Todas as ferramentas (`@testing-library/react`, `vitest`, `fireEvent`) já estão no projeto.

---

## Ordem de implementação

1. `lib/migrate.ts` — adicionar `cleanCorruptedHistoryScores()`
2. `components/QuizPage.tsx` — chamar a nova função
3. `AGENTS.md` — atualizar tabela de persistência
4. `tests/components/ModalSheet.test.tsx` — escrever os 9 testes
5. Rodar `npm run test` e confirmar que todos passam
6. Branch → commit → PR → merge → deploy

---

## Critérios de aceite

- `npm run test` passa sem erros.
- Entradas com `score=0` anteriores a 22/06/2026 são removidas do `localStorage` na primeira carga.
- Guard key `continha-magica-history-cleaned-v1` é gravada após a limpeza.
- `ModalSheet.test.tsx` contém 9 casos de teste, todos passando.
- Nenhuma regressão nos testes existentes.
