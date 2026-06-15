"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  X,
  Share,
  MoreVertical,
  ArrowUpFromLine,
  Download,
  CheckCircle2,
} from "lucide-react";

type OS = "android" | "ios" | "desktop" | "other";
type Browser = "chrome" | "samsung" | "firefox" | "other";

interface DetectedPlatform {
  os: OS;
  browser: Browser;
}

function detectPlatform(): DetectedPlatform {
  if (typeof window === "undefined") return { os: "other", browser: "other" };

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSamsung = /samsungbrowser/.test(ua);
  const isFirefox = /firefox/.test(ua);

  let os: OS = "other";
  if (isIOS) os = "ios";
  else if (isAndroid) os = "android";
  else if (/mac|win|linux/.test(ua)) os = "desktop";

  let browser: Browser = "other";
  if (isSamsung) browser = "samsung";
  else if (isFirefox) browser = "firefox";
  else if (isAndroid || /chrome/.test(ua)) browser = "chrome";

  return { os, browser };
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
  const [platform, setPlatform] = useState<DetectedPlatform>({ os: "other", browser: "other" });
  const [selectedOS, setSelectedOS] = useState<OS>("android");
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showNativeInstall, setShowNativeInstall] = useState(false);

  useEffect(() => {
    const detected = detectPlatform();
    setPlatform(detected);
    setSelectedOS(detected.os === "ios" ? "ios" : "android");
    setAlreadyInstalled(isStandalone());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowNativeInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt as unknown as {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setDeferredPrompt(null);
    setShowNativeInstall(outcome !== "accepted");
    if (outcome === "accepted") setOpen(false);
  }, [deferredPrompt]);

  if (alreadyInstalled) return null;

  const androidInstructions: Record<Browser, { name: string; steps: React.ReactNode[]; tip: string }> = {
    chrome: {
      name: "Google Chrome",
      steps: [
        <span key="1">Toque no menu <strong>⋮</strong> no canto superior direito do Chrome.</span>,
        <span key="2">Selecione <strong>Adicionar à tela inicial</strong> ou <strong>Instalar app</strong>.</span>,
        <span key="3">Confirme tocando em <strong>Adicionar</strong> ou <strong>Instalar</strong>.</span>,
      ],
      tip: "No Android, o app abre em tela cheia, sem a barra de endereço.",
    },
    samsung: {
      name: "Samsung Internet",
      steps: [
        <span key="1">Toque no menu <strong>⋮</strong> no canto inferior ou superior.</span>,
        <span key="2">Escolha <strong>Adicionar página à</strong> → <strong>Tela inicial</strong>.</span>,
        <span key="3">Toque em <strong>Adicionar</strong> para confirmar.</span>,
      ],
      tip: "Você pode arrastar o ícone colorido para a posição que preferir.",
    },
    firefox: {
      name: "Firefox",
      steps: [
        <span key="1">Toque no menu <strong>⋮</strong> no canto inferior direito.</span>,
        <span key="2">Selecione <strong>Adicionar à tela inicial</strong>.</span>,
        <span key="3">Toque em <strong>Adicionar</strong> na janela de confirmação.</span>,
      ],
      tip: "O Firefox cria um atalho com o ícone do Aventura Matemática.",
    },
    other: {
      name: "navegador Android",
      steps: [
        <span key="1">Toque no menu do navegador (geralmente <strong>⋮</strong> ou <strong>…</strong>).</span>,
        <span key="2">Procure por <strong>Adicionar à tela inicial</strong> ou <strong>Instalar</strong>.</span>,
        <span key="3">Confirme a instalação.</span>,
      ],
      tip: "Recomendamos usar o Chrome para a melhor experiência.",
    },
  };

  const iosInstructions = {
    name: "Safari",
    steps: [
      <span key="1">Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.</span>,
      <span key="2">Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</span>,
      <span key="3">Toque em <strong>Adicionar</strong> no canto superior direito.</span>,
    ],
    tip: "O ícone colorido vai aparecer na sua tela inicial, junto aos outros apps.",
  };

  const content = selectedOS === "ios" ? iosInstructions : androidInstructions[platform.browser] ?? androidInstructions.other;

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
                  Colocar na tela inicial
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

            {/* Tabs */}
            <div className="mb-5 flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSelectedOS("android")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                  selectedOS === "android"
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Smartphone className="size-4" />
                Android
              </button>
              <button
                type="button"
                onClick={() => setSelectedOS("ios")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                  selectedOS === "ios"
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Share className="size-4" />
                iPhone/iPad
              </button>
            </div>

            {/* Visual hint */}
            <div className="mb-5 flex items-center justify-center gap-4 text-purple-600">
              {selectedOS === "ios" ? (
                <>
                  <Share className="size-8" />
                  <ArrowUpFromLine className="size-8" />
                  <CheckCircle2 className="size-8" />
                </>
              ) : (
                <>
                  <MoreVertical className="size-8" />
                  <Download className="size-8" />
                  <CheckCircle2 className="size-8" />
                </>
              )}
            </div>

            {/* Browser tag */}
            <div className="mb-3 text-center">
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                {content.name}
              </span>
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

            <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 p-3 text-sm font-medium text-purple-700">
              💡 {content.tip}
            </div>

            {selectedOS === "android" && showNativeInstall && (
              <Button
                type="button"
                size="lg"
                onClick={handleNativeInstall}
                className="mt-4 h-12 w-full rounded-xl bg-green-500 text-base font-bold text-white shadow-md hover:bg-green-600"
              >
                <Download className="mr-2 size-5" />
                Instalar agora
              </Button>
            )}

            <Button
              type="button"
              size="lg"
              onClick={() => setOpen(false)}
              className={`h-12 w-full rounded-xl text-base font-bold text-white shadow-md ${
                selectedOS === "android" && showNativeInstall
                  ? "mt-3 bg-purple-500 hover:bg-purple-600"
                  : "mt-5 bg-purple-500 hover:bg-purple-600"
              }`}
            >
              Entendi!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
