// Cloudflare Workers entry point. Deliberately separate from index.ts (the
// @hono/node-server entry used for local dev) — a Worker has no `process`,
// no long-lived listener, and reaches Postgres through the HYPERDRIVE
// binding rather than a directly-held connection string. Both entry points
// share the same createApp(); only how the app is served differs.
import { createApp } from "./server.js";

const app = createApp();

export default app;
