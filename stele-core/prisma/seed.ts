import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import {
  PostureLevel,
  VerbosityLevel,
  HygieneTrigger,
  AuditActionType,
  IntegrityState,
} from "../generated/prisma/client.js";

async function main() {
  console.log("Seeding stele-core...");

  // ─── Projects — mirrors Stele's src/data/projects.ts registry ───

  await prisma.project.createMany({
    skipDuplicates: true,
    data: [
      {
        label: "Stele",
        scope: "STELE",
        stack: "React 19, Vite, TypeScript 6, Radix UI, Tailwind CSS",
        posture: PostureLevel.GUARDIAN,
        compliance: [],
        hardStops: [
          "Security gate must exist before API surface opens",
          "Build sequencing is a security property, not a preference",
          "Banned vocabulary in compiled output strings",
        ],
        root: "~/code/Stele",
      },
      {
        label: "Secure Pride",
        scope: "SP",
        stack: "Python, zsh, Docker, Astro 6, Cloudflare Pages",
        posture: PostureLevel.MAX,
        compliance: ["GDPR", "CCPA", "SOGI", "WCAG-2.1-AA"],
        hardStops: [
          "localStorage for sensitive data",
          "innerHTML with untrusted input",
          "SOGI attribute inference from behavioral data",
          "Unmasked identifiers in audit logs",
          "WebAuthn bypass on sensitive flows",
        ],
        root: "~/code/Secure-Pride",
      },
      {
        label: "Context Synapse",
        scope: "CS",
        stack: "Swift 6.0+, Core ML, Bayesian, local-only",
        posture: PostureLevel.RESEARCH,
        compliance: ["IRB-adjacent"],
        hardStops: [
          "Any remote data transmission",
          "Operational context inference (PERMANENT ETHICAL BOUNDARY)",
          "Collapse/distraction state detection",
        ],
        root: "~/code/ContextSynapse",
      },
      {
        label: "Meridian",
        scope: "MER",
        stack: "Swift 6.0+, Barrett model, AffectDoc schema",
        posture: PostureLevel.RESEARCH,
        compliance: ["IRB-adjacent"],
        hardStops: [
          "Remote affect data transmission",
          "Individual ground-truth claims without protocol citation",
        ],
        root: "~/code/meridian",
      },
      {
        label: "praxis-aegis",
        scope: "PA",
        stack: "TypeScript (ESM strict), Node 20+, Express 4, Zod",
        posture: PostureLevel.GUARDIAN,
        compliance: [],
        hardStops: [
          "Bypassing hardware-key attestation for CRITICAL tools",
          "Policy version rollback without audit trail",
        ],
        root: "~/code/praxis-aegis",
      },
      {
        label: "mazzeleczzare.com",
        scope: "BLOG",
        stack: "Astro 6, Tailwind 4, MDX, React 19, Cloudflare Pages",
        posture: PostureLevel.HIGH,
        compliance: ["WCAG-2.1-AA"],
        hardStops: [
          "Hardcoded hex values (CSS variables only)",
          "SOGI data in contact form logs",
        ],
        root: "~/code/mazze-leczzare-blog",
      },
      {
        label: "kintsugi",
        scope: "KIN",
        stack: "Python, circuit-breaker patterns",
        posture: PostureLevel.CREATIVE,
        compliance: [],
        hardStops: ["Silent failure suppression — breaking IS the payload"],
        root: "~/code/kintsugi",
      },
    ],
  });

  const stele = await prisma.project.findUniqueOrThrow({
    where: { scope: "STELE" },
  });
  const sp = await prisma.project.findUniqueOrThrow({ where: { scope: "SP" } });
  const pa = await prisma.project.findUniqueOrThrow({ where: { scope: "PA" } });

  // ─── ProjectNarratives — AI-authored, developer-refined ───

  await prisma.projectNarrative.createMany({
    skipDuplicates: true,
    data: [
      {
        projectId: stele.id,
        identity:
          "Stele is a directive compiler — a tool that translates intent into Claude-ready system prompts with embedded governance, not just formatting preferences.",
        philosophy:
          "Security is architecture, not configuration. The TOBIRA tripwire system doesn't detect threats after the fact; it changes the shape of what's possible mid-session. State escalates monotonically because trust, once broken, is not restored by declaration.",
        buildSequencing:
          "Group 1 (gate + schema) must complete before Group 2 (audit wiring), which must complete before Group 3 (compiler integrity), which gates Group 4 (API surface). Sequencing is a security property.",
        unstatedConstraints:
          "The banned vocabulary list (clean, compromise, inherit, failure, safe, breach, infected, corrupt) is not aesthetic — deviation in compiled output is itself a KOTODAMA-001 tripwire signal.",
      },
      {
        projectId: sp.id,
        identity:
          "Secure Pride builds security tooling specifically for LGBTQ+ organizations — threat models that account for physical safety consequences of attribute exposure, not just data breach costs.",
        philosophy:
          "SOGI data is not like other PII. Exposure can endanger lives. Every design decision is made against that premise, not as an edge case.",
        unstatedConstraints:
          "The 802.1x build order (FreeRADIUS → step-ca → UniFi → Mosyle → cert lifecycle) is non-negotiable. The network trust boundary must exist before devices can authenticate.",
      },
      {
        projectId: pa.id,
        identity:
          "praxis-aegis is the agentic trust enforcement layer — hardware-key-gated policy enforcement for AI tool invocations. It exists because 'I trust Claude' is not an access control policy.",
        philosophy:
          "AI agents are powerful enough to need the same governance primitives as human operators: versioned policies, immutable audit logs, hardware attestation for destructive actions.",
      },
    ],
  });

  // ─── Tesserae — open build items from Stele's topology ───

  await prisma.tessera.createMany({
    skipDuplicates: true,
    data: [
      {
        projectId: stele.id,
        code: "T-009",
        module: "audit.ts — integrityHash djb2 implementation",
        missingHalf:
          "Determination of whether djb2 is sufficient or requires upgrade to a stronger hash",
        buildGroup: 2,
      },
      {
        projectId: stele.id,
        code: "T-010",
        module: "types.ts — Tessera type definition",
        missingHalf:
          "tesserae field should be optional (Tessera[] | undefined), not required",
        buildGroup: 1,
      },
      {
        projectId: stele.id,
        code: "T-011",
        module: "DirectiveState — userModes field",
        missingHalf:
          "User mode fork UI: state shape exists, create/fork surface not built",
        blockedBy: "T-010",
        buildGroup: 4,
      },
      {
        projectId: stele.id,
        code: "T-012",
        module: "projectNarratives — export helper",
        missingHalf:
          "copy-to-projects.ts workflow: session narratives are authored but have no persist path",
        buildGroup: 5,
      },
    ],
  });

  // ─── OpenQuestions — epistemic items ───

  await prisma.openQuestion.createMany({
    data: [
      {
        projectId: stele.id,
        text: "Should audit entries be queryable by projectId to get per-project audit trails across sessions?",
      },
      {
        projectId: stele.id,
        text: "Should DirectiveState snapshots be persisted per session, or only the final state?",
      },
      {
        projectId: stele.id,
        text: "Should theme selection history be tracked as audit events for cross-session drift detection?",
      },
      {
        projectId: sp.id,
        text: "Is the DLP scanner's current output format compatible with the SOGI-aware redaction layer planned for v2?",
      },
    ],
  });

  // ─── Agent Sessions — one per posture tier ───

  const guardianSession = await prisma.agentSession.create({
    data: {
      sessionMode: "BUILD",
      outputTarget: "claude-md-project",
      verbosity: VerbosityLevel.STANDARD,
      hygieneTrigger: HygieneTrigger.TURN_BASED,
      hygieneAfterN: 3,
      activeProjectIds: [stele.id, pa.id],
      startedAt: new Date("2026-06-08T14:00:00Z"),
      endedAt: new Date("2026-06-08T14:47:00Z"),
    },
  });

  const standardSession = await prisma.agentSession.create({
    data: {
      sessionMode: "PLAN",
      outputTarget: "claude-ai",
      verbosity: VerbosityLevel.EXPANDED,
      hygieneTrigger: HygieneTrigger.OFF,
      hygieneAfterN: 3,
      activeProjectIds: [stele.id],
      startedAt: new Date("2026-06-07T10:00:00Z"),
      endedAt: new Date("2026-06-07T10:22:00Z"),
    },
  });

  const researchSession = await prisma.agentSession.create({
    data: {
      sessionMode: "REVIEW",
      outputTarget: "claude-md-global",
      verbosity: VerbosityLevel.DENSE,
      hygieneTrigger: HygieneTrigger.ON_COPY,
      hygieneAfterN: 5,
      activeProjectIds: [sp.id, pa.id],
      startedAt: new Date("2026-06-06T09:00:00Z"),
      endedAt: new Date("2026-06-06T09:58:00Z"),
    },
  });

  // ─── Audit Trails — realistic session histories ───

  // GUARDIAN session: reached WABI via KAPU-001 + APOCRYPHA-009
  await prisma.auditEntry.createMany({
    data: [
      {
        sessionId: guardianSession.id,
        action: AuditActionType.SESSION_START,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "a3f8c2d1",
        timestamp: new Date("2026-06-08T14:00:00Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.KOHAKU_EXTRACTION,
        fieldsExtracted: ["sessionMode", "verbosity", "activeProjectIds"],
        fieldsRejected: [],
        integrityHash: "b1e4d7a9",
        timestamp: new Date("2026-06-08T14:12:00Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.TSUGI_APPLIED,
        fieldsExtracted: ["sessionMode"],
        fieldsRejected: [],
        integrityHash: "c9f2a4b3",
        timestamp: new Date("2026-06-08T14:15:00Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.TOBIRA_FIRED,
        tobiraId: "TW-003",
        tobiraCode: "KAPU-003",
        fromState: IntegrityState.ZANSHIN,
        toState: IntegrityState.UNHEIMLICH,
        fieldsExtracted: [],
        fieldsRejected: ["escalationTriggers"],
        integrityHash: "d4c7e1f8",
        timestamp: new Date("2026-06-08T14:23:00Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.UTSUROI_TRANSITION,
        fromState: IntegrityState.ZANSHIN,
        toState: IntegrityState.UNHEIMLICH,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "e5b8d2c9",
        timestamp: new Date("2026-06-08T14:23:01Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.KOHAKU_EXTRACTION,
        fieldsExtracted: ["sessionMode"],
        fieldsRejected: ["outputSections", "customAppend"],
        integrityHash: "f6a3c7d4",
        timestamp: new Date("2026-06-08T14:31:00Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.KIRI_REJECTED,
        fieldsExtracted: [],
        fieldsRejected: ["customAppend"],
        integrityHash: "a7d4e8b1",
        timestamp: new Date("2026-06-08T14:31:05Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.TOBIRA_FIRED,
        tobiraId: "TW-009",
        tobiraCode: "APOCRYPHA-009",
        fromState: IntegrityState.UNHEIMLICH,
        toState: IntegrityState.WABI,
        fieldsExtracted: [],
        fieldsRejected: [],
        secretsDetected: true,
        integrityHash: "b8e5f9c2",
        timestamp: new Date("2026-06-08T14:38:00Z"),
      },
      {
        sessionId: guardianSession.id,
        action: AuditActionType.UTSUROI_TRANSITION,
        fromState: IntegrityState.UNHEIMLICH,
        toState: IntegrityState.WABI,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "c9f6a1d3",
        timestamp: new Date("2026-06-08T14:38:01Z"),
      },
    ],
  });

  // STANDARD session: stayed ZANSHIN throughout — clean session
  await prisma.auditEntry.createMany({
    data: [
      {
        sessionId: standardSession.id,
        action: AuditActionType.SESSION_START,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "1a2b3c4d",
        timestamp: new Date("2026-06-07T10:00:00Z"),
      },
      {
        sessionId: standardSession.id,
        action: AuditActionType.KOHAKU_EXTRACTION,
        fieldsExtracted: ["sessionMode", "activeProjectIds", "verbosity"],
        fieldsRejected: [],
        integrityHash: "2b3c4d5e",
        timestamp: new Date("2026-06-07T10:08:00Z"),
      },
      {
        sessionId: standardSession.id,
        action: AuditActionType.TSUGI_APPLIED,
        fieldsExtracted: ["activeProjectIds"],
        fieldsRejected: [],
        integrityHash: "3c4d5e6f",
        timestamp: new Date("2026-06-07T10:08:10Z"),
      },
      {
        sessionId: standardSession.id,
        action: AuditActionType.KOHAKU_EXTRACTION,
        fieldsExtracted: ["sessionMode"],
        fieldsRejected: [],
        integrityHash: "4d5e6f7a",
        timestamp: new Date("2026-06-07T10:18:00Z"),
      },
      {
        sessionId: standardSession.id,
        action: AuditActionType.TSUGI_APPLIED,
        fieldsExtracted: ["sessionMode"],
        fieldsRejected: [],
        integrityHash: "5e6f7a8b",
        timestamp: new Date("2026-06-07T10:18:05Z"),
      },
    ],
  });

  // RESEARCH session: hit EPOCHÉ via APOCRYPHA-010 + FJÚKA-011
  await prisma.auditEntry.createMany({
    data: [
      {
        sessionId: researchSession.id,
        action: AuditActionType.SESSION_START,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "9f8e7d6c",
        timestamp: new Date("2026-06-06T09:00:00Z"),
      },
      {
        sessionId: researchSession.id,
        action: AuditActionType.KOHAKU_EXTRACTION,
        fieldsExtracted: ["sessionMode", "verbosity"],
        fieldsRejected: [],
        integrityHash: "8e7d6c5b",
        timestamp: new Date("2026-06-06T09:09:00Z"),
      },
      {
        sessionId: researchSession.id,
        action: AuditActionType.TOBIRA_FIRED,
        tobiraId: "TW-010",
        tobiraCode: "APOCRYPHA-010",
        fromState: IntegrityState.ZANSHIN,
        toState: IntegrityState.UNHEIMLICH,
        fieldsExtracted: [],
        fieldsRejected: [],
        secretsDetected: true,
        integrityHash: "7d6c5b4a",
        timestamp: new Date("2026-06-06T09:21:00Z"),
      },
      {
        sessionId: researchSession.id,
        action: AuditActionType.UTSUROI_TRANSITION,
        fromState: IntegrityState.ZANSHIN,
        toState: IntegrityState.UNHEIMLICH,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "6c5b4a3f",
        timestamp: new Date("2026-06-06T09:21:01Z"),
      },
      {
        sessionId: researchSession.id,
        action: AuditActionType.TOBIRA_FIRED,
        tobiraId: "TW-011",
        tobiraCode: "FJUKA-011",
        fromState: IntegrityState.UNHEIMLICH,
        toState: IntegrityState.WABI,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "5b4a3f2e",
        timestamp: new Date("2026-06-06T09:34:00Z"),
      },
      {
        sessionId: researchSession.id,
        action: AuditActionType.UTSUROI_TRANSITION,
        fromState: IntegrityState.UNHEIMLICH,
        toState: IntegrityState.WABI,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "4a3f2e1d",
        timestamp: new Date("2026-06-06T09:34:01Z"),
      },
      {
        sessionId: researchSession.id,
        action: AuditActionType.TOBIRA_FIRED,
        tobiraId: "TW-004",
        tobiraCode: "NARIKIRI-004",
        fromState: IntegrityState.WABI,
        toState: IntegrityState.EPOCHE,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "3f2e1d0c",
        timestamp: new Date("2026-06-06T09:51:00Z"),
      },
      {
        sessionId: researchSession.id,
        action: AuditActionType.EPOCHE_ENTERED,
        fromState: IntegrityState.WABI,
        toState: IntegrityState.EPOCHE,
        fieldsExtracted: [],
        fieldsRejected: [],
        integrityHash: "2e1d0c9b",
        timestamp: new Date("2026-06-06T09:51:01Z"),
      },
    ],
  });

  // ─── State Snapshots — final state per session ───

  await prisma.stateSnapshot.createMany({
    data: [
      {
        sessionId: guardianSession.id,
        integrityState: IntegrityState.WABI,
        firedTobiraIds: ["TW-003", "TW-009"],
        themeId: "dark",
        capturedAt: new Date("2026-06-08T14:47:00Z"),
      },
      {
        sessionId: standardSession.id,
        integrityState: IntegrityState.ZANSHIN,
        firedTobiraIds: [],
        themeId: "dark",
        capturedAt: new Date("2026-06-07T10:22:00Z"),
      },
      {
        sessionId: researchSession.id,
        integrityState: IntegrityState.EPOCHE,
        firedTobiraIds: ["TW-010", "TW-011", "TW-004"],
        themeId: "dark",
        capturedAt: new Date("2026-06-06T09:58:00Z"),
      },
    ],
  });

  const projectCount = await prisma.project.count();
  const sessionCount = await prisma.agentSession.count();
  const auditCount = await prisma.auditEntry.count();
  const tobiraCount = await prisma.auditEntry.count({
    where: { action: "TOBIRA_FIRED" },
  });

  console.log(
    `Seeded: ${projectCount} projects · ${sessionCount} sessions · ${auditCount} audit entries (${tobiraCount} TOBIRA firings)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
