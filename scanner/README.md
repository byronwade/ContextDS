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

## Deploy to Vercel (container)

1. In Vercel → **Add New Project** → import this repo
2. **Root Directory**: `scanner`
3. Framework Preset: **Other** (uses `Dockerfile` / `Dockerfile.vercel`)
4. Set env:
   - `SCANNER_SERVICE_SECRET` — shared secret
   - `SCANNER_MAX_CONCURRENCY` — default `2`
5. Deploy, copy the HTTPS URL
6. On the **designcontracts.sh** Next.js project, set:
   - `SCANNER_SERVICE_URL=https://<scanner-deployment>.vercel.app`
   - `SCANNER_SERVICE_SECRET=<same secret>`

Fast mode still works without this service (static CSS only).
