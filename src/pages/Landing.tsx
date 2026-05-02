import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Key, Shield, Webhook, Users, MessageSquare, Database, Zap, Globe,
  ArrowRight, Sparkles, CheckCircle2, Code2, Lock, Activity, Rocket,
  Terminal, Eye, BarChart3, Clock, Star, Github,
} from "lucide-react";
import { useState, useEffect } from "react";

const FEATURES = [
  { icon: Key, title: "License Keys", desc: "Generate, validate, ban, and revoke with HWID binding, expiration, and metadata." },
  { icon: Users, title: "App Users", desc: "End-users authenticate from your software with username/password sessions and tiers." },
  { icon: Database, title: "Variables API", desc: "Store runtime secrets your app fetches — gated by license validity and tier." },
  { icon: Webhook, title: "Webhooks", desc: "Real-time POST notifications for every login, ban, HWID reset. Discord & custom URLs." },
  { icon: Shield, title: "Anti-Sharing", desc: "Auto-ban accounts shared across too many IPs. HMAC request signing prevents replay." },
  { icon: Activity, title: "Live Analytics", desc: "Real-time dashboard: validation trends, country heatmap, active sessions, hourly charts." },
  { icon: Globe, title: "Resellers", desc: "Delegate license generation with credit-based limits, per-app permissions, and tracking." },
  { icon: Terminal, title: "Bot Integration", desc: "Discord slash commands, heartbeat enforcement, and bot API keys out of the box." },
];

const COMPARISONS = [
  { feature: "HWID Binding", us: true, them: true },
  { feature: "Multi-tenant SaaS", us: true, them: false },
  { feature: "Reseller System", us: true, them: true },
  { feature: "Anti-Sharing (IP)", us: true, them: false },
  { feature: "Request Signing", us: true, them: false },
  { feature: "Discord Bot API", us: true, them: false },
  { feature: "Real-time Dashboard", us: true, them: false },
  { feature: "Free Tier", us: true, them: false },
];

const STEPS = [
  { n: "1", title: "Create your workspace", desc: "Sign up free in 30 seconds. No credit card." },
  { n: "2", title: "Add an application", desc: "Get an App ID, signing secret, and an API endpoint instantly." },
  { n: "3", title: "Drop in the snippet", desc: "Copy-paste code for Python, C#, Node.js, C++, Go, Rust, or Java." },
];

const STATS = [
  { label: "Uptime", value: "99.9%" },
  { label: "API Latency", value: "<50ms" },
  { label: "Languages", value: "7+" },
  { label: "Setup Time", value: "30s" },
];

const SAMPLE_PY = `import requests, hashlib, uuid

r = requests.post("https://license.galacticboosts.online/api/validate", json={
    "license_key": "GALACTIC-XXXX-XXXX-XXXX-XXXX",
    "application_id": "your-app-id",
    "hwid": hashlib.sha256(str(uuid.getnode()).encode()).hexdigest(),
})

data = r.json()
if data["valid"]:
    print(f"\u2705 Welcome — license expires {data['expires_readable']}")
else:
    print(f"\u274c {data['error']}")`;

function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  return <span>{target}{suffix}</span>;
}

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -left-32 top-32 h-[600px] w-[600px] rounded-full bg-primary/[0.08] blur-[120px]" style={{ transform: `translateY(${scrollY * 0.05}px)` }} />
        <div className="absolute -right-32 top-[600px] h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-[100px]" style={{ transform: `translateY(${scrollY * -0.03}px)` }} />
        <div className="absolute left-1/2 top-[1200px] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-[80px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-20 border-b border-border/40 backdrop-blur-xl bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-lg bg-primary/20 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <Key className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight">Galactic Boosts</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
            <a href="#code" className="hover:text-foreground transition-colors">Integration</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-primary/90">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-4 sm:px-6 pt-16 pb-12 md:pt-28 md:pb-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/40 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Free during beta — no credit card required
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            The license system
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              your software deserves
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
            Generate license keys, bind to hardware, gate features behind tiers, and protect your bots &amp; tools from sharing — all with one API call. Self-serve, multi-tenant, and free.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-7 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-xl shadow-primary/25">
                <Rocket className="h-4 w-4" /> Start for free
              </Button>
            </Link>
            <a href="#code">
              <Button size="lg" variant="outline" className="h-12 px-7 gap-2 border-border/60">
                <Code2 className="h-4 w-4" /> View the API
              </Button>
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No credit card</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> 7+ languages</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> HWID + Anti-sharing</div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center rounded-xl border border-border/40 bg-card/30 backdrop-blur py-5 px-4">
                <span className="text-2xl sm:text-3xl font-bold text-primary font-mono">{s.value}</span>
                <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground mb-4">
              <Zap className="h-3 w-3 text-primary" /> Everything you need
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">A complete auth backend</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Stop building licensing logic from scratch. Galactic Boosts ships every primitive you need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur transition-all duration-300 hover:border-primary/40 hover:bg-card/70 hover:-translate-y-0.5"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section id="compare" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground mb-4">
              <Eye className="h-3 w-3 text-primary" /> See the difference
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why switch to Galactic Boosts?</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              More features, better security, zero cost during beta.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-primary">Galactic Boosts</th>
                  <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Others</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((c, i) => (
                  <tr key={c.feature} className={`border-b border-border/30 ${i % 2 === 0 ? "bg-secondary/10" : ""}`}>
                    <td className="px-5 py-3 text-foreground/90">{c.feature}</td>
                    <td className="px-5 py-3 text-center">
                      {c.us ? <CheckCircle2 className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {c.them ? <CheckCircle2 className="h-4 w-4 text-muted-foreground/50 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Up and running in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur">
                <div className="absolute -top-3 -left-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
                  {s.n}
                </div>
                <h3 className="mt-2 mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code preview */}
      <section id="code" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">One drop-in API call</h2>
            <p className="mt-3 text-muted-foreground">Validate licenses, bind HWIDs, and detect sharing in a single request.</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur overflow-hidden shadow-2xl shadow-background/50">
            <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-xs text-muted-foreground">validate.py</span>
              </div>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <pre className="overflow-x-auto p-5 text-xs sm:text-sm leading-relaxed">
              <code className="text-foreground/90">{SAMPLE_PY}</code>
            </pre>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Also supports{" "}
            <span className="text-foreground/80">C#, Node.js, C++, Go, Java, Rust</span>{" "}
            — full code in your dashboard after signup.
          </p>
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-card/80 to-primary/5 p-8 sm:p-12 backdrop-blur-xl shadow-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-5">
              <Sparkles className="h-3 w-3" /> Beta pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Free for everyone</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              While we're in beta, every feature is free. No credit card, no usage caps, no surprises.
            </p>
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25">
                Create your workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} Galactic Boosts</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}