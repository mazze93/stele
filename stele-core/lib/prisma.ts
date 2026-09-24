import "dotenv/config";
import type { Context } from "hono";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

type Env = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
};

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Node (local dev, CI, one-off scripts like seed.ts/verify-prisma.ts): one
// long-lived client for the process, created lazily on first use rather than
// at module load. This file is also imported by route handlers that run
// under Cloudflare Workers, where DATABASE_URL is never set — eager
// construction here would throw at module-init time and crash the Worker
// before it could handle a single request. Cached on `globalThis` so a
// dev-server hot reload doesn't leak a new pool per reload.
export function getNodePrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set.");
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(connectionString),
    });
  }
  return globalForPrisma.prisma;
}

// Route handlers call this instead of importing a module-level client, so
// the same code runs correctly under both @hono/node-server (falls back to
// the Node singleton above) and Cloudflare Workers (env.HYPERDRIVE present).
//
// The Workers branch is deliberately NOT cached across requests. Cloudflare's
// own Hyperdrive troubleshooting guide calls this out explicitly — a pg
// client/pool created in one request's isolate context and reused in
// another's fails with "Cannot perform I/O on behalf of a different
// request," because the underlying socket can be torn down between
// invocations. Hyperdrive already pools the real upstream connections, so a
// fresh client per request is cheap by design, not a compromise.
export function getPrisma(c: Context): PrismaClient {
  const hyperdrive = (c.env as Env | undefined)?.HYPERDRIVE;
  if (!hyperdrive) return getNodePrisma();
  return new PrismaClient({ adapter: new PrismaPg(hyperdrive.connectionString) });
}
