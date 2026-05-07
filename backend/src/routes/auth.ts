import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, setTokenCookie, clearTokenCookie, requireAuth, getUser } from "../lib/auth";
import { validate } from "../lib/validate";

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/signup", validate(signupSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

    const count = await prisma.user.count();
    const role = count === 0 ? "ADMIN" : "MEMBER";

    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash: await hashPassword(password), role },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    setTokenCookie(res, { userId: user.id, email: user.email, role: user.role });
    res.status(201).json({ user });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

authRouter.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

    setTokenCookie(res, { userId: user.id, email: user.email, role: user.role });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

authRouter.post("/logout", (_req, res) => {
  clearTokenCookie(res);
  res.json({ success: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { userId } = getUser(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ user });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});
