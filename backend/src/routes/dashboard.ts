import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, getUser } from "../lib/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/", async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const now = new Date();

    const projectFilter = role === "ADMIN" ? {} : {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    };

    const projectIds = (await prisma.project.findMany({
      where: projectFilter,
      select: { id: true },
    })).map((p) => p.id);

    const taskScope = role === "ADMIN" ? {} : { projectId: { in: projectIds } };

    const [todo, inProgress, inReview, done, overdue, totalProjects, myTasks, recentTasks] = await Promise.all([
      prisma.task.count({ where: { ...taskScope, status: "TODO" } }),
      prisma.task.count({ where: { ...taskScope, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...taskScope, status: "IN_REVIEW" } }),
      prisma.task.count({ where: { ...taskScope, status: "DONE" } }),
      prisma.task.count({ where: { ...taskScope, status: { not: "DONE" }, dueDate: { lt: now } } }),
      prisma.project.count({ where: projectFilter }),
      prisma.task.findMany({
        where: { assigneeId: userId },
        include: { project: { select: { id: true, name: true, color: true } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 10,
      }),
      prisma.task.findMany({
        where: taskScope,
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    res.json({
      stats: { todo, inProgress, inReview, done, overdue, totalProjects, totalTasks: todo + inProgress + inReview + done },
      myTasks,
      recentTasks,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
