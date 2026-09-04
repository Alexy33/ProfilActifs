import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ProfilsActifs — JEB/DNI",
  description:
    "Valorisation des competences par video courte et certification officielle des aptitudes professionnelles. Ministere du Job et Bonheur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Pas de `font-mono` sur <html> : la charte fixe Spectral pour le corps, et
    // une classe utilitaire ici primerait sur la regle de globals.css.
    <html
      lang="fr"
      className={cn(jetbrainsMono.variable, geistSans.variable, geistMono.variable)}
    >
      <head>
        {/* Spectral (corps de texte, charte R.10). Marianne n'est pas servie
            par Google Fonts : elle est auto-hebergee dans public/fonts et
            declaree en @font-face dans globals.css. Les familles Barlow /
            IBM Plex chargees ici auparavant n'etaient pas celles de la charte
            et n'etaient referencees par aucun composant. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Spectral:wght@300;400;500;600;700&display=swap"
        />
        {/* Marianne porte les titres : precharger le fichier evite que le
            premier rendu affiche les titres dans la police de repli. */}
        <link
          rel="preload"
          href="/fonts/Marianne-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
