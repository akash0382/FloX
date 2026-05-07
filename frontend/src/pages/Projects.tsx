import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { FolderKanban, Plus, Users, X, AlertTriangle, Loader2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  owner: { id: string; name: string };
  _count: { tasks: number; members: number };
  updatedAt: string;
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  function load() {
    setError("");
    api.get("/projects")
      .then(({ data }) => setProjects(data.projects))
      .catch((err) => setError(err.response?.data?.error || "Failed to load projects"))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-gray-500">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm text-red-400">{error}</p>
        <button onClick={() => { setLoading(true); load(); }} className="btn-outline mt-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">{projects.length} project{projects.length !== 1 && "s"}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" /> New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass flex flex-col items-center py-16 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <FolderKanban className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-white">No projects yet</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">Create your first project to start organizing tasks and collaborating with your team.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-6">
            <Plus className="h-4 w-4" /> Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="glass-hover p-5 block group">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110" style={{ background: `${p.color}15` }}>
                  <FolderKanban className="h-5 w-5" style={{ color: p.color }} />
                </div>
                <span className="text-xs text-gray-600">{new Date(p.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
              <h3 className="mt-4 font-semibold text-white group-hover:text-accent transition-colors">{p.name}</h3>
              {p.description && <p className="mt-1 line-clamp-2 text-sm text-gray-400">{p.description}</p>}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p._count.members} member{p._count.members !== 1 && "s"}</span>
                <span>{p._count.tasks} task{p._count.tasks !== 1 && "s"}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-dark-700 overflow-hidden">
                  <div className="h-full rounded-full bg-accent/60" style={{ width: "0%" }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#06b6d4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required"); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/projects", { name: name.trim(), description: description.trim() || null, color });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  const colors = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#3b82f6", "#f97316"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md p-6 animate-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New project</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Project name <span className="text-red-400">*</span></label>
            <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Website Redesign" maxLength={120} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="What's this project about?" maxLength={2000} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`h-8 w-8 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-dark-700 scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
