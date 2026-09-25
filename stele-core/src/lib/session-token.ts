// A session token authorizes writes/reads scoped to exactly the one
// AgentSession it was minted for — the credential an anonymous browser
// client holds instead of the server-to-server API_SECRET. Only its hash is
// ever persisted (schema.prisma: AgentSession.tokenHash); the raw token
// exists only in the POST /api/sessions response and the caller's memory.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// Constant-time compare, matching-prefix and timing rationale as in
// middleware/auth.ts's secretsMatch. Both inputs here are already SHA-256
// hex digests (fixed 32 bytes each) rather than raw secrets, so the length
// check exists only to avoid `timingSafeEqual` throwing on mismatched
// buffer sizes — it is not itself a length side-channel, since a real digest
// mismatch never reaches it (both sides are always 64 hex chars).
export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
