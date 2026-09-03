# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

RUN npm i

FROM base AS dev

ENV NODE_ENV=development

RUN apk add --no-cache ffmpeg font-dejavu fontconfig

COPY --from=deps /app/node_modules ./node_modules

RUN mkdir -p /data /app/.next && chown -R node:node /data /app

COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh
RUN chmod +x /usr/local/bin/dev-entrypoint.sh

USER node

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/dev-entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

ENV DATABASE_URL="file:/tmp/build.db" \
    BETTER_AUTH_SECRET="build-time-placeholder-not-a-real-secret" \
    BETTER_AUTH_URL="http://localhost:3000"

RUN npm run db:migrate && npm run db:seed \
 && node -e "const D=require('better-sqlite3'); const d=new D('/tmp/build.db'); d.pragma('wal_checkpoint(TRUNCATE)'); d.pragma('journal_mode=DELETE'); d.close()" \
 && npm run build

FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    DATABASE_URL="file:/data/profilsactifs.db"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /tmp/build.db ./seed.db
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
