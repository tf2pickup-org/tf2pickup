# The AI playground's game server simulator (see .github/workflows/ai-playground.yml).
FROM node:24.22.2-slim
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
USER node
CMD ["./node_modules/.bin/tsx", "tests/simulator-daemon.ts"]
