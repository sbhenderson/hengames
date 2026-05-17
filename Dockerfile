# syntax=docker/dockerfile:1.7

FROM node:26-trixie-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/game-engine/package.json packages/game-engine/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .

RUN npm run typecheck
RUN npm run test
RUN npm run build
RUN npm prune --omit=dev

FROM node:26-trixie-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_ASSETS_DIR=/app/apps/server/dist/public

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/game-engine/package.json ./packages/game-engine/package.json
COPY --from=build /app/packages/game-engine/dist ./packages/game-engine/dist
COPY --from=build /app/apps/web/dist ./apps/server/dist/public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT [ "node", "apps/server/dist/index.js" ]