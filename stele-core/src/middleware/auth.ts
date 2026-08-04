// === /api/* PERIMETER ===
// stele-core persists the audit ledger. An unauthenticated write path here is
// worse than a data leak: it lets an anonymous caller author entries in the
// record that is supposed to be tamper-evident. Fail closed — a server with no
// API_SECRET configured serves nothing under /api/*, it does not fall open.
//
// Register AFTER cors() in server.ts. hono/cors answers the OPTIONS preflight
// itself and does not call next(), so preflights never reach this middleware —
// which is correct, because browsers do not send Authorization on a preflight.

import { createHash, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";

// Constant-time compare. A plain `!==` on the token leaks its length and its
// matching prefix through response timing.
//
// Both sides are hashed to a fixed 32 bytes before comparison. That removes the
// length branch entirely — comparing raw buffers means an early
// `a.length !== b.length` return whose cost still tracks the presented token's
// length. Digesting first makes every comparison identical work regardless of
// what was presented.
export function secretsMatch(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const requireBearer: MiddlewareHandler = async (c, next) => {
  // c.env carries bindings under Workers; process.env under @hono/node-server.
  const expected =
    (c.env as { API_SECRET?: string } | undefined)?.API_SECRET ??
    process.env.API_SECRET;

  if (!expected) {
    console.error(
      "[stele-core] API_SECRET is not set — refusing all /api/* requests. " +
        "Set it in stele-core/.env (see .env.example)."
    );
    return c.json({ error: "server_not_configured" }, 500);
  }

  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized" }, 401);
  }

  if (!secretsMatch(auth.slice("Bearer ".length), expected)) {
    return c.json({ error: "unauthorized" }, 401);
  }

  await next();
};
