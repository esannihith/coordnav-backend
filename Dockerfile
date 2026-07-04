# Runs TypeScript directly via tsx (no build step), matching local dev.
# npm ci must include devDependencies: tsx and the prisma CLI live there.
FROM node:22-alpine

WORKDIR /app

# postinstall runs `prisma generate`, which needs the schema + prisma.config.ts
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8000/health || exit 1

CMD ["npx", "tsx", "src/server.ts"]
