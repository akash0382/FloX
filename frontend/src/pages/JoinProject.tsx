import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Zap, Users, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function JoinProject() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/invites/${code}`)
      .then(({ data }) => setInvite(data.invite))
      .catch((err) => setError(err.response?.data?.error || "Invalid invite link"))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleJoin() {
    if (!user) { navigate(`/login?redirect=/join/${code}`); return; }
    setJoining(true);
    try {
      const { data } = await api.post(`/invites/${code}/accept`);
      setSuccess(true);
      setTimeout(() => navigate(`/projects/${data.projectId}`), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-dark to-accent shadow-glow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">FloX</span>
        </div>

        <div className="glass p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-gray-400">Loading invite...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <Link to="/login" className="btn-outline mt-2 text-xs">Go to login</Link>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <p className="text-sm text-green-400">You've joined the project!</p>
              <p className="text-xs text-gray-500">Redirecting...</p>
            </div>
          ) : invite ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${invite.project.color}20` }}>
                <Users className="h-7 w-7" style={{ color: invite.project.color }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">You're invited!</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Join <span className="font-medium text-white">{invite.project.name}</span> as {invite.role}
                </p>
                <p className="mt-1 text-xs text-gray-600">{invite.project._count.members} member{invite.project._count.members !== 1 && "s"} already</p>
              </div>
              <button onClick={handleJoin} disabled={joining} className="btn-primary w-full mt-2">
                {joining ? <><Loader2 className="h-4 w-4 animate-spin" /> Joining...</> : "Accept & Join"}
              </button>
              {!user && <p className="text-xs text-gray-500">You'll need to sign in first</p>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
