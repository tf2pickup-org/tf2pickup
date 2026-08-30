FROM node:24.20.0-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
RUN apt update && apt install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json /app
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
USER node
ENV NODE_ENV=production
ENV APP_HOST=0.0.0.0
ENV APP_PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.APP_PORT || 3000) + '/api/v1/version').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD [ "node", "dist/src/main" ]
