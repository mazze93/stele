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

// Field order mirrors src/lib/audit.ts chainInput(). Changing the order or the
// separator invalidates every stored chain — treat this function as frozen.
export function chainInput(
  prevHash: string,
  e: ChainableEvent,
  sessionId: string,
  ts: string
): string {
  return [
    prevHash,
    e.action,
    e.tobiraId ?? "",
    e.tobiraCode ?? "",
    e.fromState ?? "",
    e.toState ?? "",
    String(e.secretsDetected ?? false),
    e.fieldsExtracted?.join(",") ?? "",
    e.fieldsRejected?.join(",") ?? "",
    sessionId,
    ts,
  ].join("|");
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
