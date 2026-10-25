FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/api/package.json backend/api/package-lock.json ./backend/api/
COPY backend/rag/package.json backend/rag/package-lock.json ./backend/rag/
COPY backend/mcp-server/package.json backend/mcp-server/package-lock.json ./backend/mcp-server/

RUN cd backend/api && npm ci \
    && cd ../rag && npm ci \
    && cd ../mcp-server && npm ci \
    && npm cache clean --force

COPY backend ./backend
COPY data/synthetic ./data/synthetic
COPY eval/oe4/fixtures ./eval/oe4/fixtures
COPY n8n/workflows ./n8n/workflows

USER node
WORKDIR /app/backend/api
CMD ["node", "--import", "tsx", "src/main.ts"]
