# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# ProfilsActifs - Next.js 15 + better-auth + Drizzle/SQLite + Tailwind/shadcn
# Image multi-stage : base -> deps -> dev | builder -> runner
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# 1. BASE : socle commun a tous les stages
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base

# libc6-compat : shim glibc reclame par certains binaires precompiles (sharp,
# swc) sur Alpine qui tourne sous musl. Sans lui : "Error loading shared library".
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# 2. DEPS : installation des dependances (couche mise en cache)
# ---------------------------------------------------------------------------
FROM base AS deps

# better-sqlite3 est un module natif : il se compile a l'installation.
# python3/make/g++ sont necessaires uniquement ICI, jamais dans l'image finale.
RUN apk add --no-cache python3 make g++

# On copie d'abord uniquement les manifestes : tant que package.json et le
# lockfile ne changent pas, Docker reutilise le cache et saute le npm ci.
COPY package.json package-lock.json ./

# npm ci = installation deterministe depuis le lockfile (jamais "npm install"
# dans une image : il pourrait resoudre des versions differentes).
# --mount=type=cache garde le cache npm entre deux builds sans l'embarquer
# dans la couche finale.
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---------------------------------------------------------------------------
# 3. DEV : cible utilisee par le profil "dev" du docker-compose
# ---------------------------------------------------------------------------
FROM base AS dev

ENV NODE_ENV=development

# En dev le code source arrive par bind mount (voir docker-compose.yml).
# On n'embarque donc que node_modules, deja compile pour Alpine/musl :
# c'est ce qui evite le classique "better-sqlite3 was compiled against a
# different Node.js version" quand on monte le node_modules de l'hote.
COPY --from=deps /app/node_modules ./node_modules

# /data  -> volume nomme (base SQLite)
# /app/.next -> volume anonyme. Ces repertoires doivent exister ET appartenir
# a l'utilisateur node AVANT la creation des volumes : Docker recopie leurs
# permissions au premier montage. Sinon ils arrivent en root et `next dev`
# echoue avec EACCES.
RUN mkdir -p /data /app/.next && chown -R node:node /data /app

USER node

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# 4. BUILDER : compilation Next.js
# ---------------------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

# Valeurs FACTICES, uniquement pour satisfaire la validation d'env au build.
# Next.js pre-rend certaines pages : si un import de better-auth ou de Drizzle
# s'execute et qu'aucune URL de base n'existe, le build casse.
# Ces valeurs ne sont PAS presentes dans l'image finale (stage jete).
ENV DATABASE_URL="file:/tmp/build.db" \
    BETTER_AUTH_SECRET="build-time-placeholder-not-a-real-secret" \
    BETTER_AUTH_URL="http://localhost:3000"

# Produit .next/standalone : un serveur Node autonome avec uniquement les
# dependances reellement tracees. Necessite `output: "standalone"` dans
# next.config.ts.
RUN npm run build

# ---------------------------------------------------------------------------
# 5. RUNNER : image finale, minimale et non-root
# ---------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    DATABASE_URL="file:/data/profilsactifs.db"

# Utilisateur dedie : un conteneur qui tourne en root partage l'uid 0 avec
# l'hote. Toute evasion de conteneur devient une escalade de privileges.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Assets publics (logo ministere, images statiques)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Le serveur autonome + son node_modules tracé
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Les assets built (JS/CSS hashes) ne sont pas inclus dans standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migrations Drizzle, rejouees au demarrage par instrumentation.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# IMPORTANT : /data doit exister ET appartenir a nextjs AVANT que le volume
# nomme soit cree. Docker recopie les permissions du repertoire de l'image
# lors de la premiere creation du volume. Sans ca : "SQLITE_CANTOPEN".
RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
