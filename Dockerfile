FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY server ./server
COPY shared ./shared

ARG SERVICE_VERSION=unknown
ENV SERVICE_VERSION=$SERVICE_VERSION

USER node
EXPOSE 8080
CMD ["pnpm", "start:server"]
