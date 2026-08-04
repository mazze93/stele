import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./src/server.js";

const PORT = Number(process.env.PORT ?? 4000);

// Loopback by default. The audit ledger has no business being reachable from
// the LAN because a dev machine happened to be on an untrusted network; put a
// reverse proxy in front of it deliberately if it ever needs to be exposed.
const HOSTNAME = process.env.HOST ?? "127.0.0.1";

const app = createApp();

serve({ fetch: app.fetch, hostname: HOSTNAME, port: PORT }, (info) => {
  console.log(`stele-core running on http://${HOSTNAME}:${info.port}`);
  console.log(`  GET  /health`);
  console.log(`  POST /api/sessions`);
  console.log(`  POST /api/sessions/:id/events`);
  console.log(`  GET  /api/sessions/:id`);
  console.log(`  PATCH /api/sessions/:id/end`);
  console.log(`  GET  /api/projects`);
  console.log(`  GET  /api/projects/:scope`);
  console.log(`  GET  /api/drift`);
});
