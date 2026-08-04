import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../../lib/prisma.js";
import {
  CreateSessionSchema,
  AppendEventSchema,
  EndSessionSchema,
} from "../schemas.js";
import { chainHash, verifyChain, GENESIS_HASH } from "../chain.js";

export const sessions = new Hono();

// Thrown inside the append transaction to abort it with a specific status.
// A plain return cannot roll the transaction back.
class AppendRejected extends Error {
  constructor(readonly status: 404 | 409, message: string) {
    super(message);
  }
}

// Postgres raises SQLSTATE 40001 when a Serializable transaction cannot be
// ordered. Prisma does NOT pass that string through: it normalizes
// TransactionWriteConflict to code "P2034" with the fixed message "Transaction
// failed due to a write conflict or a deadlock. Please retry your transaction".
// Verified against the installed runtime — "40001" appears nowhere in
// @prisma/client, so a substring match on the SQLSTATE never fires and a real
// conflict would surface as an opaque 500 instead of the documented 409 retry.
//
// P2034 is the check that matters. The raw SQLSTATE is kept as a secondary
// probe only because a driver-adapter error can reach us before Prisma
// normalizes it; it is a fallback, never the primary signal.
export function isSerializationFailure(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;

  const code = (err as { code?: unknown }).code;
  if (code === "P2034") return true;

  // Driver-adapter path: node-postgres surfaces SQLSTATE on `code`, and Prisma
  // may carry the original under `cause`.
  if (code === "40001") return true;
  const cause = (err as { cause?: { code?: unknown } }).cause;
  if (cause && typeof cause === "object" && cause.code === "40001") return true;

  return false;
}

// POST /api/sessions — Stele calls this at session start
sessions.post("/", zValidator("json", CreateSessionSchema), async (c) => {
  const body = c.req.valid("json");
  const session = await prisma.agentSession.create({
    data: {
      sessionMode: body.sessionMode,
      outputTarget: body.outputTarget,
      verbosity: body.verbosity,
      hygieneTrigger: body.hygieneTrigger,
      hygieneAfterN: body.hygieneAfterN,
      activeProjectIds: body.activeProjectIds,
    },
    select: { id: true, startedAt: true, sessionMode: true },
  });
  return c.json({ session }, 201);
});

// GET /api/sessions — list sessions with snapshot summary
sessions.get("/", async (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const offset = Number(c.req.query("offset") ?? 0);

  const [total, items] = await Promise.all([
    prisma.agentSession.count(),
    prisma.agentSession.findMany({
      take: limit,
      skip: offset,
      orderBy: { startedAt: "desc" },
      include: {
        stateSnapshots: {
          select: { integrityState: true, firedTobiraIds: true, capturedAt: true },
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
        _count: { select: { auditTrail: true } },
      },
    }),
  ]);

  return c.json({ total, limit, offset, sessions: items });
});

// GET /api/sessions/:id — full session with audit trail
sessions.get("/:id", async (c) => {
  const session = await prisma.agentSession.findUnique({
    where: { id: c.req.param("id") },
    include: {
      auditTrail: { orderBy: { timestamp: "asc" } },
      stateSnapshots: { orderBy: { capturedAt: "desc" } },
    },
  });
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json({ session });
});

// POST /api/sessions/:id/events — hot path: Stele streams audit events here
// Invariant: append-only — no deletes, no updates on this table
//
// The integrity hash is computed HERE, from the previous entry's hash, and is
// never accepted from the caller. Session existence and open/closed state are
// checked inside the same transaction as the append: checking them outside
// leaves a window where a session ends between the check and the write.
sessions.post(
  "/:id/events",
  zValidator("json", AppendEventSchema),
  async (c) => {
    const sessionId = c.req.param("id");
    const body = c.req.valid("json");
    const ts = new Date();

    try {
      const entry = await prisma.$transaction(
        async (tx) => {
          const session = await tx.agentSession.findUnique({
            where: { id: sessionId },
            select: { id: true, endedAt: true },
          });
          if (!session) throw new AppendRejected(404, "Session not found");
          if (session.endedAt) throw new AppendRejected(409, "Session already ended");

          const prev = await tx.auditEntry.findFirst({
            where: { sessionId },
            orderBy: { timestamp: "desc" },
            select: { integrityHash: true },
          });

          const integrityHash = chainHash(
            prev?.integrityHash ?? GENESIS_HASH,
            body,
            sessionId,
            ts.toISOString()
          );

          return tx.auditEntry.create({
            data: {
              sessionId,
              action: body.action,
              tobiraId: body.tobiraId,
              tobiraCode: body.tobiraCode,
              fromState: body.fromState,
              toState: body.toState,
              fieldsExtracted: body.fieldsExtracted,
              fieldsRejected: body.fieldsRejected,
              secretsDetected: body.secretsDetected,
              timestamp: ts,
              integrityHash,
            },
            select: { id: true, timestamp: true, action: true, integrityHash: true },
          });
        },
        // Serializable: two concurrent appends must not both read the same
        // predecessor and fork the chain. Read Committed — Postgres's default —
        // permits exactly that. A serialization failure surfaces as a 409 for
        // the caller to retry rather than a silently branched ledger.
        { isolationLevel: "Serializable" }
      );

      return c.json({ entry }, 201);
    } catch (err) {
      if (err instanceof AppendRejected) {
        return c.json({ error: err.message }, err.status);
      }
      if (isSerializationFailure(err)) {
        return c.json({ error: "Concurrent append — retry" }, 409);
      }
      throw err;
    }
  }
);

// GET /api/sessions/:id/verify — replay the stored chain and report the first
// divergence. This is the half the browser could never provide: verification
// by a party other than the writer.
sessions.get("/:id/verify", async (c) => {
  const sessionId = c.req.param("id");

  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) return c.json({ error: "Session not found" }, 404);

  const entries = await prisma.auditEntry.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });

  return c.json({ sessionId, verification: verifyChain(entries, sessionId) });
});

// PATCH /api/sessions/:id/end — close session and capture final StateSnapshot
sessions.patch(
  "/:id/end",
  zValidator("json", EndSessionSchema),
  async (c) => {
    const sessionId = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { endedAt: true },
    });
    if (!existing) return c.json({ error: "Session not found" }, 404);
    if (existing.endedAt) return c.json({ error: "Session already ended" }, 409);

    const [session, snapshot] = await prisma.$transaction([
      prisma.agentSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
        select: { id: true, endedAt: true, sessionMode: true },
      }),
      prisma.stateSnapshot.create({
        data: {
          sessionId,
          integrityState: body.integrityState,
          firedTobiraIds: body.firedTobiraIds,
          themeId: body.themeId,
        },
        select: { id: true, integrityState: true, capturedAt: true },
      }),
    ]);

    return c.json({ session, snapshot });
  }
);
