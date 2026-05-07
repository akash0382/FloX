-- Add due reminder tracking
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "dueReminderSentAt" TIMESTAMP(3);

-- Create task attachments table
CREATE TABLE IF NOT EXISTS "TaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaskAttachment_taskId_createdAt_idx" ON "TaskAttachment"("taskId", "createdAt");

ALTER TABLE "TaskAttachment"
ADD CONSTRAINT "TaskAttachment_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
