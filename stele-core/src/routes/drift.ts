import { Hono } from "hono";
import { prisma } from "../../lib/prisma.js";

export const drift = new Hono();

// GET /api/drift — cross-session integrity drift analysis
// This is the portfolio piece: shows TOBIRA firing frequency, state distribution,
// secrets-detected rates, and session health over time.
drift.get("/", async (c) => {
  const [
    stateDistribution,
    tobiraFrequency,
    actionBreakdown,
    secretsExposedCount,
    sessionHealth,
    recentTobiraFirings,
  ] = await Promise.all([
    // How sessions are ending up — the drift picture
    prisma.stateSnapshot.groupBy({
      by: ["integrityState"],
      _count: { integrityState: true },
      orderBy: { _count: { integrityState: "desc" } },
    }),

    // Which TOBIRA modules are firing most
    prisma.auditEntry.groupBy({
      by: ["tobiraCode"],
      where: {
        action: "TOBIRA_FIRED",
        tobiraCode: { not: null },
      },
      _count: { tobiraCode: true },
      orderBy: { _count: { tobiraCode: "desc" } },
    }),

    // Full action breakdown across all sessions
    prisma.auditEntry.groupBy({
      by: ["action"],
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
    }),

    // How many entries had secrets-detected flag set
    prisma.auditEntry.count({ where: { secretsDetected: true } }),

    // Per-session summary: mode, final state, audit depth, TOBIRA count
    prisma.agentSession.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        sessionMode: true,
        startedAt: true,
        endedAt: true,
        activeProjectIds: true,
        stateSnapshots: {
          select: { integrityState: true },
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            auditTrail: true,
          },
        },
      },
    }),

    // The 10 most recent TOBIRA firings with state transitions
    prisma.auditEntry.findMany({
      where: { action: "TOBIRA_FIRED" },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        tobiraId: true,
        tobiraCode: true,
        fromState: true,
        toState: true,
        secretsDetected: true,
        timestamp: true,
        session: {
          select: { sessionMode: true, id: true },
        },
      },
    }),
  ]);

  const totalSessions = await prisma.agentSession.count();
  const totalAuditEntries = await prisma.auditEntry.count();
  const totalTobiraFirings = await prisma.auditEntry.count({
    where: { action: "TOBIRA_FIRED" },
  });

  // Enrich session health: add final integrity state inline
  const enrichedSessions = sessionHealth.map((s) => ({
    ...s,
    finalState: s.stateSnapshots[0]?.integrityState ?? null,
    stateSnapshots: undefined,
  }));

  return c.json({
    summary: {
      totalSessions,
      totalAuditEntries,
      totalTobiraFirings,
      secretsExposedFlags: secretsExposedCount,
      tobiraFiringRate:
        totalAuditEntries > 0
          ? Number(((totalTobiraFirings / totalAuditEntries) * 100).toFixed(1))
          : 0,
    },
    stateDistribution,
    tobiraFrequency,
    actionBreakdown,
    recentTobiraFirings,
    sessionHealth: enrichedSessions,
  });
});
