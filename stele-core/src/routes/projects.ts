import { Hono } from "hono";
import { prisma } from "../../lib/prisma.js";

export const projects = new Hono();

// GET /api/projects — full registry with narrative and open question counts
projects.get("/", async (c) => {
  const items = await prisma.project.findMany({
    orderBy: { posture: "asc" },
    include: {
      narrative: {
        select: { identity: true, authoredAt: true, refinedAt: true },
      },
      _count: {
        select: {
          openQuestions: true,
          tesserae: true,
        },
      },
    },
  });
  return c.json({ projects: items });
});

// GET /api/projects/:scope — full project detail
projects.get("/:scope", async (c) => {
  const project = await prisma.project.findUnique({
    where: { scope: c.req.param("scope").toUpperCase() },
    include: {
      narrative: true,
      openQuestions: { orderBy: { createdAt: "asc" } },
      tesserae: { orderBy: { buildGroup: "asc" } },
    },
  });
  if (!project) return c.json({ error: "Project not found" }, 404);
  return c.json({ project });
});
