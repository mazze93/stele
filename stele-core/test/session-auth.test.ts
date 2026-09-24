// Covers the paths through requireSessionOrAdmin that never touch the
// database: the admin-secret branch (matches before any lookup happens) and
// every malformed-request branch (missing header, wrong scheme, unset
// secret). Same constraint as the rest of this suite — no live Postgres in
// CI (see .github/workflows/typecheck.yml) — so the branch that hashes a
// presented token and looks up a session by tokenHash is NOT covered here;
// it was verified manually against a real database during development. That
// is this file's honest, stated perimeter, not an oversight.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { requireSessionOrAdmin } from "../src/middleware/session-auth.js";

const SECRET = "test-admin-secret-not-a-real-credential";

function makeApp() {
  const app = new Hono();
  app.get("/api/sessions/:id", requireSessionOrAdmin, (c) => c.json({ ok: true }));
  return app;
}

const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.API_SECRET;
  process.env.API_SECRET = SECRET;
});
afterEach(() => {
  if (saved === undefined) delete process.env.API_SECRET;
  else process.env.API_SECRET = saved;
});

describe("requireSessionOrAdmin — admin branch (no DB lookup)", () => {
  it("admits the admin secret regardless of :id", async () => {
    const res = await makeApp().request("/api/sessions/any-id-at-all", bearer(SECRET));
    assert.equal(res.status, 200);
  });
});

describe("requireSessionOrAdmin — malformed requests (no DB lookup)", () => {
  it("rejects a missing Authorization header", async () => {
    const res = await makeApp().request("/api/sessions/some-id");
    assert.equal(res.status, 401);
  });

  it("rejects a non-Bearer scheme", async () => {
    const res = await makeApp().request("/api/sessions/some-id", {
      headers: { Authorization: `Basic ${SECRET}` },
    });
    assert.equal(res.status, 401);
  });

  it("fails closed when API_SECRET is unset — never falls open to an unauthenticated DB lookup", async () => {
    delete process.env.API_SECRET;
    const res = await makeApp().request("/api/sessions/some-id", bearer("anything"));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "server_not_configured" });
  });
});
