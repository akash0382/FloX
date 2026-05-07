import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Plus, Trash2, UserPlus, X, AlertTriangle, Loader2, MessageCircle, Send, Tag, Pencil, Paperclip } from "lucide-react";

type Member = { id: string; role: string; user: { id: string; name: string; email: string; avatar?: string | null } };
type Comment = { id: string; content: string; createdAt: string; author: { id: string; name: string; avatar?: string | null } };
type TaskAttachment = { id: string; fileName: string; fileUrl: string; mimeType?: string | null; size?: number | null };
type Task = { id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null; labels: string[]; assigneeId: string | null; assignee: { id: string; name: string } | null; createdBy: { id: string; name: string }; createdById: string; attachments: TaskAttachment[] };
type Project = { id: string; name: string; description: string | null; color: string; ownerId: string; owner: { id: string; name: string }; members: Member[]; tasks: Task[] };

const COLUMNS = [
  { key: "TODO", label: "To do", dot: "bg-gray-400" },
  { key: "IN_PROGRESS", label: "In progress", dot: "bg-amber-400" },
  { key: "IN_REVIEW", label: "In review", dot: "bg-purple-400" },
  { key: "DONE", label: "Completed", dot: "bg-green-400" },
];

const LABEL_COLORS: Record<string, string> = {
  bug: "bg-red-500/15 text-red-400", feature: "bg-green-500/15 text-green-400",
  design: "bg-pink-500/15 text-pink-400", frontend: "bg-blue-500/15 text-blue-400",
  backend: "bg-orange-500/15 text-orange-400", ui: "bg-purple-500/15 text-purple-400",
  testing: "bg-yellow-500/15 text-yellow-400", devops: "bg-cyan-500/15 text-cyan-400",
  performance: "bg-emerald-500/15 text-emerald-400", seo: "bg-indigo-500/15 text-indigo-400",
  auth: "bg-rose-500/15 text-rose-400", payment: "bg-amber-500/15 text-amber-400",
  analytics: "bg-violet-500/15 text-violet-400", release: "bg-teal-500/15 text-teal-400",
  setup: "bg-slate-500/15 text-slate-400",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [myRole, setMyRole] = useState("MEMBER");
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState<{ open: boolean; defaultStatus?: string }>({ open: false });
  const [memberModal, setMemberModal] = useState(false);
  const [commentModal, setCommentModal] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "overdue">("all");

  function load() {
    api.get(`/projects/${id}`).then(({ data }) => {
      setProject(data.project);
      setMyRole(data.myRole);
    }).catch(() => navigate("/projects")).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  if (loading || !project) return <div className="flex flex-col items-center justify-center py-20 gap-3"><Loader2 className="h-8 w-8 animate-spin text-accent" /><p className="text-sm text-gray-500">Loading project...</p></div>;

  const now = Date.now();
  const filteredTasks = project.tasks.filter((t) => {
    if (filter === "mine") return t.assigneeId === user?.id;
    if (filter === "overdue") return t.dueDate && t.status !== "DONE" && new Date(t.dueDate).getTime() < now;
    return true;
  });

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const overdueCount = project.tasks.filter((t) => t.dueDate && t.status !== "DONE" && new Date(t.dueDate).getTime() < now).length;
  const isAdmin = myRole === "ADMIN";

  async function deleteProject() {
    if (!confirm(`Delete "${project!.name}"? All tasks will be removed.`)) return;
    await api.delete(`/projects/${id}`);
    navigate("/projects");
  }

  async function updateTaskStatus(taskId: string, status: string) {
    await api.patch(`/tasks/${taskId}`, { status });
    load();
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    await api.delete(`/tasks/${taskId}`);
    load();
  }

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ background: project.color }} />
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          </div>
          {project.description && <p className="mt-1 text-sm text-gray-400">{project.description}</p>}
          <p className="mt-2 text-xs text-gray-600">Owner: {project.owner.name} · Role: <span className="text-accent">{myRole}</span></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setTaskModal({ open: true })} className="btn-primary"><Plus className="h-4 w-4" /> Add task</button>
          {isAdmin && <button onClick={() => setMemberModal(true)} className="btn-outline"><UserPlus className="h-4 w-4" /></button>}
          {project.ownerId === user?.id && <button onClick={deleteProject} className="btn-danger"><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="glass p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Progress</span>
            <span className="text-xs font-semibold text-accent">{progress}% · {doneTasks}/{totalTasks} done</span>
          </div>
          <div className="h-2 w-full rounded-full bg-dark-700 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-accent-dark to-accent transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "mine", "overdue"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${filter === f ? (f === "overdue" ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-accent/40 bg-accent/10 text-accent") : "border-white/10 text-gray-500 hover:text-white"}`}>
            {f === "all" ? `All (${totalTasks})` : f === "mine" ? `Mine (${project.tasks.filter((t) => t.assigneeId === user?.id).length})` : `Overdue (${overdueCount})`}
          </button>
        ))}
      </div>

      {/* Kanban */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="rounded-xl bg-dark-800/50 border border-white/5 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  {col.label}
                  <span className="ml-1 text-xs text-gray-600">{colTasks.length}</span>
                </h3>
                <button onClick={() => setTaskModal({ open: true, defaultStatus: col.key })} className="rounded p-1 text-gray-600 hover:text-accent hover:bg-white/5"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <button onClick={() => setTaskModal({ open: true, defaultStatus: col.key })} className="w-full rounded-lg border border-dashed border-white/10 py-6 text-xs text-gray-600 hover:border-accent/30 hover:text-accent transition-colors">+ Add task</button>
                ) : colTasks.map((t) => {
                  const overdue = t.dueDate && t.status !== "DONE" && new Date(t.dueDate).getTime() < now;
                  return (
                    <div key={t.id} className="glass-hover p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-white">{t.title}</h4>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setCommentModal({ open: true, task: t })} className="rounded p-1 text-gray-600 hover:text-accent" title="Comments"><MessageCircle className="h-3 w-3" /></button>
                          <button onClick={() => setEditTask(t)} className="rounded p-1 text-gray-600 hover:text-blue-400" title="Edit"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => deleteTask(t.id)} className="rounded p-1 text-gray-600 hover:text-red-400" title="Delete"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      {t.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{t.description}</p>}
                      {t.labels && t.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.labels.map((l) => (
                            <span key={l} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${LABEL_COLORS[l] || "bg-white/5 text-gray-400"}`}>
                              <Tag className="h-2 w-2" />{l}
                            </span>
                          ))}
                        </div>
                      )}
                      {t.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.attachments.map((a) => (
                            <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-300 hover:bg-white/10">
                              <Paperclip className="h-2.5 w-2.5" />
                              {a.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <PriorityBadge priority={t.priority} />
                        {t.dueDate && <span className={`badge text-[10px] ${overdue ? "bg-red-500/10 text-red-400" : "bg-white/5 text-gray-500"}`}>{new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                        {overdue && <AlertTriangle className="h-3 w-3 text-red-400" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-600">{t.assignee?.name || "Unassigned"}</span>
                        <select value={t.status} onChange={(e) => updateTaskStatus(t.id, e.target.value)} className="rounded border border-white/10 bg-dark-800 px-1.5 py-0.5 text-[10px] text-gray-400 outline-none focus:border-accent/50">
                          {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Team */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Team ({project.members.length})</h3>
          {isAdmin && <button onClick={() => setMemberModal(true)} className="text-xs text-accent hover:text-accent-light"><UserPlus className="h-3.5 w-3.5 inline mr-1" />Add</button>}
        </div>
        <div className="flex flex-wrap gap-3">
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">{m.user.name.charAt(0)}</div>
              <div>
                <p className="text-xs font-medium text-white">{m.user.name}</p>
                <p className="text-[10px] text-gray-600">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {taskModal.open && <TaskModal projectId={project.id} members={project.members} defaultStatus={taskModal.defaultStatus} onClose={() => setTaskModal({ open: false })} onCreated={load} />}
      {editTask && <TaskModal projectId={project.id} members={project.members} task={editTask} onClose={() => setEditTask(null)} onCreated={() => { setEditTask(null); load(); }} />}
      {memberModal && <AddMemberModal projectId={project.id} onClose={() => setMemberModal(false)} onAdded={load} />}
      {commentModal.open && commentModal.task && <CommentModal task={commentModal.task} onClose={() => setCommentModal({ open: false })} />}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { LOW: "bg-gray-500/10 text-gray-400", MEDIUM: "bg-blue-500/10 text-blue-400", HIGH: "bg-orange-500/10 text-orange-400", URGENT: "bg-red-500/10 text-red-400" };
  return <span className={`badge text-[10px] ${map[priority] || map.MEDIUM}`}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</span>;
}

function CommentModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/comments/task/${task.id}`).then(({ data }) => setComments(data.comments)).finally(() => setLoading(false));
  }, [task.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post("/comments", { content: content.trim(), taskId: task.id });
      setComments([data.comment, ...comments]);
      setContent("");
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md p-5 animate-in flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Comments</h2>
            <p className="text-xs text-gray-500 truncate">{task.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input value={content} onChange={(e) => setContent(e.target.value)} className="input flex-1" placeholder="Write a comment..." maxLength={2000} />
          <button type="submit" disabled={sending || !content.trim()} className="btn-primary px-3">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-6">No comments yet. Be the first!</p>
          ) : comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-white/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">{c.author.name.charAt(0)}</div>
                <span className="text-xs font-medium text-white">{c.author.name}</span>
                <span className="text-[10px] text-gray-600">{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="text-sm text-gray-300 pl-7">{c.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ projectId, members, defaultStatus, task, onClose, onCreated }: { projectId: string; members: Member[]; defaultStatus?: string; task?: Task; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || defaultStatus || "TODO");
  const [priority, setPriority] = useState(task?.priority || "MEDIUM");
  const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || "");
  const [labels, setLabels] = useState(task?.labels?.join(", ") || "");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addFiles(inputFiles: FileList | null) {
    if (!inputFiles) return;
    setFiles((prev) => [...prev, ...Array.from(inputFiles)]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    setLoading(true);
    const labelArr = labels.split(",").map((l) => l.trim().toLowerCase()).filter(Boolean);
    try {
      let taskId = task?.id;
      if (task) {
        await api.patch(`/tasks/${task.id}`, { title: title.trim(), description: description.trim() || null, status, priority, dueDate: dueDate ? new Date(dueDate).toISOString() : null, assigneeId: assigneeId || null, labels: labelArr });
      } else {
        const { data } = await api.post("/tasks", { title: title.trim(), description: description.trim() || null, status, priority, dueDate: dueDate ? new Date(dueDate).toISOString() : null, assigneeId: assigneeId || null, labels: labelArr, projectId });
        taskId = data.task.id;
      }
      if (taskId && files.length > 0) {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));
        await api.post(`/tasks/${taskId}/attachments`, form);
      }
      onCreated();
      onClose();
    } catch (err: any) { setError(err.response?.data?.error || "Failed"); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-lg p-6 animate-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{task ? "Edit task" : "New task"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Title <span className="text-red-400">*</span></label>
            <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="What needs to be done?" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="Add details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                <option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="IN_REVIEW">In review</option><option value="DONE">Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input">
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input [color-scheme:dark]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Assignee</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Labels <span className="text-gray-600">(comma separated)</span></label>
            <input value={labels} onChange={(e) => setLabels(e.target.value)} className="input" placeholder="e.g. bug, frontend, urgent" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Attachments</label>
            <label
              className="block cursor-pointer rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-4 text-center text-xs text-gray-400 hover:border-accent/40 hover:text-accent"
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              onDragOver={(e) => e.preventDefault()}
            >
              Drag & drop files here, or click to select
              <input type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-xs text-gray-300">
                    <span className="truncate">{f.name}</span>
                    <button type="button" className="text-gray-500 hover:text-red-400" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : task ? "Save task" : "Create task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdded }: { projectId: string; onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email, role });
      onAdded(); onClose();
    } catch (err: any) { setError(err.response?.data?.error || "Failed"); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm p-6 animate-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add member</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="member@example.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="MEMBER">Member</option><option value="ADMIN">Admin</option>
            </select>
          </div>
          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : "Add member"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
