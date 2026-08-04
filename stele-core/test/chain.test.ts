// The durable chain is the half the browser cannot provide: verification by a
// party other than the writer. It had no tests at all, including none for the
// injectivity fix — the browser side got a regression case and this side did
// not, which is exactly the asymmetry that lets one encoder drift from the other.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHAIN_VERSION,
  GENESIS_HASH,
  chainHash,
  chainInput,
  verifyChain,
  type ChainableEvent,
} from "../src/chain.js";

const SID = "session-abc";
const TS = "2026-08-04T00:00:00.000Z";

const ev = (over: Partial<ChainableEvent> = {}): ChainableEvent => ({
  action: "TOBIRA_FIRED",
  tobiraId: "TW-001",
  tobiraCode: "KAPU-001",
  fromState: "ZANSHIN",
  toState: "EPOCHE",
  fieldsExtracted: [],
  fieldsRejected: [],
  secretsDetected: false,
  ...over,
});

// Builds a well-formed chain the way the append route does, so verifyChain is
// exercised against real predecessor linkage rather than hand-written hashes.
function buildChain(events: ChainableEvent[], sessionId = SID) {
  let prev = GENESIS_HASH;
  return events.map((e, i) => {
    const timestamp = new Date(Date.parse(TS) + i * 1000);
    const integrityHash = chainHash(prev, e, sessionId, timestamp.toISOString());
    prev = integrityHash;
    return { ...e, id: `entry-${i}`, integrityHash, timestamp };
  });
}

describe("chain primitives", () => {
  it("genesis is 64 hex zeros", () => {
    assert.equal(GENESIS_HASH, "0".repeat(64));
    assert.match(GENESIS_HASH, /^[0-9a-f]{64}$/);
  });

  it("is deterministic for identical input", () => {
    assert.equal(chainHash(GENESIS_HASH, ev(), SID, TS), chainHash(GENESIS_HASH, ev(), SID, TS));
  });

  it("binds the encoding version into the preimage", () => {
    // A stored chain must not silently verify under a different encoding.
    assert.ok(chainInput(GENESIS_HASH, ev(), SID, TS).startsWith(CHAIN_VERSION));
  });

  it("changes when the predecessor changes", () => {
    const a = chainHash(GENESIS_HASH, ev(), SID, TS);
    const b = chainHash("f".repeat(64), ev(), SID, TS);
    assert.notEqual(a, b);
  });

  it("binds sessionId and timestamp", () => {
    const base = chainHash(GENESIS_HASH, ev(), SID, TS);
    assert.notEqual(base, chainHash(GENESIS_HASH, ev(), "other-session", TS));
    assert.notEqual(base, chainHash(GENESIS_HASH, ev(), SID, "2026-08-04T00:00:01.000Z"));
  });
});

describe("encoding is injective", () => {
  // The witness must move the field boundary WITHOUT changing how many
  // separators exist. Emptying a field instead ("KAPU|001" + "") drops a
  // character, so the old delimiter-joined encoding survived that case by
  // accident — a regression test built on it would have passed against the bug.
  it("does not collide when content shifts across a field boundary", () => {
    const left = chainHash(GENESIS_HASH, ev({ tobiraId: "KAPU", tobiraCode: "001|NARIKIRI" }), SID, TS);
    const right = chainHash(GENESIS_HASH, ev({ tobiraId: "KAPU|001", tobiraCode: "NARIKIRI" }), SID, TS);
    assert.notEqual(left, right);
  });

  it("does not collide when an array element contains a comma", () => {
    const two = chainHash(GENESIS_HASH, ev({ fieldsExtracted: ["stack", "posture"] }), SID, TS);
    const one = chainHash(GENESIS_HASH, ev({ fieldsExtracted: ["stack,posture"] }), SID, TS);
    assert.notEqual(one, two);
  });

  it("distinguishes an empty array from an array holding one empty string", () => {
    const empty = chainHash(GENESIS_HASH, ev({ fieldsRejected: [] }), SID, TS);
    const blank = chainHash(GENESIS_HASH, ev({ fieldsRejected: [""] }), SID, TS);
    assert.notEqual(empty, blank);
  });

  it("does not let an absent field impersonate an empty one across the seam", () => {
    const a = chainHash(GENESIS_HASH, ev({ fromState: "ZANSHIN|EPOCHE", toState: "" }), SID, TS);
    const b = chainHash(GENESIS_HASH, ev({ fromState: "ZANSHIN", toState: "|EPOCHE" }), SID, TS);
    assert.notEqual(a, b);
  });
});

describe("verifyChain", () => {
  it("accepts an intact chain", () => {
    const entries = buildChain([ev({ action: "SESSION_START" }), ev(), ev({ action: "EPOCHE_ENTERED" })]);
    assert.deepEqual(verifyChain(entries, SID), { valid: true, entries: 3 });
  });

  it("accepts an empty chain", () => {
    assert.deepEqual(verifyChain([], SID), { valid: true, entries: 0 });
  });

  it("reports the first divergence when a field is rewritten", () => {
    const entries = buildChain([ev({ action: "SESSION_START" }), ev(), ev()]);
    entries[1].tobiraCode = "KAPU-999";
    const result = verifyChain(entries, SID);
    assert.equal(result.valid, false);
    assert.equal(result.valid === false && result.brokenAt.index, 1);
    assert.equal(result.valid === false && result.brokenAt.id, "entry-1");
  });

  it("detects a dropped entry", () => {
    const entries = buildChain([ev(), ev(), ev()]);
    const result = verifyChain([entries[0], entries[2]], SID);
    assert.equal(result.valid, false);
  });

  it("detects reordering", () => {
    const entries = buildChain([ev({ action: "SESSION_START" }), ev()]);
    const result = verifyChain([entries[1], entries[0]], SID);
    assert.equal(result.valid, false);
  });

  it("rejects a chain replayed under a different sessionId", () => {
    // Entries are bound to their session; lifting them into another one must
    // not verify, or a trail could be transplanted between sessions.
    const entries = buildChain([ev(), ev()]);
    assert.equal(verifyChain(entries, "different-session").valid, false);
  });

  it("rejects a hash the client would have supplied", () => {
    // The server computes the chain precisely so a caller cannot vouch for its
    // own tamper evidence. A plausible-looking foreign hash must not verify.
    const entries = buildChain([ev()]);
    entries[0].integrityHash = "a".repeat(64);
    assert.equal(verifyChain(entries, SID).valid, false);
  });
});
