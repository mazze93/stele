import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./src/server.js";

const PORT = Number(process.env.PORT ?? 4000);
const app = createApp();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`stele-core running on http://localhost:${info.port}`);
  console.log(`  GET  /health`);
  console.log(`  POST /api/sessions`);
  console.log(`  POST /api/sessions/:id/events`);
  console.log(`  GET  /api/sessions/:id`);
  console.log(`  PATCH /api/sessions/:id/end`);
  console.log(`  GET  /api/projects`);
  console.log(`  GET  /api/projects/:scope`);
  console.log(`  GET  /api/drift`);
});
