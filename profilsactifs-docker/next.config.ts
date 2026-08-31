import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indispensable pour le stage "runner" du Dockerfile.
  // Genere .next/standalone : un server.js autonome avec uniquement les
  // dependances reellement utilisees. Image finale ~180 Mo au lieu de ~1,2 Go.
  output: "standalone",

  // better-sqlite3 est un binaire natif (.node). Le bundler de Next.js ne
  // sait pas l'inliner : il faut le laisser en require() cote serveur.
  serverExternalPackages: ["better-sqlite3"],

  // Le tracing de Next.js ne suit que les imports statiques. Les fichiers
  // .sql de Drizzle sont lus a l'execution : on les inclut explicitement,
  // sinon les migrations echouent dans l'image standalone.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },

  // Vignettes des videos YouTube / Vimeo (integration par iframe, cf. CDC 3.2)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
    ],
  },
};

export default nextConfig;
