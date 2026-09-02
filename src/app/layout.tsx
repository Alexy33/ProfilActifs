import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "ProfilsActifs — JEB/DNI",
  description:
    "Valorisation des competences par video courte et certification officielle des aptitudes professionnelles. Ministere du Job et Bonheur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="mx-auto w-full max-w-[1280px] flex-1 px-7 pt-9 pb-18">{children}</main>
            <SiteFooter />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
