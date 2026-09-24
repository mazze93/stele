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
authenticated and the listener is closed by default. Two credentials exist,
scoped differently:

- **`API_SECRET`** — the admin credential. `Authorization: Bearer $API_SECRET`
  authorizes every `/api/*` route, including the cross-session aggregate views
  (`GET /api/sessions`, `GET /api/projects`, `GET /api/drift`). Missing or
  wrong token → `401 {"error":"unauthorized"}`. `API_SECRET` unset →
  `500 {"error":"server_not_configured"}` on every route it gates. It fails
  closed; there is no anonymous fallback. Server-to-server only — never
  embedded in a client.
- **Per-session tokens** — STELE ships as a single-file HTML bundle with no
  server component to hold `API_SECRET`, so an anonymous browser client
  cannot present it. `POST /api/sessions` is deliberately unauthenticated and
  mints a token scoped to exactly the session it just created, returned once
  in that response (`{ session, token }`) and never persisted in the clear
  (`AgentSession.tokenHash` in `schema.prisma`). Every other
  `/api/sessions/:id/*` route accepts either `API_SECRET` or that exact
  session's own token (`src/middleware/session-auth.ts`) — a valid token for
  a *different* session is rejected, not silently scoped down.
- Both comparisons are constant-time (`node:crypto.timingSafeEqual`), so a
  wrong token leaks neither its length nor its matching prefix through timing.
- `GET /health` is deliberately **outside** the perimeter — it reports liveness
  only and touches no session data.
- The middleware is registered after `cors()`, which answers OPTIONS preflights
  itself. Browsers do not send `Authorization` on a preflight, so this ordering
  is load-bearing: reversing it breaks every browser client.
- The Node listener (`index.ts`) binds `127.0.0.1` unless `HOST` says
  otherwise. Widen it only behind a reverse proxy that terminates TLS. The
  Workers deploy (`src/worker.ts`) has no listener to bind — Cloudflare
  terminates TLS at the edge.
- Session creation has no floor beyond whatever rate limiting sits in front of
  it (Cloudflare, at the deployed edge) — an open perimeter item, not a silent
  one: a spammed session is cheap, empty, and cannot write anywhere but its
  own audit trail.

```bash
curl -s localhost:4000/health                                    # 200, no token
curl -s localhost:4000/api/drift                                 # 401
curl -s -H "Authorization: Bearer $API_SECRET" localhost:4000/api/drift  # 200

# session-scoped token flow
token=$(curl -s -X POST localhost:4000/api/sessions -H "Content-Type: application/json" \
  -d '{"sessionMode":"BUILD","outputTarget":"claude-ai","verbosity":"STANDARD","hygieneTrigger":"ON_COPY","hygieneAfterN":5,"activeProjectIds":[]}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")
curl -s localhost:4000/api/sessions/SESSION_ID -H "Authorization: Bearer $token"  # 200, own session
```

## Routes

```
POST   /api/sessions              session start (unauthenticated — mints a session token)
POST   /api/sessions/:id/events   TOBIRA firings, extractions, transitions
GET    /api/sessions/:id/verify   replay the stored chain, report the first divergence
PATCH  /api/sessions/:id/end      close session + StateSnapshot (transactional)
GET    /api/sessions/:id          full session read
GET    /api/sessions              list all sessions (admin only)
GET    /api/projects              registry (admin only)
GET    /api/projects/:scope       registry by scope (admin only)
GET    /api/drift                 cross-session integrity drift analytics (admin only)
GET    /health                    liveness (unauthenticated)
```

## Deploy (Cloudflare Workers)

`src/worker.ts` is the Workers entry point — separate from `index.ts` (the
`@hono/node-server` entry used for local dev), because a Worker has no
`process`, no long-lived listener, and reaches Postgres through a Hyperdrive
binding rather than a directly-held connection string. Both share the same
`createApp()`; `lib/prisma.ts`'s `getPrisma(c)` picks Node vs. Workers based on
whether `c.env.HYPERDRIVE` is present.

Hyperdrive pools and accelerates an **existing** Postgres — it does not
provision one. You need a real Postgres connection string first (this
project's own instance is Prisma Postgres, provisioned via the Prisma MCP
connector / console — any Postgres works).

```bash
# 1. Point Hyperdrive at your Postgres, then paste the returned id into
#    wrangler.toml's [[hyperdrive]] block.
npx wrangler hyperdrive create stele-core-db --connection-string="<postgres-connection-string>"

# 2. The admin secret, as a Workers secret (never a var — vars are visible in
#    the dashboard and in `wrangler.toml` if committed there).
npx wrangler secret put API_SECRET

# 3. Apply migrations against the same Postgres instance Hyperdrive points at
#    (Hyperdrive itself is not a migration path — connect directly).
DATABASE_URL="<postgres-connection-string>" npx prisma migrate deploy

# 4. Local Workers-runtime dev loop (uses the real Hyperdrive binding):
npm run dev:worker

# 5. Deploy.
npm run deploy
```

After deploying, point the browser client at the Worker's URL (a custom
route/domain, or the default `*.workers.dev` one) and confirm it's listed in
`server.ts`'s CORS `origin` array — the CORS check is on the *page's* origin
making the request, not on where stele-core itself is hosted.

## Known gap

`POST /api/sessions/:id/events` still accepts a client-supplied `integrityHash`
and persists it verbatim (`schemas.ts`, `routes/sessions.ts`). The browser owns
`verifyChain()`; the server does not recompute. Until that changes, the durable
ledger is only as trustworthy as the client that wrote it — the server should
be recomputing the chain from `prevHash` inside the same transaction that
appends the row.
