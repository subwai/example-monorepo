# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:24-slim AS base
# pnpm 12 is a native binary installed by its package's install script, which corepack doesn't run.
ARG PNPM_VERSION=12.9.1
RUN npm install --global pnpm@$PNPM_VERSION
WORKDIR /app

# Prune the monorepo to this app and the workspace packages it depends on.
FROM base AS prepare
ARG TURBO_VERSION=2.11.7
RUN npm install --global turbo@$TURBO_VERSION
COPY . .
RUN turbo prune web --docker

FROM base AS builder
# Install from the manifests and pruned lockfile only, so this layer is reused until dependencies change.
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN pnpm turbo run build --filter=web
# Vite bundles workspace packages into dist/, so the image only needs third-party production dependencies.
RUN pnpm --filter=web deploy --prod /deploy

FROM node:24-slim
WORKDIR /app
COPY --from=builder /deploy .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node_modules/.bin/react-router-serve", "./dist/server/index.js"]
