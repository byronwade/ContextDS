# designcontracts-scanner

Playwright Chromium microservice for **accurate** Design Contract scans (CSS-in-JS + screenshots).

## Endpoints

- `GET /health` — liveness
- `POST /scan` — `{ "url": "https://example.com", "screenshot": true }`

Optional auth: set `SCANNER_SERVICE_SECRET` and send header `x-scanner-secret`.

## Local

```bash
# from repo root
docker compose up --build -d scanner
export SCANNER_SERVICE_URL=http://localhost:4040
bun dev
```

## Deploy to Vercel

Uploaded as project **`designcontracts-scanner`** (Node + `@sparticuz/chromium` on Vercel; full Playwright in Docker locally).

Production alias: `https://designcontracts-scanner.vercel.app`

1. In Vercel → project **designcontracts-scanner** (or Add New → Root Directory `scanner`)
2. Set env on the scanner project:
   - `SCANNER_SERVICE_SECRET` — shared secret
   - `SCANNER_MAX_CONCURRENCY` — default `2`
3. On the **designcontracts.sh** Next.js project, set:
   - `SCANNER_SERVICE_URL=https://designcontracts-scanner.vercel.app`
   - `SCANNER_SERVICE_SECRET=<same secret>`

Fast mode still works without this service (static CSS only).

## Docker (self-hosted)

`Dockerfile` / `Dockerfile.vercel` install full Playwright Chromium for non-Vercel hosts.
