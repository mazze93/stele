import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../../lib/prisma.js";
import {
  CreateSessionSchema,
  AppendEventSchema,
  EndSessionSchema,
} from "../schemas.js";

export const sessions = new Hono();

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
sessions.post(
  "/:id/events",
  zValidator("json", AppendEventSchema),
  async (c) => {
    const sessionId = c.req.param("id");
    const body = c.req.valid("json");

    // Verify session exists and is still open
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { id: true, endedAt: true },
    });
    if (!session) return c.json({ error: "Session not found" }, 404);
    if (session.endedAt)
      return c.json({ error: "Session already ended" }, 409);

    const entry = await prisma.auditEntry.create({
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
        integrityHash: body.integrityHash,
      },
      select: { id: true, timestamp: true, action: true },
    });

    return c.json({ entry }, 201);
  }
);

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
