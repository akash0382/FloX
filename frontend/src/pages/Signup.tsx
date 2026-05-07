import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Zap, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nameError = touched.name && name.trim().length < 1 ? "Name is required" : "";
  const emailError = touched.email && !email.includes("@") ? "Enter a valid email" : "";
  const passwordError = touched.password && password.length < 6 ? "At least 6 characters" : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.includes("@") || password.length < 6) {
      setTouched({ name: true, email: true, password: true });
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-dark to-accent shadow-glow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">FloX</span>
        </div>
        <div className="glass p-8">
          <h1 className="text-xl font-semibold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-gray-400">The first account becomes the workspace admin</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                className={`input ${nameError ? "border-red-500/50" : ""}`}
                placeholder="Enter your full name"
                autoComplete="name"
              />
              {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                className={`input ${emailError ? "border-red-500/50" : ""}`}
                placeholder="Enter your email address"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  className={`input pr-10 ${passwordError ? "border-red-500/50" : ""}`}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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
              {password.length > 0 && !passwordError && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${password.length >= i * 3 ? (password.length >= 10 ? "bg-green-400" : "bg-amber-400") : "bg-dark-600"}`} />
                  ))}
                </div>
              )}
            </div>
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : "Create account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:text-accent-light font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
