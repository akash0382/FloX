import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, getUser } from "../lib/auth";
import { validate } from "../lib/validate";
import { notifyTaskAssigned, notifyStatusChange } from "../lib/notify";
import { logActivity } from "../lib/activity";

export const taskRouter = Router();
taskRouter.use(requireAuth);

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const clean = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${clean}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  labels: z.array(z.string()).optional().default([]),
  projectId: z.string().min(1, "Project ID is required"),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

async function ensureTaskAccess(taskId: string, userId: string, role: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" as const };

  const project = await prisma.project.findUnique({ where: { id: task.projectId } });
  if (!project) return { error: "Project not found" as const };

  if (role !== "ADMIN" && project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    if (!member) return { error: "Forbidden" as const };
  }

  return { task, project };
}

// Create task — validates project membership
taskRouter.post("/", validate(createSchema), async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const { title, description, status, priority, dueDate, assigneeId, labels, projectId } = req.body;

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    // Verify user has access to this project
    if (role !== "ADMIN" && project.ownerId !== userId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!membership) { res.status(403).json({ error: "You are not a member of this project" }); return; }
    }

    // Validate assignee is a project member
    if (assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeId } },
      });
      if (!assigneeMember && project.ownerId !== assigneeId) {
        res.status(400).json({ error: "Assignee must be a project member" }); return;
      }
    }

    // Validate due date is not in the past (warn only, still allow)
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        labels: labels || [],
        projectId,
        createdById: userId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
        attachments: true,
      },
    });
    res.status(201).json({ task });

    // Log activity
    logActivity(task.id, userId, "created", `Created task "${task.title}"`);

    // Notify assignee (async, don't block response)
    if (task.assigneeId && task.assigneeId !== userId) {
      const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      notifyTaskAssigned(task.assigneeId, creator?.name || "Someone", task.title, projectId).catch(() => {});
    }
  } catch (e: any) {
    console.error("Create task error:", e.message);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task — validates ownership/membership
taskRouter.patch("/:id", validate(updateSchema), async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const id = String(req.params.id);

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) { res.status(404).json({ error: "Task not found" }); return; }

    // Verify user has access to the project
    const project = await prisma.project.findUnique({ where: { id: existingTask.projectId } });
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const isGlobalAdmin = role === "ADMIN";
    const isOwner = project.ownerId === userId;
    let isProjectAdmin = false;

    if (!isGlobalAdmin && !isOwner) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: existingTask.projectId, userId } },
      });
      if (!membership) { res.status(403).json({ error: "Forbidden" }); return; }
      isProjectAdmin = membership.role === "ADMIN";
    }

    // Members can only update status on tasks they're assigned to or created
    const canEditAll = isGlobalAdmin || isOwner || isProjectAdmin;
    if (!canEditAll) {
      const isAssignee = existingTask.assigneeId === userId;
      const isCreator = existingTask.createdById === userId;
      if (!isAssignee && !isCreator) {
        res.status(403).json({ error: "You can only update tasks assigned to you" }); return;
      }
      // Non-admins can only change status
      const allowedKeys = ["status"];
      const requestedKeys = Object.keys(req.body);
      const hasDisallowed = requestedKeys.some((k) => !allowedKeys.includes(k));
      if (hasDisallowed) {
        res.status(403).json({ error: "You can only change the status of this task" }); return;
      }
    }

    const data = { ...req.body };
    if (data.assigneeId !== undefined && data.assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: existingTask.projectId, userId: data.assigneeId } },
      });
      if (!assigneeMember && project.ownerId !== data.assigneeId) {
        res.status(400).json({ error: "Assignee must be a project member" }); return;
      }
    }
    if (data.dueDate !== undefined) {
      data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      data.dueReminderSentAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
        attachments: true,
      },
    });
    res.json({ task });

    // Log activity
    if (req.body.status && existingTask.status !== req.body.status) {
      const labels: Record<string, string> = { TODO: "To do", IN_PROGRESS: "In progress", IN_REVIEW: "In review", DONE: "Completed" };
      logActivity(task.id, userId, "status_changed", `Moved to "${labels[req.body.status] || req.body.status}"`);
    }
    if (req.body.assigneeId && req.body.assigneeId !== existingTask.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: req.body.assigneeId }, select: { name: true } });
      logActivity(task.id, userId, "assigned", `Assigned to ${assignee?.name || "someone"}`);
    }
    if (req.body.priority && req.body.priority !== existingTask.priority) {
      logActivity(task.id, userId, "priority_changed", `Priority changed to ${req.body.priority}`);
    }

    // Notify on status change
    if (req.body.status && existingTask.status !== req.body.status && existingTask.createdById !== userId) {
      const changer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      notifyStatusChange(existingTask.createdById, changer?.name || "Someone", task.title, req.body.status, existingTask.projectId).catch(() => {});
    }
    // Notify new assignee
    if (req.body.assigneeId && req.body.assigneeId !== existingTask.assigneeId && req.body.assigneeId !== userId) {
      const changer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      notifyTaskAssigned(req.body.assigneeId, changer?.name || "Someone", task.title, existingTask.projectId).catch(() => {});
    }
  } catch (e: any) {
    console.error("Update task error:", e.message);
    res.status(500).json({ error: "Failed to update task" });
  }
});

taskRouter.post("/:id/attachments", upload.array("files", 10), async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const id = String(req.params.id);
    const access = await ensureTaskAccess(id, userId, role);
    if ("error" in access) {
      res.status(access.error === "Forbidden" ? 403 : 404).json({ error: access.error });
      return;
    }

    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const attachments = await prisma.$transaction(
      files.map((file) =>
        prisma.taskAttachment.create({
          data: {
            taskId: id,
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
          },
        }),
      ),
    );

    res.status(201).json({ attachments });
  } catch (e: any) {
    console.error("Upload attachment error:", e.message);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

taskRouter.delete("/:id/attachments/:attachmentId", async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const id = String(req.params.id);
    const attachmentId = String(req.params.attachmentId);
    const access = await ensureTaskAccess(id, userId, role);
    if ("error" in access) {
      res.status(access.error === "Forbidden" ? 403 : 404).json({ error: access.error });
      return;
    }

    const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.taskId !== id) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }

    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    const filename = attachment.fileUrl.replace("/uploads/", "");
    const fullPath = path.join(uploadDir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    res.json({ success: true });
  } catch (e: any) {
    console.error("Delete attachment error:", e.message);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

// Delete task — validates ownership
taskRouter.delete("/:id", async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const id = String(req.params.id);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) { res.json({ success: true }); return; }

    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    const isGlobalAdmin = role === "ADMIN";
    const isOwner = project?.ownerId === userId;
    const isCreator = task.createdById === userId;

    if (!isGlobalAdmin && !isOwner) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
      });
      const isProjectAdmin = membership?.role === "ADMIN";
      if (!isProjectAdmin && !isCreator) {
        res.status(403).json({ error: "You can only delete tasks you created" }); return;
      }
    }

    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error("Delete task error:", e.message);
    res.status(500).json({ error: "Failed to delete task" });
  }
});
