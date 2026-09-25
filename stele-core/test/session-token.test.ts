import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSessionToken,
  hashSessionToken,
  hashesMatch,
} from "../src/lib/session-token.js";

describe("generateSessionToken", () => {
  it("produces distinct tokens across calls", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    assert.notEqual(a, b);
  });

  it("produces a base64url string with no padding or unsafe characters", () => {
    const token = generateSessionToken();
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  it("carries at least 256 bits of entropy (32 raw bytes, base64url-encoded)", () => {
    // 32 bytes -> 43 base64url characters, no '=' padding.
    const token = generateSessionToken();
    assert.equal(token.length, 43);
  });
});

describe("hashSessionToken", () => {
  it("is deterministic for the same input", () => {
    const token = generateSessionToken();
    assert.equal(hashSessionToken(token), hashSessionToken(token));
  });

  it("differs for different inputs", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    assert.notEqual(hashSessionToken(a), hashSessionToken(b));
  });

  it("produces a 64-character hex digest (SHA-256)", () => {
    const digest = hashSessionToken(generateSessionToken());
    assert.match(digest, /^[0-9a-f]{64}$/);
  });
});

describe("hashesMatch", () => {
  it("matches a digest against itself", () => {
    const digest = hashSessionToken(generateSessionToken());
    assert.equal(hashesMatch(digest, digest), true);
  });

  it("rejects two different digests", () => {
    const a = hashSessionToken(generateSessionToken());
    const b = hashSessionToken(generateSessionToken());
    assert.equal(hashesMatch(a, b), false);
  });

  it("rejects a digest that is a prefix of the real one, without throwing", () => {
    const digest = hashSessionToken(generateSessionToken());
    assert.equal(hashesMatch(digest.slice(0, -2), digest), false);
  });

  it("rejects a digest with trailing content appended, without throwing", () => {
    const digest = hashSessionToken(generateSessionToken());
    assert.equal(hashesMatch(digest + "00", digest), false);
  });
});
