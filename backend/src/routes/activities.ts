import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";

export const activityRouter = Router();
activityRouter.use(requireAuth);

// Get activities for a task
activityRouter.get("/task/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const activities = await prisma.activity.findMany({
      where: { taskId },
      include: { actor: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    res.json({ activities });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
