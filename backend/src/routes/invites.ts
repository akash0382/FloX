import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, getUser } from "../lib/auth";
import { validate } from "../lib/validate";

export const inviteRouter = Router();

const createSchema = z.object({
  projectId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  maxUses: z.number().int().positive().optional().nullable(),
});

// Create invite link (project admin only)
inviteRouter.post("/", requireAuth, validate(createSchema), async (req, res) => {
  try {
    const { userId, role } = getUser(req);
    const { projectId, role: inviteRole, maxUses } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    // Check admin access
    if (role !== "ADMIN" && project.ownerId !== userId) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!membership || membership.role !== "ADMIN") {
        res.status(403).json({ error: "Admin access required" }); return;
      }
    }

    const code = crypto.randomBytes(16).toString("hex");
    const invite = await prisma.inviteLink.create({
      data: {
        code,
        projectId,
        role: inviteRole,
        maxUses: maxUses || null,
        createdById: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({ invite, link: `/join/${code}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get invite info (public - no auth needed)
inviteRouter.get("/:code", async (req, res) => {
  try {
    const code = String(req.params.code);
    const invite = await prisma.inviteLink.findUnique({
      where: { code },
      include: { project: { select: { id: true, name: true, color: true, _count: { select: { members: true } } } } },
    });

    if (!invite) { res.status(404).json({ error: "Invite link not found" }); return; }
    if (invite.expiresAt && invite.expiresAt < new Date()) { res.status(410).json({ error: "Invite link has expired" }); return; }
    if (invite.maxUses && invite.usedCount >= invite.maxUses) { res.status(410).json({ error: "Invite link has reached max uses" }); return; }

    res.json({ invite: { code: invite.code, role: invite.role, project: invite.project } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Accept invite (auth required)
inviteRouter.post("/:code/accept", requireAuth, async (req, res) => {
  try {
    const { userId } = getUser(req);
    const code = String(req.params.code);

    const invite = await prisma.inviteLink.findUnique({ where: { code } });
    if (!invite) { res.status(404).json({ error: "Invite not found" }); return; }
    if (invite.expiresAt && invite.expiresAt < new Date()) { res.status(410).json({ error: "Expired" }); return; }
    if (invite.maxUses && invite.usedCount >= invite.maxUses) { res.status(410).json({ error: "Max uses reached" }); return; }

    // Check if already a member
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: invite.projectId, userId } },
    });
    if (existing) { res.json({ success: true, alreadyMember: true, projectId: invite.projectId }); return; }

    // Add to project
    await prisma.projectMember.create({
      data: { projectId: invite.projectId, userId, role: invite.role },
    });

    // Increment used count
    await prisma.inviteLink.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    });

    res.json({ success: true, projectId: invite.projectId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List invites for a project
inviteRouter.get("/project/:projectId", requireAuth, async (req, res) => {
  try {
    const projectId = String(req.params.projectId);
    const invites = await prisma.inviteLink.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ invites });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
