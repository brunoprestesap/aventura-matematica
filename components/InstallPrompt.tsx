"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, X, Share, MoreVertical, ArrowUpFromLine } from "lucide-react";

type Platform = "ios-safari" | "android-chrome" | "android-samsung" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSamsung = /samsungbrowser/.test(ua);

  if (isIOS && isSafari) return "ios-safari";
  if (isSamsung) return "android-samsung";
  if (isAndroid) return "android-chrome";
  if (!isIOS && !isAndroid && /mac|win|linux/.test(ua)) return "desktop";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setAlreadyInstalled(isStandalone());
  }, []);

  if (alreadyInstalled) return null;

  const title = "Colocar na tela inicial";

  const instructions: Record<Platform, { steps: React.ReactNode[]; tip?: string }> = {
    "ios-safari": {
      steps: [
        <span key="1">Toque no botão <strong>Compartilhar</strong> na barra do Safari.</span>,
        <span key="2">Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</span>,
        <span key="3">Confirme tocando em <strong>Adicionar</strong>.</span>,
      ],
      tip: "Pronto! O ícone colorido vai aparecer junto aos seus apps.",
    },
    "android-chrome": {
      steps: [
        <span key="1">Toque no menu <strong>⋮</strong> no canto superior direito do Chrome.</span>,
        <span key="2">Selecione <strong>Adicionar à tela inicial</strong> ou <strong>Instalar app</strong>.</span>,
        <span key="3">Confirme tocando em <strong>Adicionar</strong> ou <strong>Instalar</strong>.</span>,
      ],
      tip: "O app vai abrir em tela cheia, como se fosse um app nativo.",
    },
    "android-samsung": {
      steps: [
        <span key="1">Toque no menu <strong>⋮</strong> do Samsung Internet.</span>,
        <span key="2">Escolha <strong>Adicionar página à</strong> → <strong>Tela inicial</strong>.</span>,
        <span key="3">Toque em <strong>Adicionar</strong> para confirmar.</span>,
      ],
      tip: "Você pode arrastar o ícone para a posição que preferir.",
    },
    desktop: {
      steps: [
        <span key="1">Clique no ícone de instalação na barra de endereço do Chrome/Edge.</span>,
        <span key="2">Escolha <strong>Instalar Aventura Matemática</strong>.</span>,
        <span key="3">Confirme clicando em <strong>Instalar</strong>.</span>,
      ],
      tip: "No computador, o app abre em uma janela própria sem a barra de endereço.",
    },
    other: {
      steps: [
        <span key="1">Abra o site no navegador do seu celular.</span>,
        <span key="2">Toque no menu do navegador (geralmente ⋮ ou …).</span>,
        <span key="3">Procure por <strong>Adicionar à tela inicial</strong> ou <strong>Instalar app</strong>.</span>,
      ],
      tip: "Use Chrome ou Safari para ter a melhor experiência.",
    },
  };

  const content = instructions[platform] ?? instructions.other;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full border-purple-200 px-3 text-xs text-purple-700 hover:bg-purple-50 hover:text-purple-800 sm:px-4 sm:text-sm"
      >
        <Smartphone className="mr-1 size-3.5 sm:size-4" aria-hidden="true" />
        Instalar
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2
                  id="install-title"
                  className="text-lg font-black text-slate-800 sm:text-xl"
                >
                  {title}
                </h2>
                <p className="text-sm text-slate-500">
                  Acesse o Aventura Matemática como um app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-5 flex items-center justify-center gap-4 text-purple-600">
              {platform === "ios-safari" && (
                <>
                  <Share className="size-8" />
                  <ArrowUpFromLine className="size-8" />
                </>
              )}
              {platform.startsWith("android") && (
                <>
                  <MoreVertical className="size-8" />
                  <Smartphone className="size-8" />
                </>
              )}
              {platform === "desktop" && <Smartphone className="size-8" />}
              {platform === "other" && <Smartphone className="size-8" />}
            </div>

            <ol className="mb-4 space-y-3 text-sm text-slate-700 sm:text-base">
              {content.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            {content.tip && (
              <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 p-3 text-sm font-medium text-purple-700">
                💡 {content.tip}
              </div>
            )}

            <Button
              type="button"
              size="lg"
              onClick={() => setOpen(false)}
              className="mt-5 h-12 w-full rounded-xl bg-purple-500 text-base font-bold text-white shadow-md hover:bg-purple-600"
            >
              Entendi!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
