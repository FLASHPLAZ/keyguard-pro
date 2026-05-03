import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Key, Shield, Webhook, Users, Database, Zap, Globe,
  ArrowRight, Sparkles, CheckCircle2, Code2, Lock, Activity, Rocket,
  Terminal, Eye, Star, ChevronDown, ChevronUp,
  Cpu, Gauge, Server, MonitorSmartphone,
} from "lucide-react";
import { useState, useEffect } from "react";

const FEATURES = [
  { icon: Key, title: "License Keys", desc: "Generate, validate, ban, and revoke with HWID binding, expiration, and metadata.", color: "from-purple-500 to-violet-600" },
  { icon: Users, title: "App Users", desc: "End-users authenticate from your software with username/password sessions and tiers.", color: "from-blue-500 to-indigo-600" },
  { icon: Database, title: "Variables API", desc: "Store runtime secrets your app fetches — gated by license validity and tier.", color: "from-fuchsia-500 to-pink-600" },
  { icon: Webhook, title: "Webhooks", desc: "Real-time POST notifications for every login, ban, HWID reset. Discord & custom.", color: "from-violet-500 to-purple-600" },
  { icon: Shield, title: "Anti-Sharing", desc: "Auto-ban accounts shared across too many IPs. HMAC request signing prevents replay.", color: "from-indigo-500 to-blue-600" },
  { icon: Activity, title: "Live Analytics", desc: "Real-time dashboard: validation trends, country heatmap, active sessions.", color: "from-pink-500 to-rose-600" },
  { icon: Globe, title: "Resellers", desc: "Delegate license generation with credit-based limits, per-app permissions.", color: "from-purple-400 to-indigo-600" },
  { icon: Terminal, title: "Bot Integration", desc: "Discord slash commands, heartbeat enforcement, and bot API keys.", color: "from-violet-400 to-fuchsia-600" },
  { icon: Cpu, title: "Session Management", desc: "Control active user sessions, enforce limits, and manage concurrent access.", color: "from-blue-400 to-purple-600" },
  { icon: Lock, title: "Hash Checks", desc: "Validate file integrity with server-side hash verification for tamper detection.", color: "from-indigo-400 to-violet-600" },
  { icon: Server, title: "Global Infrastructure", desc: "Serverless edge network with <50ms latency across 300+ locations worldwide.", color: "from-purple-500 to-pink-600" },
  { icon: MonitorSmartphone, title: "Multi-Platform", desc: "SDKs for Python, C#, Node.js, C++, Go, Rust, and Java. Any platform.", color: "from-fuchsia-400 to-purple-600" },
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
  { feature: "App User Auth", us: true, them: true },
  { feature: "Variables API", us: true, them: true },
];

const TESTIMONIALS = [
  { name: "Alex R.", role: "Game Developer", stars: 5, text: "Switched from KeyAuth — the anti-sharing alone saved us thousands in lost revenue. Setup took 5 minutes." },
  { name: "Sarah M.", role: "SaaS Founder", stars: 5, text: "Extremely satisfied with both the product and support. The multi-tenant system is exactly what we needed." },
  { name: "DevKing", role: "Bot Developer", stars: 4, text: "Using 1 year — stable 99% uptime. The Discord bot integration is seamless and my users love the HWID system." },
  { name: "JCrick", role: "Tool Developer", stars: 5, text: "Docs complete, API clean, support responsive. Would recommend to anyone building licensed software." },
  { name: "NeoBytes", role: "Security Researcher", stars: 5, text: "The request signing and anti-tamper detection are top-notch. Finally a licensing system that takes security seriously." },
  { name: "Luna", role: "Indie Developer", stars: 4, text: "Free tier is incredibly generous. I'm running 3 apps with full features and haven't paid a cent yet." },
];

const FAQS = [
  { q: "How fast can I get started?", a: "Sign up takes 30 seconds. Create an application, grab your API key, and integrate with our copy-paste code snippets. Most developers are live in under 5 minutes." },
  { q: "Is there a free plan?", a: "Yes! Our free tier includes up to 3 applications, 50 license keys, and all core features including HWID binding and anti-sharing. No credit card required." },
  { q: "How does HWID binding work?", a: "Your application sends a hardware fingerprint with each validation request. We bind the license to that device on first use, preventing unauthorized sharing across multiple machines." },
  { q: "What programming languages are supported?", a: "We provide official SDKs and code examples for Python, C#, Node.js, C++, Go, Rust, and Java. Our REST API works with any language that can make HTTP requests." },
  { q: "Can I migrate from KeyAuth?", a: "Absolutely. Our API is designed to be a drop-in replacement. Most migrations take under an hour. We also offer migration guides and direct support." },
  { q: "Is my data secure?", a: "All requests use HMAC-SHA256 signing with replay protection. Data is encrypted at rest and in transit. Our infrastructure runs on enterprise-grade serverless edge nodes." },
];

