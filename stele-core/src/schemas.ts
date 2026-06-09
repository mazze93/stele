import { z } from "zod";

// Mirror Prisma enums as Zod schemas so request bodies are validated at the boundary.
// These must stay in sync with prisma/schema.prisma enums.

export const IntegrityStateSchema = z.enum([
  "ZANSHIN",
  "UNHEIMLICH",
  "WABI",
  "EPOCHE",
]);

export const VerbosityLevelSchema = z.enum(["DENSE", "STANDARD", "EXPANDED"]);

export const HygieneTriggerSchema = z.enum([
  "OFF",
  "ON_COPY",
  "TURN_BASED",
  "MANUAL",
]);

export const AuditActionTypeSchema = z.enum([
  "SESSION_START",
  "KOHAKU_EXTRACTION",
  "TSUGI_APPLIED",
  "KIRI_REJECTED",
  "TOBIRA_FIRED",
  "UTSUROI_TRANSITION",
  "EPOCHE_ENTERED",
]);

// POST /api/sessions — start a new session
export const CreateSessionSchema = z.object({
  sessionMode: z.string().min(1),
  outputTarget: z.enum([
    "claude-ai",
    "claude-md-global",
    "claude-md-project",
  ]),
  verbosity: VerbosityLevelSchema,
  hygieneTrigger: HygieneTriggerSchema,
  hygieneAfterN: z.number().int().positive().default(3),
  activeProjectIds: z.array(z.string()).default([]),
});

// POST /api/sessions/:id/events — append an audit entry
// secretsDetected is boolean ONLY — the server must never receive or store the actual secret
export const AppendEventSchema = z.object({
  action: AuditActionTypeSchema,
  tobiraId: z.string().optional(),
  tobiraCode: z.string().optional(),
  fromState: IntegrityStateSchema.optional(),
  toState: IntegrityStateSchema.optional(),
  fieldsExtracted: z.array(z.string()).default([]),
  fieldsRejected: z.array(z.string()).default([]),
  secretsDetected: z.boolean().default(false),
  integrityHash: z.string().min(1),
});

// PATCH /api/sessions/:id/end — mark session ended and capture state snapshot
export const EndSessionSchema = z.object({
  integrityState: IntegrityStateSchema,
  firedTobiraIds: z.array(z.string()).default([]),
  themeId: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type AppendEventInput = z.infer<typeof AppendEventSchema>;
export type EndSessionInput = z.infer<typeof EndSessionSchema>;
