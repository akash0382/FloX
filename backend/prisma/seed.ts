import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create users
  const hash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@flox.dev" },
    update: {},
    create: { name: "Akash Kumar", email: "admin@flox.dev", passwordHash: hash, role: "ADMIN" },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@flox.dev" },
    update: {},
    create: { name: "Alice Johnson", email: "alice@flox.dev", passwordHash: hash, role: "MEMBER" },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@flox.dev" },
    update: {},
    create: { name: "Bob Smith", email: "bob@flox.dev", passwordHash: hash, role: "MEMBER" },
  });

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Complete overhaul of the company website with modern UI/UX",
      color: "#8b5cf6",
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: alice.id, role: "MEMBER" },
          { userId: bob.id, role: "MEMBER" },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Mobile App v2",
      description: "React Native app for iOS and Android",
      color: "#06b6d4",
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: alice.id, role: "ADMIN" },
        ],
      },
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "API Integration",
      description: "Third-party payment gateway and analytics integration",
      color: "#f59e0b",
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: "ADMIN" },
          { userId: bob.id, role: "MEMBER" },
        ],
      },
    },
  });

  // Create tasks for project 1
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const tomorrow = new Date(now.getTime() + 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const lastWeek = new Date(now.getTime() - 7 * 86400000);

  await prisma.task.createMany({
    data: [
      { title: "Design homepage mockup", description: "Create Figma mockup for the new homepage layout", status: "DONE", priority: "HIGH", dueDate: lastWeek, labels: ["design", "ui"], projectId: project1.id, assigneeId: alice.id, createdById: admin.id },
      { title: "Implement responsive navbar", description: "Build mobile-first navigation component", status: "IN_REVIEW", priority: "HIGH", dueDate: yesterday, labels: ["frontend", "ui"], projectId: project1.id, assigneeId: bob.id, createdById: admin.id },
      { title: "Set up CI/CD pipeline", status: "IN_PROGRESS", priority: "MEDIUM", dueDate: tomorrow, labels: ["devops"], projectId: project1.id, assigneeId: admin.id, createdById: admin.id },
      { title: "Write unit tests for auth", status: "TODO", priority: "MEDIUM", dueDate: nextWeek, labels: ["testing", "backend"], projectId: project1.id, assigneeId: alice.id, createdById: admin.id },
      { title: "Optimize image loading", description: "Implement lazy loading and WebP format", status: "TODO", priority: "LOW", dueDate: nextWeek, labels: ["performance"], projectId: project1.id, assigneeId: bob.id, createdById: admin.id },
      { title: "Add dark mode support", status: "IN_PROGRESS", priority: "MEDIUM", labels: ["frontend", "feature"], projectId: project1.id, assigneeId: alice.id, createdById: alice.id },
      { title: "SEO meta tags", status: "TODO", priority: "LOW", dueDate: nextWeek, labels: ["seo"], projectId: project1.id, createdById: admin.id },
      { title: "Footer redesign", status: "DONE", priority: "LOW", labels: ["design"], projectId: project1.id, assigneeId: bob.id, createdById: admin.id },
    ],
  });

  // Tasks for project 2
  await prisma.task.createMany({
    data: [
      { title: "Set up React Native project", status: "DONE", priority: "HIGH", labels: ["setup"], projectId: project2.id, assigneeId: admin.id, createdById: admin.id },
      { title: "Authentication screens", status: "IN_PROGRESS", priority: "HIGH", dueDate: tomorrow, labels: ["auth", "ui"], projectId: project2.id, assigneeId: alice.id, createdById: admin.id },
      { title: "Push notifications", status: "TODO", priority: "MEDIUM", dueDate: nextWeek, labels: ["feature"], projectId: project2.id, assigneeId: admin.id, createdById: alice.id },
      { title: "App store submission", status: "TODO", priority: "URGENT", dueDate: nextWeek, labels: ["release"], projectId: project2.id, createdById: admin.id },
    ],
  });

  // Tasks for project 3
  await prisma.task.createMany({
    data: [
      { title: "Stripe integration", description: "Set up Stripe for payment processing", status: "IN_PROGRESS", priority: "URGENT", dueDate: yesterday, labels: ["payment", "backend"], projectId: project3.id, assigneeId: bob.id, createdById: alice.id },
      { title: "Analytics dashboard", status: "TODO", priority: "HIGH", dueDate: nextWeek, labels: ["analytics", "feature"], projectId: project3.id, assigneeId: alice.id, createdById: alice.id },
      { title: "Webhook handlers", status: "TODO", priority: "MEDIUM", labels: ["backend"], projectId: project3.id, assigneeId: bob.id, createdById: alice.id },
    ],
  });

  // Add some comments
  const tasks = await prisma.task.findMany({ take: 3 });
  if (tasks.length > 0) {
    await prisma.comment.createMany({
      data: [
        { content: "Looking good! Just need to fix the mobile breakpoint.", taskId: tasks[0].id, authorId: admin.id },
        { content: "I'll handle this after the navbar is merged.", taskId: tasks[0].id, authorId: alice.id },
        { content: "Updated the design based on feedback. Ready for review.", taskId: tasks[1].id, authorId: bob.id },
      ],
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Users: admin@flox.dev, alice@flox.dev, bob@flox.dev`);
  console.log(`   Password: password123`);
  console.log(`   Projects: ${project1.name}, ${project2.name}, ${project3.name}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
