import { prisma } from "./prisma";

type NotifyParams = {
  userId: string;
  type: "ASSIGNED" | "COMMENT" | "STATUS_CHANGE" | "ADDED_TO_PROJECT" | "DEADLINE";
  message: string;
  linkUrl?: string;
};

export async function createNotification({ userId, type, message, linkUrl }: NotifyParams) {
  // Don't notify yourself
  return prisma.notification.create({
    data: { userId, type, message, linkUrl, read: false },
  });
}

export async function notifyTaskAssigned(assigneeId: string, assignerName: string, taskTitle: string, projectId: string) {
  await createNotification({
    userId: assigneeId,
    type: "ASSIGNED",
    message: `${assignerName} assigned you to "${taskTitle}"`,
    linkUrl: `/projects/${projectId}`,
  });
}

export async function notifyComment(taskOwnerId: string, commenterName: string, taskTitle: string, projectId: string) {
  await createNotification({
    userId: taskOwnerId,
    type: "COMMENT",
    message: `${commenterName} commented on "${taskTitle}"`,
    linkUrl: `/projects/${projectId}`,
  });
}

export async function notifyStatusChange(creatorId: string, changerName: string, taskTitle: string, newStatus: string, projectId: string) {
  const statusLabels: Record<string, string> = { TODO: "To do", IN_PROGRESS: "In progress", IN_REVIEW: "In review", DONE: "Completed" };
  await createNotification({
    userId: creatorId,
    type: "STATUS_CHANGE",
    message: `${changerName} moved "${taskTitle}" to ${statusLabels[newStatus] || newStatus}`,
    linkUrl: `/projects/${projectId}`,
  });
}

export async function notifyAddedToProject(userId: string, adderName: string, projectName: string, projectId: string) {
  await createNotification({
    userId,
    type: "ADDED_TO_PROJECT",
    message: `${adderName} added you to "${projectName}"`,
    linkUrl: `/projects/${projectId}`,
  });
}

export async function notifyDeadlineApproaching(userId: string, taskTitle: string, projectId: string, dueDate: Date) {
  await createNotification({
    userId,
    type: "DEADLINE",
    message: `Deadline today: "${taskTitle}" (${dueDate.toLocaleDateString()})`,
    linkUrl: `/projects/${projectId}`,
  });
}
