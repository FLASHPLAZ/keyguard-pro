import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download as DownloadIcon, KeyRound, Mail, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Download() {
  const [step, setStep] = useState<"email" | "key" | "ready">("email");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ application: string; download_url: string } | null>(null);

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email");
      return;
    }
    setEmail(trimmed);
    setStep("key");
  };

  const submitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email, license_key: licenseKey.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error((data as any)?.error || `Download check failed (${response.status})`);
      if ((data as any)?.error) throw new Error((data as any).error);
      const payload = data as { application: string; download_url: string };
      setResult(payload);
      setStep("ready");
    } catch (err) {
      toast.error((err as Error).message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("email");
    setEmail("");
    setLicenseKey("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--primary-glow)/0.12),transparent_50%)] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
              <DownloadIcon className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Customer Download Portal</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Verify your license and get your download link.
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={submitEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                  <Mail className="mr-1 inline h-3 w-3" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-secondary/50 border-border"
                  required
                />
                <p className="text-xs text-muted-foreground">Use the email you used when you bought the license.</p>
              </div>
              <Button type="submit" className="btn-glow w-full">Continue</Button>
            </form>
          )}

          {step === "key" && (
            <form onSubmit={submitKey} className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                Signed in as <span className="text-foreground font-medium">{email}</span>
                <button type="button" onClick={reset} className="ml-2 text-primary hover:underline">change</button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key" className="text-xs uppercase tracking-wider text-muted-foreground">
                  <KeyRound className="mr-1 inline h-3 w-3" /> License Key
                </Label>
                <Input
                  id="key"
                  autoFocus
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"
                  className="bg-secondary/50 border-border font-mono text-sm"
                  required
                />
              </div>
              <Button type="submit" className="btn-glow w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Get Download"}
              </Button>
            </form>
          )}

          {step === "ready" && result && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">License verified</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{result.application}</p>
              </div>
              <a href={result.download_url} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="btn-glow w-full">
                  <DownloadIcon className="mr-2 h-4 w-4" /> Download Now
                </Button>
              </a>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
                Verify another license
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by end-to-end license validation. Keys are single-use per customer.
        </p>
      </div>
    </div>
  );
}
