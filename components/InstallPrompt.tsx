"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  X,
  Share,
  MoreVertical,
  Download,
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

function AndroidIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="phoneBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1F2937" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="screenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F3F4F6" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </linearGradient>
        <linearGradient id="appIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect x="45" y="10" width="110" height="140" rx="16" fill="url(#phoneBody)" />
      <rect x="52" y="22" width="96" height="116" rx="10" fill="url(#screenGlow)" />
      <rect x="52" y="22" width="96" height="18" rx="10" fill="#FFFFFF" />
      <circle cx="62" cy="31" r="3" fill="#EF4444" />
      <circle cx="72" cy="31" r="3" fill="#F59E0B" />
      <circle cx="82" cy="31" r="3" fill="#10B981" />
      <circle cx="136" cy="31" r="2" fill="#6B7280" />
      <circle cx="142" cy="31" r="2" fill="#6B7280" />
      <circle cx="130" cy="31" r="2" fill="#6B7280" />
      <g transform="translate(85, 65)">
        <rect x="0" y="0" width="30" height="30" rx="8" fill="url(#appIconGradient)" />
        <circle cx="15" cy="16" r="10" fill="#FDE68A" />
        <circle cx="11" cy="14" r="1.5" fill="#1F2937" />
        <circle cx="19" cy="14" r="1.5" fill="#1F2937" />
        <path d="M 10 19 Q 15 23 20 19" fill="none" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 2 L17 8 L23 8 L18 12 L20 18 L15 14 L10 18 L12 12 L7 8 L13 8 Z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
      </g>
      <g transform="translate(138, 18)">
        <ellipse cx="0" cy="0" rx="8" ry="8" fill="#EC4899" opacity="0.2" />
        <path d="M2 4 L2 14 L5 14 L5 20 L11 20 L11 14 L14 14 L14 4 Q14 0 8 0 Q2 0 2 4" fill="#EC4899" />
      </g>
    </svg>
  );
}

function IOSIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="phoneBodyIos" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1F2937" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="screenGlowIos" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F3F4F6" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </linearGradient>
        <linearGradient id="appIconGradientIos" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect x="45" y="10" width="110" height="140" rx="20" fill="url(#phoneBodyIos)" />
      <rect x="52" y="22" width="96" height="116" rx="14" fill="url(#screenGlowIos)" />
      <g transform="translate(130, 34)">
        <rect x="-10" y="-10" width="20" height="20" rx="4" fill="#FFFFFF" />
        <path d="M0 -5 L0 2 M-3 -2 L0 -5 L3 -2" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="-3" y="2" width="6" height="5" rx="1" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
      </g>
      <g transform="translate(85, 65)">
        <rect x="0" y="0" width="30" height="30" rx="8" fill="url(#appIconGradientIos)" />
        <circle cx="15" cy="16" r="10" fill="#FDE68A" />
        <circle cx="11" cy="14" r="1.5" fill="#1F2937" />
        <circle cx="19" cy="14" r="1.5" fill="#1F2937" />
        <path d="M 10 19 Q 15 23 20 19" fill="none" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 2 L17 8 L23 8 L18 12 L20 18 L15 14 L10 18 L12 12 L7 8 L13 8 Z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
      </g>
      <g transform="translate(150, 30)">
        <ellipse cx="0" cy="0" rx="8" ry="8" fill="#3B82F6" opacity="0.2" />
        <path d="M2 4 L2 14 L5 14 L5 20 L11 20 L11 14 L14 14 L14 4 Q14 0 8 0 Q2 0 2 4" fill="#3B82F6" />
      </g>
    </svg>
  );
}

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const platform = useMemo(() => detectPlatform(), []);
  const [selectedOS, setSelectedOS] = useState<OS>(() =>
    platform.os === "ios" ? "ios" : "android"
  );
  const alreadyInstalled = useMemo(() => isStandalone(), []);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showNativeInstall, setShowNativeInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowNativeInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(() => setOpen(false), 250);
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
    if (outcome === "accepted") handleClose();
  }, [deferredPrompt, handleClose]);

  if (alreadyInstalled) return null;

  const androidInstructions: Record<Browser, { name: string; steps: string[]; tip: string }> = {
    chrome: {
      name: "Google Chrome",
      steps: [
        "Toque no menu ⋮ no canto superior direito do Chrome.",
        "Selecione Adicionar à tela inicial ou Instalar app.",
        "Confirme tocando em Adicionar ou Instalar.",
      ],
      tip: "No Android, o app abre em tela cheia, sem a barra de endereço.",
    },
    samsung: {
      name: "Samsung Internet",
      steps: [
        "Toque no menu ⋮ no canto inferior ou superior.",
        "Escolha Adicionar página à → Tela inicial.",
        "Toque em Adicionar para confirmar.",
      ],
      tip: "Você pode arrastar o ícone colorido para a posição que preferir.",
    },
    firefox: {
      name: "Firefox",
      steps: [
        "Toque no menu ⋮ no canto inferior direito.",
        "Selecione Adicionar à tela inicial.",
        "Toque em Adicionar na janela de confirmação.",
      ],
      tip: "O Firefox cria um atalho com o ícone do Aventura Matemática.",
    },
    other: {
      name: "navegador Android",
      steps: [
        "Toque no menu do navegador (geralmente ⋮ ou …).",
        "Procure por Adicionar à tela inicial ou Instalar.",
        "Confirme a instalação.",
      ],
      tip: "Recomendamos usar o Chrome para a melhor experiência.",
    },
  };

  const iosInstructions = {
    name: "Safari",
    steps: [
      "Toque no botão Compartilhar na barra inferior do Safari.",
      "Role para baixo e selecione Adicionar à Tela de Início.",
      "Toque em Adicionar no canto superior direito.",
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
        className="group rounded-full border-purple-200 bg-white/80 px-2.5 text-xs font-semibold text-purple-700 shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 hover:shadow-md sm:px-4 sm:text-sm"
      >
        <Smartphone className="mr-1 size-3.5 transition-transform group-hover:scale-110 sm:size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Instalar app</span>
        <span className="sm:hidden">Instalar</span>
      </Button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center p-0 transition-colors duration-300 sm:items-center sm:p-4 ${
            isVisible ? "bg-slate-900/50 backdrop-blur-sm" : "bg-transparent"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-title"
        >
          <div
            className={`relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl transition-all duration-300 ease-out sm:max-h-[85vh] sm:rounded-[2rem] ${
              isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
            }`}
          >
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Decorative top gradient */}
              <div className="relative">
                <div className="h-28 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 sm:h-32" />

                {/* Close button */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-4 sm:top-4 sm:h-9 sm:w-9"
                  aria-label="Fechar"
                >
                  <X className="size-4 sm:size-5" />
                </button>

                {/* Illustration - positioned over gradient */}
                <div className="absolute -bottom-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur-sm sm:h-28 sm:w-28 sm:rounded-3xl sm:p-3">
                  {selectedOS === "ios" ? <IOSIllustration /> : <AndroidIllustration />}
                </div>
              </div>

              <div className="px-4 pb-5 pt-14 sm:px-6 sm:pb-6 sm:pt-16">
                {/* Header */}
                <div className="mb-4 text-center sm:mb-5">
                  <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700 sm:mb-2 sm:px-3 sm:py-1 sm:text-xs">
                    <Download className="size-3 sm:size-3.5" />
                    Instalação rápida
                  </span>
                  <h2
                    id="install-title"
                    className="text-xl font-black tracking-tight text-slate-800 sm:text-2xl"
                  >
                    Colocar na tela inicial
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                    Acesse o Aventura Matemática como um app.
                  </p>
                </div>

                {/* OS Tabs */}
                <div className="mb-4 flex rounded-xl bg-slate-100 p-1 sm:mb-5 sm:rounded-2xl sm:p-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedOS("android")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all duration-200 sm:gap-2 sm:rounded-xl sm:py-3 sm:text-sm ${
                      selectedOS === "android"
                        ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                    }`}
                  >
                    <Smartphone className="size-3.5 sm:size-4" />
                    Android
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOS("ios")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all duration-200 sm:gap-2 sm:rounded-xl sm:py-3 sm:text-sm ${
                      selectedOS === "ios"
                        ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                    }`}
                  >
                    <Share className="size-3.5 sm:size-4" />
                    iPhone/iPad
                  </button>
                </div>

                {/* Browser badge */}
                <div className="mb-3 flex items-center justify-between sm:mb-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700 sm:px-3 sm:py-1.5 sm:text-xs">
                    {selectedOS === "android" ? (
                      <MoreVertical className="size-3 sm:size-3.5" />
                    ) : (
                      <Share className="size-3 sm:size-3.5" />
                    )}
                    {content.name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 sm:text-xs">
                    {content.steps.length} passos
                  </span>
                </div>

                {/* Steps */}
                <ol className="mb-4 space-y-2 sm:mb-5 sm:space-y-3">
                  {content.steps.map((step, index) => (
                    <li
                      key={index}
                      className="group flex gap-3 rounded-xl bg-slate-50 p-2.5 transition-colors hover:bg-purple-50/50 sm:gap-4 sm:rounded-2xl sm:p-3.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-black text-white shadow-sm transition-transform group-hover:scale-110 sm:h-8 sm:w-8 sm:rounded-xl sm:text-sm">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-xs leading-relaxed text-slate-700 sm:pt-1 sm:text-sm">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>

                {/* Tip card */}
                <div className="mb-4 rounded-xl bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 p-3 sm:mb-5 sm:rounded-2xl sm:p-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm sm:h-8 sm:w-8 sm:text-lg">
                      💡
                    </span>
                    <p className="text-xs font-medium leading-relaxed text-purple-800 sm:text-sm">
                      {content.tip}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky actions */}
            <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] sm:p-5">
              <div className="space-y-2.5 sm:space-y-3">
                {selectedOS === "android" && showNativeInstall && (
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleNativeInstall}
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-sm font-bold text-white shadow-lg shadow-green-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98] sm:h-12 sm:text-base"
                  >
                    <Download className="mr-2 size-4 sm:size-5" />
                    Instalar agora
                  </Button>
                )}
                <Button
                  type="button"
                  size="lg"
                  onClick={handleClose}
                  className={`w-full rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98] sm:text-base ${
                    selectedOS === "android" && showNativeInstall
                      ? "h-11 bg-purple-500 hover:bg-purple-600 sm:h-12"
                      : "h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 sm:h-12"
                  }`}
                >
                  Entendi!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
