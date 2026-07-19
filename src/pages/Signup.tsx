import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { notifyDiscord } from "@/lib/discord-notify";
import { getClientMeta } from "@/lib/client-meta";
import { BrandLogo } from "@/components/BrandLogo";

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
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { username: username.trim() },
        },
      });
      if (error) throw error;
      setDone(true);
      toast.success("Account created! Check your email to verify.");
      try {
        const meta = await getClientMeta();
        notifyDiscord("New user signup", {
          Username: username.trim(),
          Email: email.trim(),
          IP: meta.ip,
          Country: meta.country,
        });
      } catch { /* best-effort */ }
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
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
            <span>Free during beta — no credit card</span>
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

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Username</label>
                    <Input
                      type="text"
                      placeholder="yourname"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={32}
                      className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50"
                    />
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
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Create workspace
                      </>
                    )}
                  </Button>
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
          <Link to="/" className="hover:text-foreground transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
