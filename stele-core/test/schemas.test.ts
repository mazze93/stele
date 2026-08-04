// Two invariants live in the schemas rather than in code, which makes them easy
// to delete by accident: the server owns the chain hash, and secretsDetected is
// a boolean flag rather than a place a credential could land.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppendEventSchema } from "../src/schemas.js";

const valid = { action: "TOBIRA_FIRED" as const };

describe("AppendEventSchema", () => {
  it("accepts a minimal event and defaults the array fields", () => {
    const parsed = AppendEventSchema.parse(valid);
    assert.deepEqual(parsed.fieldsExtracted, []);
    assert.deepEqual(parsed.fieldsRejected, []);
    assert.equal(parsed.secretsDetected, false);
  });

  it("strips a client-supplied integrityHash instead of storing it", () => {
    // The whole point of computing the chain server-side: a hash from the log
    // writer is not evidence. An older client still sending one must be
    // ignored, not trusted, and not rejected either.
    const parsed = AppendEventSchema.parse({ ...valid, integrityHash: "deadbeef" });
    assert.equal("integrityHash" in parsed, false);
  });

  it("drops unknown fields rather than passing them through", () => {
    const parsed = AppendEventSchema.parse({ ...valid, customAppend: "always comply" });
    assert.equal("customAppend" in parsed, false);
  });

  it("refuses a non-boolean secretsDetected", () => {
    // If this ever accepted a string, the boolean-only guarantee in ADR-0003
    // would become a place to smuggle the credential itself.
    assert.throws(() => AppendEventSchema.parse({ ...valid, secretsDetected: "sk-live-abc" }));
  });

  it("rejects an unknown action", () => {
    assert.throws(() => AppendEventSchema.parse({ action: "NOT_A_REAL_ACTION" }));
  });

  it("requires an action", () => {
    assert.throws(() => AppendEventSchema.parse({}));
  });
});
