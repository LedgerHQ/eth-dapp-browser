# eth-dapp-browser — Next.js 12 app, built and served with `next start` on :3000.
# CI: built + pushed to JFrog by .github/workflows/build-prod.yml.
FROM jfrog.ledgerlabs.net/ossproxy-oci-proxy-dockerio/node:18-slim

WORKDIR /app
RUN corepack enable

# NEXT_PUBLIC_* is inlined into the client bundle at build time
ARG NEXT_PUBLIC_ANALYTICS_WRITE_KEY
ENV NEXT_PUBLIC_ANALYTICS_WRITE_KEY=$NEXT_PUBLIC_ANALYTICS_WRITE_KEY \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: skip the husky "prepare" hook (no git in the image)
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

ENV NODE_ENV=production \
    PORT=3000
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
