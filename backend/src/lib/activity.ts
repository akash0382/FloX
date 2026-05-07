import { prisma } from "./prisma";

export async function logActivity(taskId: string, actorId: string, action: string, detail: string) {
  return prisma.activity.create({
    data: { taskId, actorId, action, detail },
  }).catch(() => {}); // non-blocking
}
