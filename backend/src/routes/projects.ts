import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, getUser } from "../lib/auth";
import { validate } from "../lib/validate";
import { notifyAddedToProject } from "../lib/notify";

export const projectRouter = Router();
projectRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// List projects
projectRouter.get("/", async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const where = role === "ADMIN" ? {} : {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    };
    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ projects });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Create project
projectRouter.post("/", validate(createSchema), async (req, res) => {
  try {
    const { userId } = getUser(req);
    const { name, description, color } = req.body;
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        color: color || "#06b6d4",
        ownerId: userId,
        members: { create: { userId, role: "ADMIN" } },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { tasks: true, members: true } },
      },
    });
    res.status(201).json({ project });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get project detail
projectRouter.get("/:id", async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const id = String(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          orderBy: { joinedAt: "asc" },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            createdBy: { select: { id: true, name: true } },
            attachments: true,
          },
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    // Access check
    if (role !== "ADMIN" && project.ownerId !== userId) {
      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) { res.status(403).json({ error: "Forbidden" }); return; }
    }

    const myMembership = project.members.find((m) => m.userId === userId);
    const myRole = role === "ADMIN" || project.ownerId === userId ? "ADMIN" : myMembership?.role || "MEMBER";

    res.json({ project, myRole });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete project
projectRouter.delete("/:id", async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const id = String(req.params.id);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) { res.json({ success: true }); return; }
    if (project.ownerId !== userId && role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await prisma.project.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Add member
projectRouter.post("/:id/members", validate(addMemberSchema), async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const id = String(req.params.id);
    const email = String(req.body.email);
    const memberRole = req.body.role === "ADMIN" ? "ADMIN" : "MEMBER";

    // Check admin access
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    if (role !== "ADMIN" && project.ownerId !== userId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: id, userId } },
      });
      if (!membership || membership.role !== "ADMIN") {
        res.status(403).json({ error: "Admin access required" }); return;
      }
    }

    const target = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!target) { res.status(404).json({ error: "User not found. They need to sign up first." }); return; }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: target.id } },
    });
    if (existing) { res.status(409).json({ error: "Already a member" }); return; }

    const member = await prisma.projectMember.create({
      data: { projectId: id, userId: target.id, role: memberRole },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    res.status(201).json({ member });

    // Notify the added user
    const adder = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    notifyAddedToProject(target.id, adder?.name || "Someone", project!.name, id).catch(() => {});
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Remove member
projectRouter.delete("/:id/members/:memberId", async (req, res) => {
  try {
    const { id, memberId } = req.params;
    await prisma.projectMember.delete({ where: { id: memberId } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
