# The collab service, built from the monorepo root:
#   docker build -f services/collab/Dockerfile -t collab .
# or: gcloud run deploy collab --source . (with this Dockerfile; see README.md)
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @researchcove/collab...
RUN pnpm --filter @researchcove/server build && pnpm --filter @researchcove/collab build
# A self-contained folder with production dependencies only (workspace packages copied in).
RUN pnpm deploy --filter @researchcove/collab --prod /out \
 && cp -r services/collab/dist /out/dist

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /out /app
EXPOSE 8080
CMD ["node", "dist/index.js"]
