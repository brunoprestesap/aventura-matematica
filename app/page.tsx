import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Minus, X, Divide, TrendingUp, BookOpen } from "lucide-react";
import { Pixel } from "@/components/Pixel";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://continhamagica.vercel.app",
  },
  description:
    "Atividades de matemática do 1º ao 9º ano com 15 dias grátis. Adição, subtração, multiplicação, divisão, sequências e problemas. Sem cadastro para começar.",
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
      "Atividades de matemática do 1º ao 9º ano do ensino fundamental",
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
            Do 1º ao 9º ano — adição, subtração, multiplicação, divisão, sequências
            e problemas contextualizados. Experimente grátis por 15 dias.
          </p>
          <Link
            href="/jogar"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-8 py-4 text-lg font-semibold text-white hover:bg-[#0f766e] transition-colors"
          >
            Começar 15 dias grátis →
          </Link>
          <p className="text-sm text-[#CCFBF1]">
            Já é assinante?{" "}
            <Link
              href="/jogar"
              className="underline underline-offset-2 hover:text-white transition-colors"
            >
              Acesse aqui
            </Link>
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
              <span className="opacity-40 cursor-default" title="Em breve">Política de Privacidade</span>
            </div>
            <p>© 2026 Continha Mágica — matemática que encanta</p>
          </div>
        </footer>
      </main>
    </>
  );
}
