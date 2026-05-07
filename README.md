# FloX — Team Task Manager

A full-stack web application for teams to create projects, assign tasks, and track progress with role-based access control (Admin/Member).

## Live Demo

- **Live URL:** [Add your Railway URL here]


## Features

- **Authentication** — Signup/Login with JWT (httpOnly cookies) and bcrypt password hashing
- **Project Management** — Create projects with color coding, invite team members by email
- **Task Management** — Create, assign, and track tasks with status, priority, due dates
- **Kanban Board** — Visual 4-column board (To do → In progress → In review → Completed)
- **Dashboard** — Overview with stats (total tasks, overdue, in progress, etc.) and personal task list
- **Role-Based Access Control** — Global Admin/Member roles + per-project Admin/Member roles
- **Overdue Detection** — Tasks past their due date are flagged automatically
- **Filters** — Filter tasks by All / Mine / Overdue on project pages

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React 18, Vite, TypeScript          |
| Styling    | Tailwind CSS, Lucide React icons    |
| Routing    | React Router DOM v6                 |
| Backend    | Express.js, TypeScript              |
| Database   | PostgreSQL                          |
| ORM        | Prisma                              |
| Auth       | JWT (jsonwebtoken) + bcryptjs       |
| Validation | Zod                                 |
| HTTP       | Axios (frontend), cookie-parser     |
| Deployment | Railway                             |

## Project Structure

```
akash/
├── backend/                    # Express REST API
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── lib/
│   │   │   ├── prisma.ts       # Prisma client singleton
│   │   │   ├── auth.ts         # JWT, bcrypt, middleware
│   │   │   └── validate.ts     # Zod validation middleware
│   │   └── routes/
│   │       ├── auth.ts         # Signup, login, logout, me
│   │       ├── projects.ts     # CRUD + members
│   │       ├── tasks.ts        # Create, update, delete
│   │       └── dashboard.ts    # Stats + my tasks
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Routes + auth provider
│   │   ├── index.css           # Tailwind + custom styles
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios instance
│   │   │   └── auth.tsx        # Auth context provider
│   │   ├── components/
│   │   │   └── Layout.tsx      # Sidebar layout
│   │   └── pages/
│   │       ├── Login.tsx
│   │       ├── Signup.tsx
│   │       ├── Dashboard.tsx
│   │       ├── Projects.tsx
│   │       └── ProjectDetail.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

## REST API Endpoints

| Method | Endpoint                              | Description                     |
| ------ | ------------------------------------- | ------------------------------- |
| POST   | `/api/auth/signup`                    | Create account                  |
| POST   | `/api/auth/login`                     | Login                           |
| POST   | `/api/auth/logout`                    | Logout                          |
| GET    | `/api/auth/me`                        | Get current user                |
| GET    | `/api/projects`                       | List my projects                |
| POST   | `/api/projects`                       | Create project                  |
| GET    | `/api/projects/:id`                   | Get project with tasks/members  |
| DELETE | `/api/projects/:id`                   | Delete project                  |
| POST   | `/api/projects/:id/members`           | Add member by email             |
| DELETE | `/api/projects/:id/members/:memberId` | Remove member                   |
| POST   | `/api/tasks`                          | Create task                     |
| PATCH  | `/api/tasks/:id`                      | Update task                     |
| DELETE | `/api/tasks/:id`                      | Delete task                     |
| GET    | `/api/dashboard`                      | Dashboard stats + my tasks      |

## Database Schema

```
User (id, email, name, passwordHash, role, avatar)
  ├── ownedProjects → Project
  ├── memberships → ProjectMember
  ├── assignedTasks → Task
  └── createdTasks → Task

Project (id, name, description, color, ownerId)
  ├── members → ProjectMember
  └── tasks → Task

ProjectMember (id, projectId, userId, role)
  └── unique(projectId, userId)

Task (id, title, description, status, priority, dueDate, projectId, assigneeId, createdById)
```

## Role Model

- **Global ADMIN** — First user to sign up. Full access to all projects.
- **Global MEMBER** — Can only see projects they own or are invited to.
- **Project ADMIN** — Can manage members, create/edit/delete all tasks in the project.
- **Project MEMBER** — Can create tasks, update status on tasks assigned to them.

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL (or a free cloud instance from [Neon](https://neon.tech), [Supabase](https://supabase.com), or Railway)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd akash

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
JWT_SECRET="generate-a-long-random-string"
PORT=4000
FRONTEND_URL="http://localhost:5173"
```

### 3. Push database schema

```bash
cd backend
npx prisma db push
```

### 4. Start development servers

Terminal 1 (backend):
```bash
cd backend
npm run dev
```

Terminal 2 (frontend):
```bash
cd frontend
npm i
npm run dev
```

Open http://localhost:5173. The first account you create becomes the global admin.

## Deploy to Railway

### Option A: Monorepo (recommended)

1. Push to GitHub
2. Create a Railway project → Deploy from GitHub
3. Add a PostgreSQL database service
4. Create two services from the same repo:
   - **Backend service:** Root directory = `backend`, Start command = `npm run build && npm start`
   - **Frontend service:** Root directory = `frontend`, Build command = `npm run build`, Static output = `dist`
5. Set environment variables on the backend service:
   - `DATABASE_URL` → reference Postgres: `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET` → random string
   - `FRONTEND_URL` → your frontend Railway domain
6. Update `frontend/src/lib/api.ts` baseURL to point to your backend Railway domain for production

### Option B: Combined (single service)

Serve the frontend build from Express by adding static file serving in production. See Railway docs for details.

## Screenshots

_Add screenshots of your app here_

## License

MIT
