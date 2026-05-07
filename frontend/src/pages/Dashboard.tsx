import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FolderKanban, ListTodo, Loader2, CheckCircle2, AlertTriangle, Clock, TrendingUp, ArrowRight, CalendarClock } from "lucide-react";

type Stats = {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  overdue: number;
  totalProjects: number;
  totalTasks: number;
};

type MyTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  project: { id: string; name: string; color: string };
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard")
      .then(({ data }) => {
        setStats(data.stats);
        setMyTasks(data.myTasks);
      })
      .catch((err) => setError(err.response?.data?.error || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm text-red-400">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-outline mt-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here's what's happening across your projects.</p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          <StatCard icon={<FolderKanban />} label="Projects" value={stats.totalProjects} color="cyan" />
          <StatCard icon={<TrendingUp />} label="Total tasks" value={stats.totalTasks} color="blue" />
          <StatCard icon={<ListTodo />} label="To do" value={stats.todo} color="gray" />
          <StatCard icon={<Loader2 />} label="In progress" value={stats.inProgress} color="amber" />
          <StatCard icon={<Clock />} label="In review" value={stats.inReview} color="purple" />
          <StatCard icon={<CheckCircle2 />} label="Completed" value={stats.done} color="green" />
          <StatCard icon={<AlertTriangle />} label="Overdue" value={stats.overdue} color="red" highlight={stats.overdue > 0} />
        </div>
      )}

      {/* Progress bar */}
      {stats && stats.totalTasks > 0 && (
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Overall completion</span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((stats.done / stats.totalTasks) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-dark-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-dark to-accent transition-all duration-500"
              style={{ width: `${(stats.done / stats.totalTasks) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span>{stats.done} completed</span>
            <span>{stats.totalTasks - stats.done} remaining</span>
          </div>
        </div>
      )}

      {/* My tasks */}
      <div className="glass">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-white">My assigned tasks</h2>
          </div>
          <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-light transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {myTasks.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-300">You're all caught up!</p>
            <p className="mt-1 text-xs text-gray-500">No tasks assigned to you yet. Join a project to get started.</p>
            <Link to="/projects" className="btn-primary mt-5 text-xs px-4 py-2">Browse projects</Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {myTasks.map((t) => {
              const overdue = t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < new Date();
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0 flex-1">
                    <Link to={`/projects/${t.projectId}`} className="block truncate text-sm font-medium text-white hover:text-accent transition-colors">
                      {t.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: t.project.color }} />
                      <span className="truncate">{t.project.name}</span>
                      {t.dueDate && (
                        <span className={overdue ? "text-red-400 font-medium" : ""}>
                          · {overdue ? "Overdue" : `Due ${new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityDot priority={t.priority} />
                    <StatusPill status={t.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, highlight }: { icon: React.ReactNode; label: string; value: number; color: string; highlight?: boolean }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-400 bg-cyan-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    gray: "text-gray-400 bg-gray-400/10",
    amber: "text-amber-400 bg-amber-400/10",
    purple: "text-purple-400 bg-purple-400/10",
    green: "text-green-400 bg-green-400/10",
    red: "text-red-400 bg-red-400/10",
  };
  return (
    <div className={`glass-hover p-4 ${highlight ? "border-red-500/30 animate-pulse" : ""}`}>
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${colors[color]}`}>
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    TODO: { label: "To do", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
    IN_PROGRESS: { label: "In progress", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    IN_REVIEW: { label: "In review", cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    DONE: { label: "Completed", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
  };
  const s = map[status] || map.TODO;
  return <span className={`badge border ${s.cls}`}>{s.label}</span>;
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { LOW: "bg-gray-400", MEDIUM: "bg-blue-400", HIGH: "bg-orange-400", URGENT: "bg-red-500 animate-pulse" };
  return (
    <span className={`h-2 w-2 rounded-full ${colors[priority] || colors.MEDIUM}`} title={priority} />
  );
}
