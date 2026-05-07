import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, getUser } from "../lib/auth";
import { validate } from "../lib/validate";
import { notifyComment } from "../lib/notify";

export const commentRouter = Router();
commentRouter.use(requireAuth);

const createSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  taskId: z.string().min(1),
});

// Get comments for a task
commentRouter.get("/task/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ comments });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Create comment
commentRouter.post("/", validate(createSchema), async (req, res) => {
  try {
    const { userId } = getUser(req);
    const { content, taskId } = req.body;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const comment = await prisma.comment.create({
      data: { content, taskId, authorId: userId },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    res.status(201).json({ comment });

    // Notify task assignee and creator
    const notifyTargets = new Set<string>();
    if (task.assigneeId && task.assigneeId !== userId) notifyTargets.add(task.assigneeId);
    if (task.createdById !== userId) notifyTargets.add(task.createdById);
    const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    for (const targetId of notifyTargets) {
      notifyComment(targetId, commenter?.name || "Someone", task.title, task.projectId).catch(() => {});
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete comment (author only)
commentRouter.delete("/:id", async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) { res.json({ success: true }); return; }
    if (comment.authorId !== userId && role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own comments" }); return;
    }
    await prisma.comment.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
