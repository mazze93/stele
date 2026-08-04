// === /api/* PERIMETER ===
// stele-core persists the audit ledger. An unauthenticated write path here is
// worse than a data leak: it lets an anonymous caller author entries in the
// record that is supposed to be tamper-evident. Fail closed — a server with no
// API_SECRET configured serves nothing under /api/*, it does not fall open.
//
// Register AFTER cors() in server.ts. hono/cors answers the OPTIONS preflight
// itself and does not call next(), so preflights never reach this middleware —
// which is correct, because browsers do not send Authorization on a preflight.

import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";

// Constant-time compare. A plain `!==` on the token leaks its length and its
// matching prefix through response timing.
function secretsMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    // Still burn a comparison so the mismatch-length path is not measurably
    // faster than the mismatch-content path.
    timingSafeEqual(b, b);
    return false;
  }
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
