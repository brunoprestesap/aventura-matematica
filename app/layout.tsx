import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/next";
import { auth } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Continha Mágica — Atividades de Matemática para o Ensino Fundamental",
    template: "%s | Continha Mágica",
  },
  description:
    "Atividades de matemática gratuitas do 1º ao 9º ano: adição, subtração, multiplicação, divisão, sequências e problemas. Geradas na hora, sem cadastro.",
  keywords: [
    "atividades de matemática",
    "exercícios de matemática ensino fundamental",
    "quiz de matemática online",
    "matemática 1 ano",
    "matemática 2 ano",
    "matemática 3 ano",
    "matemática 4 ano",
    "matemática 5 ano",
    "matemática 6 ano",
    "matemática 7 ano",
    "matemática 8 ano",
    "matemática 9 ano",
    "adição subtração multiplicação divisão",
    "atividades matemática crianças",
  ],
  authors: [{ name: "Continha Mágica" }],
  creator: "Continha Mágica",
  metadataBase: new URL("https://continhamagica.vercel.app"),
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Continha Mágica",
  },
  openGraph: {
    title: "Continha Mágica — Atividades de Matemática para o Ensino Fundamental",
    description:
      "Atividades de matemática gratuitas do 1º ao 9º ano. Geradas na hora, sem cadastro.",
    url: "https://continhamagica.vercel.app",
    siteName: "Continha Mágica",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Continha Mágica — Atividades de Matemática para o Ensino Fundamental",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Continha Mágica — Atividades de Matemática",
    description: "Questões de matemática do 1º ao 9º ano. Grátis, sem cadastro.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* refetchOnWindowFocus=false evita refetches desnecessários no WebView
            do app nativo e reduz requests quando o PWA perde/ganha foco. */}
        <SessionProvider session={session} refetchOnWindowFocus={false}>
          {children}
        </SessionProvider>
        <Analytics />
        {process.env.NODE_ENV === "production" ? (
          <Script id="register-sw" strategy="afterInteractive">
            {`
              // Registra o service worker do Continha Mágica (apenas em produção)
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `}
          </Script>
        ) : (
          <Script id="unregister-sw" strategy="afterInteractive">
            {`
              // Em desenvolvimento, nenhum service worker deve ficar ativo:
              // um SW servindo o shell em cache quebra o HMR do Next e causa
              // loops de recarregamento. Remove registros e caches existentes.
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations()
                  .then((regs) => regs.forEach((reg) => reg.unregister()))
                  .catch(() => {});
              }
              if (typeof caches !== 'undefined') {
                caches.keys()
                  .then((keys) => keys.forEach((key) => caches.delete(key)))
                  .catch(() => {});
              }
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
