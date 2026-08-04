import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requireBearer } from "./middleware/auth.js";
import { sessions } from "./routes/sessions.js";
import { projects } from "./routes/projects.js";
import { drift } from "./routes/drift.js";

export function createApp() {
  const app = new Hono();

  // CORS — allows Stele (Vite dev: localhost:5173) and Stele deployed origins
  app.use(
    "/api/*",
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:4173",
        "https://stele.mazzeleczzare.com",
      ],
      allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
      // Authorization must be allowed or the browser blocks every authenticated
      // request at the preflight — see middleware/auth.ts.
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    })
  );

  app.use("/api/*", logger());

  // Perimeter. Ordered after cors() so preflights are answered without a token,
  // and before every route so no /api/* path is anonymously reachable.
  app.use("/api/*", requireBearer);

  // Health check
  app.get("/health", (c) =>
    c.json({ status: "ok", service: "stele-core", ts: new Date().toISOString() })
  );

  // Routes
  app.route("/api/sessions", sessions);
  app.route("/api/projects", projects);
  app.route("/api/drift", drift);

  // 404 fallback
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  // Error handler
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
