import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
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
  title: "Continha Mágica",
  description: "Atividades de matemática que encantam — do 1º ao 9º ano",
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
    title: "Continha Mágica",
    description: "Atividades de matemática que encantam — do 1º ao 9º ano",
    type: "website",
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
