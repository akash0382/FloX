import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { authRouter } from "./routes/auth";
import { projectRouter } from "./routes/projects";
import { taskRouter } from "./routes/tasks";
import { dashboardRouter } from "./routes/dashboard";
import { commentRouter } from "./routes/comments";
import { notificationRouter } from "./routes/notifications";
import { inviteRouter } from "./routes/invites";
import { activityRouter } from "./routes/activities";
import { prisma } from "./lib/prisma";
import { notifyDeadlineApproaching } from "./lib/notify";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/comments", commentRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/invites", inviteRouter);
app.use("/api/activities", activityRouter);

async function processDeadlineNotifications() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const dueToday = await prisma.task.findMany({
    where: {
      dueDate: { gte: start, lt: end },
      status: { not: "DONE" },
      dueReminderSentAt: null,
      assigneeId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assigneeId: true,
      projectId: true,
    },
  });

  for (const task of dueToday) {
    if (!task.assigneeId || !task.dueDate) continue;
    await notifyDeadlineApproaching(task.assigneeId, task.title, task.projectId, task.dueDate);
    await prisma.task.update({
      where: { id: task.id },
      data: { dueReminderSentAt: new Date() },
    });
  }
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  processDeadlineNotifications().catch((e) => console.error("deadline notify error", e));
  setInterval(() => {
    processDeadlineNotifications().catch((e) => console.error("deadline notify error", e));
  }, 10 * 60 * 1000);
});
