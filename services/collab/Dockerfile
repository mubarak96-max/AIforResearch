# The collab service. Build from the repository root (it bundles lib/server):
#   docker build -f services/collab/Dockerfile -t collab .
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY lib/server lib/server
COPY services/collab services/collab
RUN pnpm build:collab

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /repo/services/collab/dist /app
RUN npm install --omit=dev --no-audit --no-fund
EXPOSE 8080
CMD ["node", "index.js"]
