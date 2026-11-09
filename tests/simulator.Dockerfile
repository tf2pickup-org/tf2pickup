# The AI playground's game server simulator (built by .github/workflows/build.yml).
FROM node:24.22.2-slim
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
USER node
CMD ["./node_modules/.bin/tsx", "tests/simulator-daemon.ts"]
