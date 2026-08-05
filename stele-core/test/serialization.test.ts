// Regression pin. The original implementation matched the raw Postgres SQLSTATE
// ("40001") in a stringified error, but Prisma never emits that string — it
// normalises TransactionWriteConflict to code "P2034" with a fixed message. So
// every genuine concurrent append would have surfaced as an opaque 500 instead
// of the documented 409-retry, and nothing would have noticed, because the
// failure only appears under real contention.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSerializationFailure } from "../src/routes/sessions.js";

// Shaped like what @prisma/client actually throws for this condition.
class PrismaKnownRequestError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

describe("isSerializationFailure", () => {
  it("detects Prisma's normalised write-conflict code", () => {
    const err = new PrismaKnownRequestError(
      "Transaction failed due to a write conflict or a deadlock. Please retry your transaction",
      "P2034",
    );
    assert.equal(isSerializationFailure(err), true);
  });

  it("does not rely on the SQLSTATE appearing in the message", () => {
    // The exact message Prisma produces contains no "40001" anywhere. If this
    // ever regresses to a substring match, this case fails.
    const err = new PrismaKnownRequestError(
      "Transaction failed due to a write conflict or a deadlock. Please retry your transaction",
      "P2034",
    );
    assert.equal(err.message.includes("40001"), false);
    assert.equal(isSerializationFailure(err), true);
  });

  it("detects a raw driver-adapter SQLSTATE", () => {
    assert.equal(isSerializationFailure(Object.assign(new Error("could not serialize access"), { code: "40001" })), true);
  });

  it("detects a SQLSTATE carried under cause", () => {
    const err = Object.assign(new Error("transaction failed"), {
      cause: { code: "40001" },
    });
    assert.equal(isSerializationFailure(err), true);
  });

  it("ignores unrelated Prisma errors", () => {
    // P2002 is a unique-constraint violation — retrying that forever would turn
    // a permanent failure into a hot loop.
    assert.equal(isSerializationFailure(new PrismaKnownRequestError("Unique constraint failed", "P2002")), false);
  });

  it("ignores plain errors, null and undefined", () => {
    assert.equal(isSerializationFailure(new Error("boom")), false);
    assert.equal(isSerializationFailure(null), false);
    assert.equal(isSerializationFailure(undefined), false);
    assert.equal(isSerializationFailure("P2034"), false);
  });
});
