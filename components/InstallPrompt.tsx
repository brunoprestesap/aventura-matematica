"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  X,
  Share,
  MoreVertical,
  Download,
  CheckCircle2,
  Copy,
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
      </defs>
      <rect x="45" y="10" width="110" height="140" rx="16" fill="url(#phoneBody)" />
      <rect x="52" y="22" width="96" height="116" rx="10" fill="url(#screenGlow)" />
      {/* Browser bar */}
      <rect x="52" y="22" width="96" height="18" rx="10" fill="#FFFFFF" />
      <circle cx="62" cy="31" r="3" fill="#EF4444" />
      <circle cx="72" cy="31" r="3" fill="#F59E0B" />
      <circle cx="82" cy="31" r="3" fill="#10B981" />
      {/* Menu dots */}
      <circle cx="136" cy="31" r="2" fill="#6B7280" />
      <circle cx="142" cy="31" r="2" fill="#6B7280" />
      <circle cx="130" cy="31" r="2" fill="#6B7280" />
      {/* App icon floating */}
      <g transform="translate(85, 65)">
        <rect x="0" y="0" width="30" height="30" rx="8" fill="url(#appIconGradient)" />
        <circle cx="15" cy="16" r="10" fill="#FDE68A" />
        <circle cx="11" cy="14" r="1.5" fill="#1F2937" />
        <circle cx="19" cy="14" r="1.5" fill="#1F2937" />
        <path d="M 10 19 Q 15 23 20 19" fill="none" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 2 L17 8 L23 8 L18 12 L20 18 L15 14 L10 18 L12 12 L7 8 L13 8 Z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
      </g>
      {/* Finger pointer */}
      <g transform="translate(138, 18)">
        <ellipse cx="0" cy="0" rx="8" ry="8" fill="#EC4899" opacity="0.2" />
        <path d="M2 4 L2 14 L5 14 L5 20 L11 20 L11 14 L14 14 L14 4 Q14 0 8 0 Q2 0 2 4" fill="#EC4899" />
      </g>
      <defs>
        <linearGradient id="appIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
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
      </defs>
      <rect x="45" y="10" width="110" height="140" rx="20" fill="url(#phoneBodyIos)" />
      <rect x="52" y="22" width="96" height="116" rx="14" fill="url(#screenGlowIos)" />
      {/* Share icon in toolbar */}
      <g transform="translate(130, 34)">
        <rect x="-10" y="-10" width="20" height="20" rx="4" fill="#FFFFFF" />
        <path d="M0 -5 L0 2 M-3 -2 L0 -5 L3 -2" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="-3" y="2" width="6" height="5" rx="1" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
      </g>
      {/* App icon floating */}
      <g transform="translate(85, 65)">
        <rect x="0" y="0" width="30" height="30" rx="8" fill="url(#appIconGradientIos)" />
        <circle cx="15" cy="16" r="10" fill="#FDE68A" />
        <circle cx="11" cy="14" r="1.5" fill="#1F2937" />
        <circle cx="19" cy="14" r="1.5" fill="#1F2937" />
        <path d="M 10 19 Q 15 23 20 19" fill="none" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 2 L17 8 L23 8 L18 12 L20 18 L15 14 L10 18 L12 12 L7 8 L13 8 Z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />
      </g>
      {/* Finger pointer */}
      <g transform="translate(150, 30)">
        <ellipse cx="0" cy="0" rx="8" ry="8" fill="#3B82F6" opacity="0.2" />
        <path d="M2 4 L2 14 L5 14 L5 20 L11 20 L11 14 L14 14 L14 4 Q14 0 8 0 Q2 0 2 4" fill="#3B82F6" />
      </g>
      <defs>
        <linearGradient id="appIconGradientIos" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
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

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setOpen(false), 250);
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
        className="group rounded-full border-purple-200 bg-white/80 px-3 text-xs font-semibold text-purple-700 shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 hover:shadow-md sm:px-4 sm:text-sm"
      >
        <Smartphone className="mr-1.5 size-3.5 transition-transform group-hover:scale-110 sm:size-4" aria-hidden="true" />
        Instalar app
      </Button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center p-4 transition-colors duration-300 sm:items-center ${
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
            className={`relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl transition-all duration-300 ease-out ${
              isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
            }`}
          >
            {/* Decorative top gradient */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>

            <div className="relative px-6 pb-6 pt-8">
              {/* Illustration */}
              <div className="mx-auto mb-5 h-36 w-36 rounded-3xl bg-white/90 p-3 shadow-lg backdrop-blur-sm">
                {selectedOS === "ios" ? <IOSIllustration /> : <AndroidIllustration />}
              </div>

              {/* Header */}
              <div className="mb-6 text-center">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-purple-700">
                  <Download className="size-3.5" />
                  Instalação rápida
                </span>
                <h2
                  id="install-title"
                  className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl"
                >
                  Colocar na tela inicial
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Acesse o Aventura Matemática como um app nativo.
                </p>
              </div>

              {/* OS Tabs */}
              <div className="mb-6 flex rounded-2xl bg-slate-100 p-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedOS("android")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
                    selectedOS === "android"
                      ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                  }`}
                >
                  <Smartphone className="size-4" />
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOS("ios")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
                    selectedOS === "ios"
                      ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                  }`}
                >
                  <Share className="size-4" />
                  iPhone/iPad
                </button>
              </div>

              {/* Browser badge */}
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">
                  {selectedOS === "android" ? (
                    <MoreVertical className="size-3.5" />
                  ) : (
                    <Share className="size-3.5" />
                  )}
                  {content.name}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {content.steps.length} passos
                </span>
              </div>

              {/* Steps */}
              <ol className="mb-5 space-y-3">
                {content.steps.map((step, index) => (
                  <li
                    key={index}
                    className="group flex gap-4 rounded-2xl bg-slate-50 p-3.5 transition-colors hover:bg-purple-50/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-black text-white shadow-sm transition-transform group-hover:scale-110">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-sm leading-relaxed text-slate-700">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              {/* Tip card */}
              <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                    💡
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-purple-800">
                    {content.tip}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {selectedOS === "android" && showNativeInstall && (
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleNativeInstall}
                    className="h-13 w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-base font-bold text-white shadow-lg shadow-green-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98]"
                  >
                    <Download className="mr-2 size-5" />
                    Instalar agora
                  </Button>
                )}
                <Button
                  type="button"
                  size="lg"
                  onClick={handleClose}
                  className={`w-full rounded-xl text-base font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98] ${
                    selectedOS === "android" && showNativeInstall
                      ? "h-12 bg-purple-500 hover:bg-purple-600"
                      : "h-13 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
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
