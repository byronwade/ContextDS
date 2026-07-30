# Design Contracts accurate-scan microservice (Playwright Chromium)
# Deploy alongside Vercel: set SCANNER_SERVICE_URL to this service's HTTPS URL.
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4040 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev \
  && npx playwright install chromium \
  && rm -rf /root/.npm /tmp/*

COPY server.mjs ./

EXPOSE 4040
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4040/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
