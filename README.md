# Aventura Matemática

Site de atividades de matemática para estudantes do 4º ano do ensino fundamental (9-10 anos).

A cada carregamento da página, 20 questões aleatórias são geradas nas categorias:

- Adição
- Subtração
- Multiplicação
- Divisão
- Sequência numérica
- Problemas contextualizados simples

## Stack

- Next.js 16 (App Router + TypeScript)
- Tailwind CSS v4
- shadcn/ui
- Lucide React
- canvas-confetti

## Como rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Build de produção

```bash
npm run build
npm start
```

## Funcionalidades

- 20 questões geradas aleatoriamente a cada carga da página
- Correção em lote com botão "Verificar respostas"
- Feedback visual verde/vermelho com resposta correta
- Placar final
- Botão "Novas questões"
- Animação de celebração para 18+ acertos
- Design responsivo e colorido para crianças
