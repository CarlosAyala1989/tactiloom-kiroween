# syntax=docker/dockerfile:1.7
# Single Node image for web (Next.js), runner (worker) and migrate (Prisma). See docker-compose.yml.

FROM node:24-alpine AS base
RUN apk add --no-cache openssl libc6-compat \
 && npm install -g pnpm@11.9.0
ENV CI=1 NEXT_TELEMETRY_DISABLED=1 PNPM_HOME=/pnpm
WORKDIR /app

# ---- manifests only (better layer caching) ----
FROM base AS manifests
# pnpm 11 checks every lockfile entry against its supply-chain policies (minimumReleaseAge: 1 day by
# default) and downloads the registry metadata of each package to do it: about 0.5 GB for this
# lockfile, more than 100 MB of it for Prisma alone. The check stays on. To let it finish on slow
# connections, the two installs below keep that metadata and pnpm's verdict cache in a BuildKit cache,
# use their caches one at a time (sharing=locked, so the second install reuses the first one's
# downloads instead of competing for bandwidth) and give each registry request 10 minutes instead of
# the default 60 s. Set here, these variables reach the build and prod-deps stages, not the runtime.
ENV PNPM_CONFIG_CACHE_DIR=/pnpm/metadata PNPM_CONFIG_FETCH_TIMEOUT=600000
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json prisma.config.ts ./
COPY prisma ./prisma
COPY apps/web/package.json apps/web/
COPY apps/runner/package.json apps/runner/
COPY packages/contracts/package.json packages/contracts/
COPY packages/compiler/package.json packages/compiler/
COPY packages/workflow-engine/package.json packages/workflow-engine/
COPY packages/board-kit/package.json packages/board-kit/
COPY packages/db/package.json packages/db/

# ---- full install + build ----
FROM manifests AS build
RUN --mount=type=cache,id=tactiloom-pnpm,target=/pnpm/store,sharing=locked \
    --mount=type=cache,id=tactiloom-pnpm-metadata,target=/pnpm/metadata,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY . .
RUN pnpm exec prisma generate && pnpm --filter @tactiloom/web build

# ---- production dependencies only ----
FROM manifests AS prod-deps
RUN --mount=type=cache,id=tactiloom-pnpm,target=/pnpm/store,sharing=locked \
    --mount=type=cache,id=tactiloom-pnpm-metadata,target=/pnpm/metadata,sharing=locked \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production WORKSPACE_ROOT=/workspace WEB_PORT=3210
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=prod-deps /app/apps/runner/node_modules ./apps/runner/node_modules
COPY --from=prod-deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=prod-deps /app/packages/compiler/node_modules ./packages/compiler/node_modules
COPY --from=prod-deps /app/packages/workflow-engine/node_modules ./packages/workflow-engine/node_modules
COPY --from=prod-deps /app/packages/board-kit/node_modules ./packages/board-kit/node_modules
COPY --from=prod-deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/prisma.config.ts ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/runner ./apps/runner
COPY --from=build /app/apps/web/package.json /app/apps/web/next.config.ts ./apps/web/
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/assets ./assets
RUN mkdir -p /workspace && chown -R node:node /workspace
USER node
EXPOSE 3210
CMD ["pnpm", "--filter", "@tactiloom/web", "start"]
