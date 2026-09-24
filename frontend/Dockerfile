# syntax=docker/dockerfile:1

FROM node:22.23.3-alpine3.24 AS deps
WORKDIR /app
# Corepack installs the pnpm version pinned by packageManager in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm
# Manifests only, so a source edit does not invalidate the install layer.
# pnpm-workspace.yaml carries the allowBuilds settings the install relies on.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_CALCULATOR_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_CALCULATOR_API_URL=$NEXT_PUBLIC_CALCULATOR_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22.23.3-alpine3.24 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app app
# The standalone server serves neither .next/static nor public, so both are
# copied back in beside server.js where it expects them.
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER 10001:10001
EXPOSE 3000
CMD ["node", "server.js"]
