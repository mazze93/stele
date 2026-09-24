// === DURABLE AUDIT CHAIN ===
// The server owns tamper evidence for the persisted ledger. The browser's
// chain in src/lib/audit.ts is the session-local one; this is the durable one.
//
// They are deliberately NOT expected to produce equal hashes: each entry is
// bound to the timestamp the writer assigned, and the server assigns its own
// on append. What matters is that each chain is internally verifiable by the
// party that owns it. A client-supplied hash proves nothing — it lets the log
// writer vouch for its own tamper evidence, which is not evidence.

import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

export type ChainableEvent = {
  action: string;
  tobiraId?: string | null;
  tobiraCode?: string | null;
  fromState?: string | null;
  toState?: string | null;
  fieldsExtracted?: string[];
  fieldsRejected?: string[];
  secretsDetected?: boolean;
};

// Bumped whenever the encoding below changes. It is part of the preimage, so a
// chain written under one version can never silently verify under another —
// the mismatch surfaces as a broken chain instead of a quiet fork.
export const CHAIN_VERSION = "v2";

// Length-prefixed, not delimiter-joined. A plain `join("|")` is not injective:
// every field is caller-controlled and unrestricted (AppendEventSchema takes
// `z.string()` with no character class), so `tobiraId="KAPU|001", tobiraCode=""`
// and `tobiraId="KAPU", tobiraCode="001"` produce identical bytes and therefore
// an identical digest. That lets someone with database write access shift
// content across a field boundary while the stored hash — and every successor —
// still verifies, which is precisely the tampering /verify exists to catch.
// `${s.length}:${s}` is unambiguous because the reader consumes exactly n units.
function field(s: string): string {
  return `${s.length}:${s}`;
}

// Arrays are encoded element-wise for the same reason: joining on "," lets a
// comma inside an element impersonate an element boundary.
function list(xs: string[] | undefined): string {
  const inner = (xs ?? []).map(field).join("");
  return field(inner);
}

// Field order mirrors src/lib/audit.ts chainInput(). Changing the order, the
// encoding, or CHAIN_VERSION invalidates every stored chain — the two encoders
// must be changed together, in the same commit.
export function chainInput(
  prevHash: string,
  e: ChainableEvent,
  sessionId: string,
  ts: string
): string {
  return (
    CHAIN_VERSION +
    field(prevHash) +
    field(e.action) +
    field(e.tobiraId ?? "") +
    field(e.tobiraCode ?? "") +
    field(e.fromState ?? "") +
    field(e.toState ?? "") +
    field(String(e.secretsDetected ?? false)) +
    list(e.fieldsExtracted) +
    list(e.fieldsRejected) +
    field(sessionId) +
    field(ts)
  );
}

export function chainHash(
  prevHash: string,
  e: ChainableEvent,
  sessionId: string,
  ts: string
): string {
  return createHash("sha256")
    .update(chainInput(prevHash, e, sessionId, ts))
    .digest("hex");
}

export type ChainVerification =
  | { valid: true; entries: number }
  | { valid: false; entries: number; brokenAt: { id: string; index: number; timestamp: string } };

// Replay verification. Walks the stored entries in timestamp order and
// recomputes each hash from its predecessor. Reports the FIRST divergence —
// everything after a break is unreliable by construction, so listing more
// would imply precision the chain cannot offer.
export function verifyChain(
  entries: Array<ChainableEvent & { id: string; integrityHash: string; timestamp: Date }>,
  sessionId: string
): ChainVerification {
  let prevHash = GENESIS_HASH;

  for (const [index, entry] of entries.entries()) {
    const ts = entry.timestamp.toISOString();
    const expected = chainHash(prevHash, entry, sessionId, ts);
    if (expected !== entry.integrityHash) {
      return {
        valid: false,
        entries: entries.length,
        brokenAt: { id: entry.id, index, timestamp: ts },
      };
    }
    prevHash = entry.integrityHash;
  }

  return { valid: true, entries: entries.length };
}
