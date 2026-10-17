import { it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";
it("health exposes deployment metadata without session data or credentials", async () => {
  const response = await createApp().request("/health", {}, { CF_VERSION_METADATA: { id: "test-version" } });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.version, "test-version");
  assert.deepEqual(Object.keys(body).sort(), ["service", "status", "ts", "version"]);
});
