import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Zap, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const emailError = touched.email && !email.includes("@") ? "Enter a valid email" : "";
  const passwordError = touched.password && password.length < 1 ? "Password is required" : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@") || !password) {
      setTouched({ email: true, password: true });
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-dark to-accent shadow-glow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">FloX</span>
        </div>
        <div className="glass p-8">
          <h1 className="text-xl font-semibold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-400">Sign in to continue to your workspace</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                className={`input ${emailError ? "border-red-500/50 focus:border-red-500" : ""}`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  className={`input pr-10 ${passwordError ? "border-red-500/50 focus:border-red-500" : ""}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
            </div>
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-accent hover:text-accent-light font-medium transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
