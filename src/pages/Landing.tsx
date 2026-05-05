import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Key, Shield, Webhook, Users, Database, Zap, Globe, ArrowRight,
  Sparkles, CheckCircle2, Code2, Lock, Activity, Rocket, Terminal,
  Eye, Star, ChevronDown, ChevronUp, Cpu, Gauge, Server,
  MonitorSmartphone, Menu, X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

/* ── Animation helpers ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" as const },
  }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} id={id} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className={className}>
      {children}
    </motion.section>
  );
}

function Counter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const dur = 1200, start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

const FEATURES = [
  { icon: Key, title: "License Keys", desc: "Generate, validate, ban & revoke with HWID binding, expiration, and metadata.", color: "from-purple-500 to-violet-600" },
  { icon: Users, title: "App Users", desc: "End-user auth from your software with username/password sessions and tiers.", color: "from-blue-500 to-indigo-600" },
  { icon: Database, title: "Variables API", desc: "Store runtime secrets gated by license validity and tier.", color: "from-fuchsia-500 to-pink-600" },
  { icon: Webhook, title: "Webhooks", desc: "Real-time POST notifications for login, ban, HWID reset events.", color: "from-violet-500 to-purple-600" },
  { icon: Shield, title: "Anti-Sharing", desc: "Auto-ban shared keys across IPs. HMAC signing prevents replay.", color: "from-indigo-500 to-blue-600" },
  { icon: Activity, title: "Live Analytics", desc: "Real-time dashboard with trends, heatmap & active sessions.", color: "from-pink-500 to-rose-600" },
  { icon: Globe, title: "Resellers", desc: "Delegate generation with credit limits & per-app permissions.", color: "from-purple-400 to-indigo-600" },
  { icon: Terminal, title: "Bot Integration", desc: "Discord slash commands, heartbeat enforcement & bot API keys.", color: "from-violet-400 to-fuchsia-600" },
  { icon: Cpu, title: "Sessions", desc: "Control active sessions, enforce limits & concurrent access.", color: "from-blue-400 to-purple-600" },
  { icon: Lock, title: "Hash Checks", desc: "Server-side hash verification for tamper detection.", color: "from-indigo-400 to-violet-600" },
  { icon: Server, title: "Edge Network", desc: "Serverless edge with <50ms latency across 300+ locations.", color: "from-purple-500 to-pink-600" },
  { icon: MonitorSmartphone, title: "Multi-Platform", desc: "SDKs for Python, C#, Node.js, C++, Go, Rust & Java.", color: "from-fuchsia-400 to-purple-600" },
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

r = requests.post("https://api.grazexauth.com/api/validate", json={
    "license_key": "GX-XXXX-XXXX-XXXX-XXXX",
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
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <motion.div className="absolute -left-32 top-32 h-[600px] w-[600px] rounded-full bg-purple-600/[0.12] blur-[120px]" animate={{ y: scrollY * 0.05 }} transition={{ type: "tween", duration: 0 }} />
        <motion.div className="absolute -right-32 top-[600px] h-[500px] w-[500px] rounded-full bg-violet-500/[0.08] blur-[100px]" animate={{ y: scrollY * -0.03 }} transition={{ type: "tween", duration: 0 }} />
        <div className="absolute left-1/2 top-[1200px] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-fuchsia-500/[0.07] blur-[90px]" />
        <div className="absolute right-1/4 top-[2000px] h-[500px] w-[500px] rounded-full bg-indigo-500/[0.07] blur-[100px]" />
      </div>

      {/* Navigation */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-lg bg-purple-500/30 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
                <Key className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">GrazeXauth</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#compare" className="hover:text-foreground transition-colors">Compare</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</Button></Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <button className="md:hidden ml-1" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-border/40 overflow-hidden">
              <div className="flex flex-col gap-3 px-4 py-4 text-sm">
                <a href="#features" onClick={() => setMobileMenu(false)} className="text-muted-foreground hover:text-foreground">Features</a>
                <a href="#how" onClick={() => setMobileMenu(false)} className="text-muted-foreground hover:text-foreground">How it works</a>
                <a href="#compare" onClick={() => setMobileMenu(false)} className="text-muted-foreground hover:text-foreground">Compare</a>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
                <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 px-4 sm:px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-300 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" /> Free during beta — no credit card
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Authentication<br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">made for developers.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            The modern license-key & user-auth platform. Secure HWID binding, anti-sharing, live analytics, and multi-language SDKs — all in one API.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0 shadow-xl shadow-purple-500/25 transition-shadow hover:shadow-2xl hover:shadow-purple-500/30">
                <Rocket className="h-4 w-4" /> Start for free
              </Button>
            </Link>
            <a href="#code">
              <Button size="lg" variant="outline" className="h-12 px-8 gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50">
                <Code2 className="h-4 w-4" /> View the API
              </Button>
            </a>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65, duration: 0.5 }} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {["Python", "C#", "Node.js", "C++", "Go", "Rust", "Java"].map((lang, i) => (
              <motion.div key={lang} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + i * 0.05 }} className="rounded-lg border border-border/40 bg-card/30 px-3.5 py-1.5 backdrop-blur font-mono text-xs text-muted-foreground/70 hover:border-purple-500/40 hover:text-purple-300 transition-colors cursor-default">
                {lang}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <Section className="relative z-10 px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Uptime", value: 99.99, suffix: "%", icon: Gauge },
              { label: "Latency", value: 50, suffix: "ms", prefix: "<", icon: Zap },
              { label: "Languages", value: 7, suffix: "+", icon: Code2 },
              { label: "Setup", value: 30, suffix: "s", icon: Rocket },
            ].map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} custom={i} className="group flex flex-col items-center rounded-xl border border-purple-500/20 bg-card/30 backdrop-blur py-5 px-4 transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/5 hover:-translate-y-0.5">
                <s.icon className="h-5 w-5 text-purple-400 mb-2" />
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent font-mono">
                  <Counter value={s.value} suffix={s.suffix} prefix={s.prefix} />
                </span>
                <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section id="features" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4 mx-auto">
              <Zap className="h-3 w-3 text-purple-400" /> Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything you need to ship.</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">A complete toolkit for authentication, monetization & user management.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i} className="group relative rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur transition-all duration-300 hover:border-purple-500/40 hover:bg-card/60 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/5">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.color} text-white shadow-lg`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Threat Scenarios */}
      <Section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4 mx-auto">
              <Shield className="h-3 w-3 text-purple-400" /> Security
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">See how we block attacks</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Real threat scenarios and our automated defenses.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THREATS.map((t, i) => (
              <motion.div key={t.title} variants={fadeUp} custom={i} className="rounded-xl border border-border/50 bg-card/40 backdrop-blur p-6 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
                <h3 className="font-semibold text-sm mb-2">{t.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t.desc}</p>
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
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4 mx-auto">
              <Rocket className="h-3 w-3 text-purple-400" /> Quick Start
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Live in 3 steps</h2>
          </motion.div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="hidden md:block absolute top-12 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-purple-500/40 via-violet-500/40 to-purple-500/40" />
            {[
              { n: "1", title: "Create Account", desc: "Sign up in 30 seconds — no credit card required." },
              { n: "2", title: "Add Your App", desc: "Create an application. This holds your keys, users & data." },
              { n: "3", title: "Integrate API", desc: "Copy our SDK snippet — authentication live in 5 minutes." },
            ].map((s, i) => (
              <motion.div key={s.n} variants={fadeUp} custom={i} className="relative rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-purple-500/25">
                  {s.n}
                </div>
                <h3 className="text-center text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-center text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Comparison */}
      <Section id="compare" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4 mx-auto">
              <Eye className="h-3 w-3 text-purple-400" /> Compare
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why switch to GrazeXauth?</h2>
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-purple-500/5">
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                    <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-purple-400">GrazeXauth</th>
                    <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISONS.map((c, i) => (
                    <tr key={c.feature} className={`border-b border-border/30 transition-colors hover:bg-purple-500/[0.04] ${i % 2 === 0 ? "bg-purple-500/[0.02]" : ""}`}>
                      <td className="px-5 py-3 text-foreground/90">{c.feature}</td>
                      <td className="px-5 py-3 text-center">{c.us ? <CheckCircle2 className="h-4 w-4 text-purple-400 mx-auto" /> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-5 py-3 text-center">{c.them ? <CheckCircle2 className="h-4 w-4 text-muted-foreground/50 mx-auto" /> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Code preview */}
      <Section id="code" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">One API call. That's it.</h2>
            <p className="mt-3 text-muted-foreground">Validate, bind HWIDs, and detect sharing — one request.</p>
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-xl border border-purple-500/20 bg-card/60 backdrop-blur overflow-hidden shadow-2xl shadow-purple-500/10">
            <div className="flex items-center justify-between border-b border-border/50 bg-purple-500/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-xs text-muted-foreground">validate.py</span>
              </div>
              <Lock className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <pre className="overflow-x-auto p-5 text-xs sm:text-sm leading-relaxed font-mono">
              <code className="text-foreground/90">{SAMPLE_PY}</code>
            </pre>
          </motion.div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4 mx-auto">
              <Star className="h-3 w-3 text-purple-400" /> Reviews
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Loved by developers</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="rounded-xl border border-border/50 bg-card/40 backdrop-blur p-5 transition-all duration-300 hover:border-purple-500/30 hover:-translate-y-1">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                  {Array.from({ length: 5 - t.stars }).map((_, j) => (
                    <Star key={`e${j}`} className="h-4 w-4 text-muted-foreground/30" />
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
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4 mx-auto">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
          </motion.div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="rounded-xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden transition-all duration-200 hover:border-purple-500/30">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium">
                  {f.q}
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-purple-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div variants={fadeUp} className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-violet-500/5 p-8 sm:p-14 backdrop-blur-xl shadow-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to protect your software?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Join developers who trust GrazeXauth. Start free today.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8 gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-purple-500/25 transition-shadow hover:shadow-2xl hover:shadow-purple-500/30">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-8 gap-2 border-purple-500/30 hover:bg-purple-500/10">View Pricing</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-purple-400" />
            <span>&copy; {new Date().getFullYear()} GrazeXauth. All rights reserved.</span>
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