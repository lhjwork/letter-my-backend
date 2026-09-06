FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./
# cryptoService 가 기동 시 .keys/ 를, ogController 가 public/og-custom 을 씀 → node 유저 쓰기 가능하게 미리 생성
RUN mkdir -p public/og-custom .keys && chown -R node:node public .keys
USER node
EXPOSE 5001
ENV PORT=5001
CMD ["node", "dist/server.js"]
