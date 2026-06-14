import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const [projects, sessions, auditTotal, tobiraFirings] = await Promise.all([
  prisma.project.count(),
  prisma.agentSession.count(),
  prisma.auditEntry.count(),
  prisma.auditEntry.count({ where: { action: "TOBIRA_FIRED" } }),
]);

const drift = await prisma.stateSnapshot.groupBy({
  by: ["integrityState"],
  _count: { integrityState: true },
  orderBy: { _count: { integrityState: "desc" } },
});

const secretsExposed = await prisma.auditEntry.count({
  where: { secretsDetected: true },
});

const tesseraeOpen = await prisma.tessera.count({
  where: { resolvedAt: null },
});

console.log(`\n✅ Connected to Prisma Postgres — stele-core`);
console.log(
  `\n   ${projects} projects · ${sessions} sessions · ${auditTotal} audit entries`
);
console.log(
  `   TOBIRA firings: ${tobiraFirings} · secrets-detected flags: ${secretsExposed} · open tesserae: ${tesseraeOpen}`
);
console.log(
  `\n   Integrity drift across sessions:`
);
for (const s of drift) {
  const bar = "█".repeat(s._count.integrityState);
  console.log(`   ${s.integrityState.padEnd(12)} ${bar} ×${s._count.integrityState}`);
}
console.log("");

await prisma.$disconnect();
