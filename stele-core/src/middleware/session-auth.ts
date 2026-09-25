// Perimeter for the /api/sessions/:id/* routes specifically — narrower than
// middleware/auth.ts's requireBearer. A caller here may be either:
//   1. The admin API_SECRET (server-to-server, can act as any session), or
//   2. That exact session's own token, minted once at POST /api/sessions.
//
// This exists because STELE ships as a single-file HTML bundle with no
// server component to hold a shared secret — an anonymous browser client
// needs a way to write to and read only the session it created, without the
// admin credential. See src/lib/session-token.ts for how the token itself is
// generated and hashed.

import type { MiddlewareHandler } from "hono";
import { secretsMatch } from "./auth.js";
import { getPrisma } from "../../lib/prisma.js";
import { hashSessionToken, hashesMatch } from "../lib/session-token.js";

export const requireSessionOrAdmin: MiddlewareHandler = async (c, next) => {
  const apiSecret =
    (c.env as { API_SECRET?: string } | undefined)?.API_SECRET ??
    process.env.API_SECRET;

  if (!apiSecret) {
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
  const presented = auth.slice("Bearer ".length);

  // Admin: acts as any session.
  if (secretsMatch(presented, apiSecret)) {
    await next();
    return;
  }

  // Session-scoped: the presented token's hash must match exactly the
  // session named by the :id route param — a valid token for session A
  // presented against session B's routes is still unauthorized.
  const sessionId = c.req.param("id");
  const session = await getPrisma(c).agentSession.findUnique({
    where: { id: sessionId },
    select: { tokenHash: true },
  });

  if (!session || !hashesMatch(hashSessionToken(presented), session.tokenHash)) {
    return c.json({ error: "unauthorized" }, 401);
  }

  await next();
};
