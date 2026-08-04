// The /api/* perimeter, exercised through Hono's request handler rather than a
// live socket. These assertions were previously only ever made by hand against
// a running server, which means they were true once rather than true always.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireBearer } from "../src/middleware/auth.js";

const SECRET = "test-secret-not-a-real-credential";

// Mirrors server.ts ordering: cors first, then the perimeter, then routes.
function makeApp() {
  const app = new Hono();
  app.use("/api/*", cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }));
  app.use("/api/*", requireBearer);
  app.get("/api/thing", (c) => c.json({ ok: true }));
  app.get("/health", (c) => c.json({ status: "ok" }));
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

describe("requireBearer", () => {
  it("allows a correct token through", async () => {
    const res = await makeApp().request("/api/thing", bearer(SECRET));
    assert.equal(res.status, 200);
  });

  it("rejects a missing Authorization header", async () => {
    const res = await makeApp().request("/api/thing");
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "unauthorized" });
  });

  it("rejects a wrong token", async () => {
    const res = await makeApp().request("/api/thing", bearer("wrong"));
    assert.equal(res.status, 401);
  });

  it("rejects a token that is a prefix of the real one", async () => {
    // Guards the constant-time compare: a length mismatch must not be treated
    // as a partial match.
    const res = await makeApp().request("/api/thing", bearer(SECRET.slice(0, -1)));
    assert.equal(res.status, 401);
  });

  it("rejects a token with trailing content appended", async () => {
    const res = await makeApp().request("/api/thing", bearer(SECRET + "x"));
    assert.equal(res.status, 401);
  });

  it("rejects a non-Bearer scheme carrying the right secret", async () => {
    const res = await makeApp().request("/api/thing", {
      headers: { Authorization: `Basic ${SECRET}` },
    });
    assert.equal(res.status, 401);
  });

  it("rejects a bare token with no scheme", async () => {
    const res = await makeApp().request("/api/thing", { headers: { Authorization: SECRET } });
    assert.equal(res.status, 401);
  });

  it("fails closed when API_SECRET is unset — never falls open", async () => {
    delete process.env.API_SECRET;
    const res = await makeApp().request("/api/thing", bearer(SECRET));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "server_not_configured" });
  });

  it("fails closed when API_SECRET is empty", async () => {
    // dotenv assigns "" for a bare `API_SECRET=` line — the same empty-value
    // trap that made HOST bind every interface. Empty must mean unset.
    process.env.API_SECRET = "";
    const res = await makeApp().request("/api/thing");
    assert.equal(res.status, 500);
  });

  it("leaves routes outside /api/* alone", async () => {
    const res = await makeApp().request("/health");
    assert.equal(res.status, 200);
  });

  it("answers the CORS preflight without a token", async () => {
    // Browsers do not send Authorization on a preflight; if cors() did not
    // short-circuit before the perimeter, every authenticated request would
    // fail before it was ever made.
    const res = await makeApp().request("/api/thing", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    assert.ok(res.status === 204 || res.status === 200, `expected preflight to succeed, got ${res.status}`);
    assert.match(res.headers.get("access-control-allow-headers") ?? "", /authorization/i);
  });
});
