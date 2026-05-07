import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, getUser } from "../lib/auth";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

// Get my notifications
notificationRouter.get("/", async (req, res) => {
  try {
    const { userId } = getUser(req);
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });
    res.json({ notifications, unreadCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Mark all as read
notificationRouter.patch("/read-all", async (req, res) => {
  try {
    const { userId } = getUser(req);
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Mark one as read
notificationRouter.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a notification
notificationRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
