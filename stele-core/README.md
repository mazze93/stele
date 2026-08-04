# stele-core

Prisma Postgres persistence layer for STELE's audit ledger. Hono +
`@hono/node-server`, its own npm package — not part of the pnpm workspace.

## Run

```bash
cp .env.example .env          # then fill DATABASE_URL and API_SECRET
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                   # tsx watch → http://127.0.0.1:4000
```

`npx tsx scripts/verify-prisma.ts` prints row counts if the schema is live.

## Perimeter

The ledger is the thing STELE claims is tamper-evident, so the write path is
authenticated and the listener is closed by default.

- **Every `/api/*` route requires `Authorization: Bearer $API_SECRET`.**
  Missing or wrong token → `401 {"error":"unauthorized"}`. `API_SECRET` unset →
  `500 {"error":"server_not_configured"}` on every `/api/*` route. It fails
  closed; there is no anonymous fallback.
- The comparison is constant-time (`node:crypto.timingSafeEqual`), so a wrong
  token leaks neither its length nor its matching prefix through timing.
- `GET /health` is deliberately **outside** the perimeter — it reports liveness
  only and touches no session data.
- The middleware is registered after `cors()`, which answers OPTIONS preflights
  itself. Browsers do not send `Authorization` on a preflight, so this ordering
  is load-bearing: reversing it breaks every browser client.
- The listener binds `127.0.0.1` unless `HOST` says otherwise. Widen it only
  behind a reverse proxy that terminates TLS.

```bash
curl -s localhost:4000/health                                    # 200, no token
curl -s localhost:4000/api/drift                                 # 401
curl -s -H "Authorization: Bearer $API_SECRET" localhost:4000/api/drift  # 200
```

## Routes

```
POST   /api/sessions              session start
POST   /api/sessions/:id/events   TOBIRA firings, extractions, transitions
PATCH  /api/sessions/:id/end      close session + StateSnapshot (transactional)
GET    /api/sessions/:id          full session read
GET    /api/projects              registry
GET    /api/projects/:scope       registry by scope
GET    /api/drift                 cross-session integrity drift analytics
GET    /health                    liveness (unauthenticated)
```

## Known gap

`POST /api/sessions/:id/events` still accepts a client-supplied `integrityHash`
and persists it verbatim (`schemas.ts`, `routes/sessions.ts`). The browser owns
`verifyChain()`; the server does not recompute. Until that changes, the durable
ledger is only as trustworthy as the client that wrote it — the server should
be recomputing the chain from `prevHash` inside the same transaction that
appends the row.
