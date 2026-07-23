import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, UserPlus } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { notifyDiscord } from "@/lib/discord-notify";
import { getClientMeta } from "@/lib/client-meta";
import { BrandLogo } from "@/components/BrandLogo";

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const value = error as { message?: unknown; error_description?: unknown; error?: unknown; details?: unknown };
    for (const item of [value.message, value.error_description, value.error, value.details]) {
      if (typeof item === "string" && item.trim()) return item;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // ignore serialization errors
    }
  }
  return fallback;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function Signup() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [inlineStatus, setInlineStatus] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user && role) {
      const dest =
        role === "admin" ? "/admin" :
        role === "manager" ? "/manager" :
        role === "reseller" ? "/reseller" :
        "/dashboard";
      navigate(dest, { replace: true });
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const rawUsername = username.trim();
    const cleanUsername = (rawUsername.includes("@") ? cleanEmail.split("@")[0] : rawUsername || cleanEmail.split("@")[0])
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);

    setInlineError("");
    setInlineStatus("");

    if (cleanUsername.length < 3) {
      const message = "Username must be at least 3 characters";
      setInlineError(message);
      toast.error(message);
      return;
    }
    if (!isEmail(cleanEmail)) {
      const message = "Enter a valid email address";
      setInlineError(message);
      toast.error(message);
      return;
    }
    if (password.length < 8) {
      const message = "Password must be at least 8 characters";
      setInlineError(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    setInlineStatus("Creating your workspace...");
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { username: cleanUsername },
          },
        }),
        15000,
        "Signup request timed out. Please check your connection and try again.",
      );
      if (error) throw error;
      if (data.session) {
        setInlineStatus("Finishing workspace setup...");
        const { error: bootstrapError } = await (supabase as any).rpc("ensure_user_bootstrap");
        if (bootstrapError) console.error("Signup bootstrap failed", bootstrapError);
      }
      setDone(true);
      toast.success("Account created! Check your email to verify.");
      try {
        const meta = await getClientMeta();
        notifyDiscord("New user signup", {
          Username: cleanUsername,
          Email: cleanEmail,
          IP: meta.ip,
          Country: meta.country,
        });
      } catch { /* best-effort */ }
    } catch (err) {
      const message = getAuthErrorMessage(err, "Sign up failed. Please try again or contact support.");
      setInlineError(message);
      toast.error(message);
    } finally {
      setInlineStatus("");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -left-20 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.07] blur-[100px] animate-pulse" />
        <div className="absolute -right-20 bottom-1/4 h-[400px] w-[400px] rounded-full bg-primary/[0.05] blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div
        className={`relative z-10 w-full max-w-[440px] transition-all duration-700 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-5">
            <div className="absolute -inset-3 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
            <BrandLogo size="lg" showText={false} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create your workspace</h1>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            <span>Free during beta - no credit card</span>
          </div>
        </div>

        <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl shadow-background/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="p-6 sm:p-8">
            {done ? (
              <div className="flex flex-col items-center text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <h2 className="text-lg font-semibold mb-2">Check your inbox</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  We sent a verification link to <span className="text-foreground font-medium">{email}</span>.
                  Click it to activate your workspace.
                </p>
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Go to sign in
                </Link>
              </div>
            ) : (
              <>
                <h2 className="mb-1 text-center text-lg font-semibold text-foreground">Get started in 30 seconds</h2>
                <p className="mb-6 text-center text-sm text-muted-foreground">Your own license & auth backend</p>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Username</label>
                    <Input
                      type="text"
                      placeholder="yourname"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={32}
                      className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50"
                    />
                    <p className="text-[11px] text-muted-foreground/70">Use a simple display name. If left blank, we use your email name.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email address</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="h-11 bg-secondary/50 border-border/50 pr-10 focus:border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Create workspace
                      </>
                    )}
                  </Button>
                  {inlineStatus && !inlineError && (
                    <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                      {inlineStatus}
                    </div>
                  )}
                  {inlineError && (
                    <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{inlineError}</span>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground/60">
          <Link to="/" className="hover:text-foreground transition-colors">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
