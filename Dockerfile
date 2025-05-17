FROM node:22.15.1-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
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
CMD [ "node", "dist/src/main" ]
