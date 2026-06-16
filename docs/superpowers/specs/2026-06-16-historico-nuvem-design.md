# Design — Histórico de quiz na nuvem (vinculado ao usuário)

**Data:** 2026-06-16
**Status:** Aprovado (aguardando revisão do spec antes do plano de implementação)

## Problema

Hoje o "Histórico de atividades" exibido em `components/HistoryPanel.tsx` é
lido **exclusivamente** do `localStorage` (chave `continha-magica-history`, via
`lib/history.ts` → `useHistory()`). Consequências:

- O histórico **não acompanha o usuário entre dispositivos**.
- Limpar dados do navegador / trocar de aparelho zera o histórico visível.
- O servidor já grava um `WeeklyScore` por sessão (em `POST /api/session`),
  vinculado ao `userId`, com `grade`, `correct`, `total`, `sessionDate` — mas
  esse registro **nunca é lido de volta**; existe só para auditoria/XP da liga.

## Objetivo

Para usuários autenticados, exibir um histórico que combine os registros locais
com os registros já persistidos no servidor, de forma que o histórico passe a
acompanhar o usuário entre dispositivos — **sem** quebrar o comportamento atual
para usuários anônimos (que continuam 100% locais).

## Decisões (definidas no brainstorm)

1. **Estratégia: mesclar nuvem + local.** Usuário logado vê a união dos
   registros do servidor e dos registros locais ainda não sincronizados.
   `localStorage` permanece como fallback offline e para anônimos.
2. **Modelo: reusar `WeeklyScore` + `clientId`.** Sem tabela nova. Adiciona um
   campo `clientId` opcional ao `WeeklyScore`, igual ao `id` que o cliente já
   gera em `makeId()` (`lib/history.ts`). Dedup do merge é exato por `clientId`.
3. **Sem backfill.** Registros locais feitos **antes** do login não são enviados
   ao servidor. Continuam visíveis localmente via merge, mas não se propagam a
   outros dispositivos. A partir do login, novas sessões vão ao servidor
   normalmente. (Evita inflar XP da liga e simplifica.)
4. **Fetch lazy.** O `GET` da nuvem só acontece quando o usuário abre o painel
   de histórico — nenhuma requisição extra para quem não olha o histórico.

## Fluxo de dados

### Gravação (a cada "Verificar respostas" em `QuizPage.handleVerify`)

1. Grava no `localStorage` exatamente como hoje (`addActivity` → `writeHistory`).
   O `ActivityRecord.id` (gerado por `makeId()`) é a chave estável que será
   reusada como `clientId`.
2. O `POST /api/session` em background passa a enviar também `clientId` (o mesmo
   `id` do `ActivityRecord` recém-criado). O cálculo de XP no servidor **não
   muda** — `clientId` é apenas persistido.

### Leitura (merge, ao abrir o painel)

1. `GET /api/historico` retorna os `WeeklyScore` do usuário autenticado,
   mapeados para `ActivityRecord` (`{ id: clientId ?? <id do registro>, grade,
   score: correct, total, completedAt: sessionDate.toISOString() }`), ordenados
   por data desc, limitados a 50. Anônimo → `401` (cliente trata como lista
   vazia, sem erro visível).
2. O painel mescla **(locais ∪ nuvem) deduplicando por `id`/`clientId`**,
   ordena por `completedAt` desc e limita a 50. Registros sem par no servidor
   (offline/anônimo) seguem aparecendo via local.

## Mudanças concretas

### Schema (`prisma/schema.prisma` + `prisma/schema.test.prisma`)

`WeeklyScore` ganha:

```prisma
clientId String? // id estável gerado no cliente (makeId), p/ dedup do histórico
```

- Sem `@unique` global. Opcional: `@@unique([userId, clientId])` para garantir
  idempotência por usuário (avaliar na implementação; `clientId` é nullable, o
  que é compatível com unique parcial no Postgres).
- Migration aplicada no Neon via conexão **unpooled** (ver AGENTS.md).
- `npm run test:db:push` para o schema de testes SQLite.
- `prisma generate` roda no build (não remover do script `build`).

### `app/api/session/route.ts`

- `SessionPayload` ganha `clientId?: string`.
- Validação leve: se presente, `typeof === "string"` e tamanho limitado
  (ex.: `<= 64`). Ausência é aceita (compatível com clientes antigos).
- `clientId` é gravado no `tx.weeklyScore.create({ data: { ... } })`.
- Nenhuma mudança no cálculo de XP nem na lógica de liga.

### `app/api/historico/route.ts` (novo)

- `GET` autenticado (`auth()`); sem sessão → `401`.
- Lê `WeeklyScore` do `userId`, `orderBy: { sessionDate: "desc" }`, `take: 50`.
- Retorna `{ activities: ActivityRecord[] }`.
- (Rota nova aprovada explicitamente pelo mantenedor neste brainstorm.)

### `lib/history.ts`

- Exporta `mergeHistories(local: ActivityHistory, cloud: ActivityRecord[]):
  ActivityHistory` — união dedup por `id`, ordenada por `completedAt` desc,
  `slice(0, 50)`. Pura e testável.
- Mantém `HISTORY_KEY`, `HISTORY_VERSION`, `USER_NAME_KEY`, `parseHistory`
  exportados (usados em testes).

### `components/HistoryPanel.tsx`

- Ao abrir o modal (lazy), dispara `GET /api/historico`.
- Estados: carregando (spinner discreto), erro (silencioso — cai pro local),
  sucesso (merge com o local via `mergeHistories`).
- Anônimo (`401`) → comportamento atual inalterado (só local).

### `components/QuizPage.tsx`

- No `fetch('/api/session')`, inclui `clientId` = `id` do `ActivityRecord`
  recém-criado em `handleVerify`. (Capturar o id retornado por `addActivity`/
  `makeId` para reaproveitar no payload.)

### Testes

- `tests/unit/lib/history.test.ts`: casos de `mergeHistories` (dedup por id,
  ordenação, limite 50, nuvem vazia, local vazio).
- `tests/api/historico.test.ts` (novo): autenticado retorna registros do
  usuário; anônimo → `401`; ordenação/limite.
- `tests/api/session.test.ts`: estender para verificar que `clientId` é
  persistido e que XP/liga continuam inalterados quando `clientId` é enviado.
- `tests/components/HistoryPanel.test.tsx`: merge com mock do fetch; estado
  anônimo; estado de carregando.

## Restrições respeitadas (AGENTS.md)

- Não cria novas chaves de `localStorage`.
- Não calcula XP no cliente.
- Acesso a `localStorage` segue via hooks de `lib/history.ts`.
- Rota nova (`/api/historico`) aprovada pelo mantenedor.
- pt-BR mantido na UI e comentários.
- `prisma generate` permanece no script de build.

## Fora de escopo (YAGNI)

- Backfill/migração de histórico local pré-login para o servidor.
- Paginação/scroll infinito além dos 50 registros.
- Sincronização em tempo real entre abas/dispositivos.
- Exclusão/edição de itens do histórico.
