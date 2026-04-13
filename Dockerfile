FROM node:24-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    postgresql-client \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json .npmrc ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY attached_assets ./attached_assets
COPY deploy ./deploy

RUN corepack pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=3000
ENV BASE_PATH=/

RUN corepack pnpm --filter @workspace/api-server run build
RUN corepack pnpm --filter @workspace/medical-portal run build
RUN pip3 install --break-system-packages --no-cache-dir pyradiomics==3.0.1

RUN chmod +x /app/deploy/start-app.sh

EXPOSE 3000

CMD ["/app/deploy/start-app.sh"]