const THREATS = [
  { title: "HWID Swap", desc: "User attempts to bypass device binding.", defense: "Validate HWID binding with small grace window. Require owner approval for new device or reset.", result: "Unauthorized device fails verification." },
  { title: "Key Leaked Publicly", desc: "Attacker shares a paid key online.", defense: "Anti-sharing detects multiple unique IPs. Auto-ban triggers when threshold is exceeded.", result: "Key automatically banned, owner notified." },
  { title: "Clock Spoof", desc: "System time manipulated to extend trials.", defense: "Server-side expiration check. Client clock is never trusted for license validation.", result: "Expired license correctly rejected." },
];

const SAMPLE_PY = `import requests, hashlib, uuid

r = requests.post("https://api.galacticboosts.com/api/validate", json={
    "license_key": "GALACTIC-XXXX-XXXX-XXXX-XXXX",
    "application_id": "your-app-id",
    "hwid": hashlib.sha256(
        str(uuid.getnode()).encode()
    ).hexdigest(),
})

data = r.json()
if data["valid"]:
    print(f"✅ Welcome — expires {data['expires_readable']}")
else:
    print(f"❌ {data['error']}")`;

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
        <div className="absolute -left-32 top-32 h-[600px] w-[600px] rounded-full bg-purple-600/[0.12] blur-[120px]" style={{ transform: `translateY(${scrollY * 0.05}px)` }} />
        <div className="absolute -right-32 top-[600px] h-[500px] w-[500px] rounded-full bg-violet-500/[0.08] blur-[100px]" style={{ transform: `translateY(${scrollY * -0.03}px)` }} />
        <div className="absolute left-1/2 top-[1200px] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-fuchsia-500/[0.06] blur-[80px]" />
        <div className="absolute right-1/4 top-[2000px] h-[500px] w-[500px] rounded-full bg-indigo-500/[0.06] blur-[100px]" />
        <div className="absolute -left-20 top-[3000px] h-[400px] w-[400px] rounded-full bg-purple-500/[0.05] blur-[80px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-20 border-b border-border/40 backdrop-blur-xl bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-lg bg-purple-500/30 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
                <Key className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">Galactic Boosts</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#threats" className="hover:text-foreground transition-colors">Threat Scenarios</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-4 sm:px-6 pt-16 pb-12 md:pt-28 md:pb-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-300 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Free during beta — no credit card required
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Authentication
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              made for everyone!
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
            Secure, scalable, and game-changing authentication for your applications. 
            Get started in minutes with our powerful APIs and SDKs.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-7 gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0 shadow-xl shadow-purple-500/25">
                <Rocket className="h-4 w-4" /> Start for free
              </Button>
            </Link>
            <a href="#code">
              <Button size="lg" variant="outline" className="h-12 px-7 gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50">
                <Code2 className="h-4 w-4" /> View the API
              </Button>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-purple-400" /> No credit card</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-purple-400" /> 7+ languages</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-purple-400" /> HWID + Anti-sharing</div>
          </div>

          {/* Integrate into any programming language */}
          <div className="mt-12 text-xs text-muted-foreground tracking-widest uppercase">
            Integrate into any programming language
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground/70">
            {["Python", "C#", "Node.js", "C++", "Go", "Rust", "Java"].map((lang) => (
              <div key={lang} className="rounded-lg border border-border/40 bg-card/30 px-4 py-2 backdrop-blur font-mono text-xs">
                {lang}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Uptime", value: "99.99%", icon: Gauge },
              { label: "API Latency", value: "<50ms", icon: Zap },
              { label: "Languages", value: "7+", icon: Code2 },
              { label: "Setup Time", value: "30s", icon: Rocket },
            ].map((s) => (
              <div key={s.label} className="group flex flex-col items-center rounded-xl border border-purple-500/20 bg-card/30 backdrop-blur py-5 px-4 transition-all hover:border-purple-500/40 hover:bg-purple-500/5">
                <s.icon className="h-5 w-5 text-purple-400 mb-2" />
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent font-mono">{s.value}</span>
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
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
              <Zap className="h-3 w-3 text-purple-400" /> Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything you need to succeed.</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              A comprehensive suite of integrated tools for authentication, monetization, and user engagement.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur transition-all duration-300 hover:border-purple-500/40 hover:bg-card/70 hover:-translate-y-1"
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.color} text-white shadow-lg`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Speed & Infrastructure */}
      <section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
                <Gauge className="h-3 w-3 text-purple-400" /> Speed Matters
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Lightning Fast Connections</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Our lightning-fast infrastructure ensures your authentication requests are processed in under 50ms globally. With 99.99% uptime and redundant systems, your users will never experience delays.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-purple-500/20 bg-card/40 p-4">
                  <div className="text-2xl font-bold font-mono bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">~50ms</div>
                  <div className="text-xs text-muted-foreground mt-1">Response Time</div>
                </div>
                <div className="rounded-lg border border-purple-500/20 bg-card/40 p-4">
                  <div className="text-2xl font-bold font-mono bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">99.99%</div>
                  <div className="text-xs text-muted-foreground mt-1">Uptime</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-500/20 to-violet-500/20 blur-2xl" />
                <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-purple-500/30 bg-card/60 backdrop-blur">
                  <div className="text-center">
                    <div className="text-4xl font-bold font-mono bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">97</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Performance<br />Index</div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">LIVE</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Threat Scenarios */}
      <section id="threats" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
              <Shield className="h-3 w-3 text-purple-400" /> Threat Scenarios + ROI
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">See how we block attacks and the revenue impact</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Pick an attack, watch the defense, and estimate monthly revenue saved.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THREATS.map((t) => (
              <div key={t.title} className="rounded-xl border border-border/50 bg-card/40 backdrop-blur p-6 hover:border-purple-500/30 transition-all">
                <h3 className="font-semibold text-base mb-2">{t.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{t.desc}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-blue-300">{t.defense}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                    <span className="text-green-300">{t.result}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
              <Rocket className="h-3 w-3 text-purple-400" /> Simple Setup
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Get Started in 3 Steps.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { n: "1", title: "Register an Account", desc: "Head over to our register page to create your account. It takes less than 30 seconds." },
              { n: "2", title: "Create an Application", desc: "Applications are the heart of your service. This is where all your users, licenses, and data will be stored." },
              { n: "3", title: "Integrate our API", desc: "Use our SDKs and code snippets. Simply follow the steps and have authentication up in less than 5 minutes." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur hover:border-purple-500/30 transition-all">
                <div className="absolute -top-3 -left-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-purple-500/25">
                  {s.n}
                </div>
                <h3 className="mt-2 mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section id="compare" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
              <Eye className="h-3 w-3 text-purple-400" /> See the difference
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why switch to Galactic Boosts?</h2>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-purple-500/5">
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-purple-400">Galactic Boosts</th>
                  <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Others</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((c, i) => (
                  <tr key={c.feature} className={`border-b border-border/30 ${i % 2 === 0 ? "bg-purple-500/[0.02]" : ""}`}>
                    <td className="px-5 py-3 text-foreground/90">{c.feature}</td>
                    <td className="px-5 py-3 text-center">
                      {c.us ? <CheckCircle2 className="h-4 w-4 text-purple-400 mx-auto" /> : <span className="text-muted-foreground">—</span>}
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

      {/* Code preview */}
      <section id="code" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">One API call. That's it.</h2>
            <p className="mt-3 text-muted-foreground">Validate licenses, bind HWIDs, and detect sharing in a single request.</p>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-card/60 backdrop-blur overflow-hidden shadow-2xl shadow-purple-500/10">
            <div className="flex items-center justify-between border-b border-border/50 bg-purple-500/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-xs text-muted-foreground">validate.py</span>
              </div>
              <Lock className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <pre className="overflow-x-auto p-5 text-xs sm:text-sm leading-relaxed">
              <code className="text-foreground/90">{SAMPLE_PY}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
              <Star className="h-3 w-3 text-purple-400" /> Testimonials
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Real user experiences.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card/40 backdrop-blur p-5 transition-all hover:border-purple-500/30">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                  {Array.from({ length: 5 - t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-muted-foreground/30" />
                  ))}
                </div>
                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-xs font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
            <p className="mt-3 text-muted-foreground">Got questions? We've got answers.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden transition-all hover:border-purple-500/30"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
                >
                  {f.q}
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-purple-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-violet-500/5 p-8 sm:p-12 backdrop-blur-xl shadow-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-5">
              <Sparkles className="h-3 w-3" /> Get Started
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to protect your software?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands of developers who trust Galactic Boosts to secure their applications. Start free today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8 gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-purple-500/25">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-8 gap-2 border-purple-500/30 hover:bg-purple-500/10">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-purple-400" />
            <span>© {new Date().getFullYear()} Galactic Boosts</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}