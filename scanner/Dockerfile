# Design Contracts accurate scanner — Playwright Chromium in Docker
# Use with Vercel via SCANNER_SERVICE_URL pointing at this service
# (Fly.io / Railway / ECS / local docker compose).

FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.mjs ./

ENV PORT=4040
ENV NODE_ENV=production

EXPOSE 4040

CMD ["node", "server.mjs"]
