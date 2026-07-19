import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Key, Shield, Webhook, Users, Database, Zap, Globe, ArrowRight,
  Sparkles, CheckCircle2, Code2, Lock, Activity, Rocket, Terminal,
  Eye, Star, ChevronDown, ChevronUp, Cpu, Gauge, Server,
  MonitorSmartphone, Menu, X, AppWindow,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { AnimatedCodeBlock, type CodeTab } from "@/components/AnimatedCodeBlock";

/* ── Animation helpers ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" as const },
  }),
};

function DiscordIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.3 4.4A16.3 16.3 0 0 0 16.2 3l-.2.4c1.5.4 2.2 1 2.2 1a14 14 0 0 0-12.4 0s.8-.6 2.3-1L7.8 3a16.5 16.5 0 0 0-4.1 1.4C1.1 8.3.4 12.1.8 15.9a16.7 16.7 0 0 0 5.1 2.6l.6-.9c-1.1-.4-2.1-1-2.1-1l.5-.3c4 1.9 8.3 1.9 12.2 0l.5.3s-1 .6-2.1 1l.6.9a16.7 16.7 0 0 0 5.1-2.6c.5-4.4-.8-8.1-2.9-11.5ZM8.3 13.6c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7Zm7.4 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7Z" />
    </svg>
  );
}

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

const FEATURE_GROUPS = [
  {
    label: "Authentication",
    icon: Key,
    blurb: "Everything to identify, authorize, and track your users.",
    items: [
      { icon: Key, title: "License Keys", desc: "Generate, validate, ban & revoke with HWID binding & metadata." },
      { icon: Users, title: "App Users", desc: "Username/password sessions, tiered access, subscriptions." },
      { icon: Cpu, title: "Sessions", desc: "Enforce concurrent-session limits across devices." },
      { icon: Database, title: "Variables API", desc: "Store runtime secrets gated by license validity & tier." },
    ],
  },
  {
    label: "Security",
    icon: Shield,
    blurb: "Defense-in-depth that stops sharing, tampering & abuse.",
    items: [
      { icon: Shield, title: "Anti-Sharing", desc: "Auto-ban shared keys across unique IPs with thresholds." },
      { icon: Lock, title: "Request Signing", desc: "HMAC-SHA256 with 60s replay window — zero spoofing." },
      { icon: Eye, title: "Hash Checks", desc: "Server-side binary verification detects tampering." },
      { icon: Globe, title: "Global Blacklist", desc: "Block IPs & HWIDs platform-wide in one click." },
    ],
  },
  {
    label: "Scale & Ops",
    icon: Activity,
    blurb: "Built to grow with you — from 10 users to 10 million.",
    items: [
      { icon: Activity, title: "Live Analytics", desc: "Realtime dashboard, heatmaps, 7-day charts." },
      { icon: Webhook, title: "Webhooks", desc: "POST events for login, ban, HWID reset, expiry." },
      { icon: Terminal, title: "Discord Bot", desc: "Slash commands, heartbeat enforcement, bot API keys." },
      { icon: Server, title: "Edge Network", desc: "Serverless edge with <50ms latency worldwide." },
    ],
  },
];

const PRICING_TEASER = [
  { name: "Free", price: "$0", suffix: "forever", desc: "1 app · 25 keys · HWID binding · full validation API.", cta: "Start free", highlight: false },
  { name: "Lifetime", price: "$49", suffix: "one-time", desc: "Unlimited apps & keys, resellers, managers, webhooks & priority support — pay once, own it forever.", cta: "Get Lifetime", highlight: true },
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
  { name: "Luna", role: "Indie Developer", stars: 5, text: "One-time $49 for unlimited everything — no monthly bill anxiety. Best value in the licensing space, hands down." },
];

const FAQS = [
  { q: "How fast can I get started?", a: "Sign up takes 30 seconds. Create an application, grab your API key, and integrate with our copy-paste code snippets. Most developers are live in under 5 minutes." },
  { q: "Is there a free plan?", a: "Yes. The Free tier includes 1 application and up to 25 license keys, plus HWID binding, anti-sharing and the full validation API. No credit card required — upgrade to Lifetime any time to unlock unlimited apps, keys, resellers and managers." },
  { q: "How does HWID binding work?", a: "Your application sends a hardware fingerprint with each validation request. We bind the license to that device on first use, preventing unauthorized sharing across multiple machines." },
  { q: "What programming languages are supported?", a: "We provide official SDKs and code examples for Python, C#, Node.js, C++, Go, Rust, and Java. Our REST API works with any language that can make HTTP requests." },
  { q: "Can I migrate from KeyAuth?", a: "Absolutely. Our API is designed to be a drop-in replacement. Most migrations take under an hour. We also offer migration guides and direct support." },
  { q: "Is my data secure?", a: "All requests use HMAC-SHA256 signing with replay protection. Data is encrypted at rest and in transit. Our infrastructure runs on enterprise-grade serverless edge nodes." },
  { q: "Is Lifetime really one payment?", a: "Yes. Pay $49 once and every current and future platform feature is yours — no renewals, no seat fees, no per-app charges. If we release a paid add-on later, Lifetime users are grandfathered in." },
];

const THREATS = [
  { title: "HWID Swap", desc: "User attempts to bypass device binding.", defense: "Validate HWID binding with small grace window. Require owner approval for new device or reset.", result: "Unauthorized device fails verification." },
  { title: "Key Leaked Publicly", desc: "Attacker shares a paid key online.", defense: "Anti-sharing detects multiple unique IPs. Auto-ban triggers when threshold is exceeded.", result: "Key automatically banned, owner notified." },
  { title: "Clock Spoof", desc: "System time manipulated to extend trials.", defense: "Server-side expiration check. Client clock is never trusted for license validation.", result: "Expired license correctly rejected." },
];

const SAMPLE_PY = `import requests, hashlib, uuid

r = requests.post("https://gxauth.xyz/api/validate", json={
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

const SAMPLE_JS = `import crypto from "crypto";

const hwid = crypto.createHash("sha256")
  .update(require("os").networkInterfaces().eth0?.[0]?.mac || "x")
  .digest("hex");

const res = await fetch("https://gxauth.xyz/api/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    license_key: "GX-XXXX-XXXX-XXXX-XXXX",
    application_id: "your-app-id",
    hwid,
  }),
});

const data = await res.json();
console.log(data.valid ? "✅ " + data.expires_readable : "❌ " + data.error);`;

const SAMPLE_CS = `using System.Net.Http.Json;

var client = new HttpClient();
var payload = new {
    license_key = "GX-XXXX-XXXX-XXXX-XXXX",
    application_id = "your-app-id",
    hwid = HwidHelper.Get()
};

var res = await client.PostAsJsonAsync(
    "https://gxauth.xyz/api/validate", payload);
var data = await res.Content.ReadFromJsonAsync<ValidateResponse>();

Console.WriteLine(data.valid
    ? $"✅ Welcome — expires {data.expires_readable}"
    : $"❌ {data.error}");`;

const CODE_TABS: CodeTab[] = [
  { label: "Python", filename: "validate.py", code: SAMPLE_PY },
  { label: "Node.js", filename: "validate.mjs", code: SAMPLE_JS },
  { label: "C#", filename: "Validate.cs", code: SAMPLE_CS },
];

function ProductConsoleMock() {
  const queue = [
    { label: "License validation", state: "DONE", width: "92%" },
    { label: "HWID binding", state: "DONE", width: "86%" },
    { label: "Webhook delivery", state: "QUEUED", width: "35%" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[660px]">
      <div className="absolute -right-4 top-8 z-10 hidden rounded-lg border border-border/70 bg-card/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur md:block">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Login approved</p>
            <p className="text-xs text-muted-foreground">+1 active session</p>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="overflow-hidden rounded-xl border border-border/80 bg-[#090a0d]/95 shadow-[0_30px_90px_-50px_hsl(var(--primary)/0.7)] backdrop-blur"
      >
        <div className="flex h-12 items-center gap-3 border-b border-border/70 px-5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted" />
          </div>
          <p className="font-mono text-xs text-muted-foreground">app.gxauth.xyz/dashboard</p>
          <span className="ml-auto hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 sm:inline-flex">Live</span>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Apps", "12", AppWindow],
                ["Licenses", "2.4k", Key],
                ["Uptime", "99.99%", CheckCircle2],
                ["Latency", "46ms", Gauge],
              ].map(([label, value, Icon]: any) => (
                <div key={label} className="min-h-[108px] rounded-lg border border-border/70 bg-card/60 p-4">
                  <Icon className="mb-3 h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 whitespace-nowrap text-xl font-bold text-foreground sm:text-2xl">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border/70 bg-card/60 p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Validations · 24h</span>
                <span className="text-emerald-300">+18%</span>
              </div>
              <div className="flex h-24 items-end gap-2">
                {[28, 42, 35, 55, 47, 68, 61, 82, 75, 96, 88, 108].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/25 to-primary" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-black/35">
              <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
                <Terminal className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs text-muted-foreground">validate.http</span>
              </div>
              <pre className="overflow-hidden p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
<span className="text-primary">POST</span> /api/validate{"\n"}
{"{"}{"\n"}
  "license_key": "GALACTIC-...",{"\n"}
  "hwid": "device_hash"{"\n"}
{"}"}{"\n\n"}
<span className="text-emerald-300">valid: true</span>{"\n"}
expires: lifetime
              </pre>
            </div>

            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.label} className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className={item.state === "DONE" ? "text-[10px] font-semibold text-emerald-300" : "text-[10px] font-semibold text-muted-foreground"}>{item.state}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [showDiscordInvite, setShowDiscordInvite] = useState(true);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 22% 18%, hsl(var(--primary) / 0.45), transparent 24%), radial-gradient(circle at 78% 36%, hsl(var(--accent) / 0.28), transparent 28%), linear-gradient(hsl(var(--primary) / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.12) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--foreground) / 0.55) 1px, transparent 1.5px)",
            backgroundSize: "92px 92px",
          }}
        />
      </div>

      {/* Navigation */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="sticky top-0 z-50 border-b border-border/40 md:backdrop-blur-xl bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-lg bg-primary/30 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md border border-primary/20 bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/10">
                <Key className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">GX Auth</span>
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
              <Button size="sm" className="gap-1.5 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <button className="md:hidden ml-1" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <nav className="md:hidden border-t border-border/40 animate-fade-in">
            <div className="flex flex-col gap-3 px-4 py-4 text-sm">
              <a href="#features" onClick={() => setMobileMenu(false)} className="text-muted-foreground hover:text-foreground">Features</a>
              <a href="#how" onClick={() => setMobileMenu(false)} className="text-muted-foreground hover:text-foreground">How it works</a>
              <a href="#compare" onClick={() => setMobileMenu(false)} className="text-muted-foreground hover:text-foreground">Compare</a>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
              <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link>
            </div>
          </nav>
        )}
      </motion.header>

      {/* Hero — centered, SellAuth-inspired */}
      <section className="relative z-10 px-4 sm:px-6 pt-14 pb-12 md:pt-24 md:pb-20">
        {/* dramatic radial backdrop */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(180deg,hsl(var(--primary)/0.16),transparent_68%)]" />
          <div className="absolute left-1/2 top-[120px] h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/45 to-accent/25" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/75 px-4 py-1.5 text-xs text-foreground/90 shadow-lg shadow-primary/5 md:backdrop-blur sm:text-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            <span className="font-medium">Protected changes are live</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 max-w-3xl font-extrabold leading-[1.04] text-foreground text-[2.45rem] xs:text-5xl sm:text-[3.65rem] lg:text-[4.65rem]"
          >
            License your software.
            <span className="block bg-gradient-to-r from-primary via-blue-300 to-accent bg-clip-text text-transparent">Control every key.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed"
          >
            GX Auth gives software owners a clean license system for apps, users,
            HWID binding, subscriptions, and security events without touching your
            production data.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group relative h-14 w-full rounded-md border-0 bg-gradient-to-r from-primary to-accent text-base font-semibold text-primary-foreground shadow-[0_18px_45px_-24px_hsl(var(--primary)/0.65)] transition-all duration-300 hover:scale-[1.01] sm:w-[210px]"
              >
                Get started
                <span className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="group h-14 w-full rounded-md border-border/70 bg-card/55 text-base font-semibold text-foreground hover:border-primary/40 hover:bg-card/75 md:backdrop-blur sm:w-[210px]"
              >
                View features
                <span className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 group-hover:border-primary/60 group-hover:translate-x-0.5 transition-all">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Button>
            </a>
            <a href="https://discord.gg/galaticboosts" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="group h-14 w-full rounded-md border-[#5865F2]/50 bg-[#5865F2]/15 text-base font-semibold text-foreground shadow-[0_16px_44px_-30px_#5865F2] hover:border-[#5865F2]/80 hover:bg-[#5865F2]/25 md:backdrop-blur sm:w-[210px]"
              >
                <DiscordIcon className="mr-2 h-4 w-4 text-[#c7cbff]" />
                Discord
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-7 flex flex-wrap gap-2"
          >
            {["Safe license deletes", "Owner scoped", "Admin controls", "Live logs"].map((item) => (
              <span key={item} className="rounded-md border border-border/40 bg-card/30 px-2.5 py-1 md:backdrop-blur font-mono text-[11px] text-muted-foreground/80">
                {item}
              </span>
            ))}
          </motion.div>
          </div>

        {/* Dashboard / code preview */}
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <ProductConsoleMock />
          {false && (
          <AnimatedCodeBlock
            tabs={CODE_TABS}
            responseSlot={
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Response</div>
                <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <div className="text-[11px]">
                    <div className="font-semibold text-foreground">200 OK · 42ms</div>
                    <div className="text-muted-foreground">License valid</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <div className="text-[11px]">
                    <div className="font-semibold text-foreground">HWID bound</div>
                    <div className="text-muted-foreground font-mono">device #A4B2</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                  <Activity className="h-4 w-4 text-primary-glow shrink-0" />
                  <div className="text-[11px]">
                    <div className="font-semibold text-foreground">Logged event</div>
                    <div className="text-muted-foreground">India · login_success</div>
                  </div>
                </div>
              </>
            }
          />
          )}
        </motion.div>
        </div>
      </section>

      {showDiscordInvite && (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="fixed bottom-5 left-5 z-40 hidden items-center gap-3 rounded-lg border border-border/80 bg-card/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur lg:flex"
      >
        <a href="https://discord.gg/galaticboosts" target="_blank" rel="noreferrer" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#5865F2]/20 text-[#c7cbff]">
          <DiscordIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Join our Discord</p>
          <p className="text-xs text-muted-foreground">Support, updates and community</p>
        </div>
        <span className="rounded-md border border-border/70 bg-secondary px-3 py-1 text-sm font-semibold text-foreground">Join</span>
        </a>
        <button
          type="button"
          aria-label="Dismiss Discord invite"
          onClick={() => setShowDiscordInvite(false)}
          className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
      )}

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
              <motion.div key={s.label} variants={fadeUp} custom={i} className="group flex flex-col items-center rounded-lg border border-border/70 bg-card/70 px-4 py-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 md:backdrop-blur md:hover:-translate-y-0.5">
                <s.icon className="h-5 w-5 text-primary mb-2" />
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-mono">
                  <Counter value={s.value} suffix={s.suffix} prefix={s.prefix} />
                </span>
                <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Features — tabbed groups */}
      <Section id="features" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4 mx-auto">
              <Zap className="h-3 w-3 text-primary" /> Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">A platform, not just an API.</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Pick a pillar to explore what's built in.</p>
          </motion.div>

          {/* Tabs */}
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {FEATURE_GROUPS.map((g, i) => (
              <button
                key={g.label}
                onClick={() => setActiveGroup(i)}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeGroup === i
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeGroup === i && (
                  <motion.div
                    layoutId="feat-tab"
                    className="absolute inset-0 rounded-full gradient-primary shadow-lg shadow-primary/30"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <g.icon className="relative h-4 w-4" />
                <span className="relative">{g.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeGroup}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-center text-sm text-muted-foreground mb-8">{FEATURE_GROUPS[activeGroup].blurb}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURE_GROUPS[activeGroup].items.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="group relative rounded-xl border border-border/50 bg-card/40 p-5 md:backdrop-blur transition-all duration-300 hover:border-primary/40 hover:bg-card/60 md:hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-white shadow-lg shadow-primary/25">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Section>

      {/* Threat Scenarios */}
      <Section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4 mx-auto">
              <Shield className="h-3 w-3 text-primary" /> Security
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">See how we block attacks</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Real threat scenarios and our automated defenses.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THREATS.map((t, i) => (
              <motion.div key={t.title} variants={fadeUp} custom={i} className="rounded-xl border border-border/50 bg-card/40 md:backdrop-blur p-6 hover:border-primary/30 transition-all duration-300 md:hover:-translate-y-1">
                <h3 className="font-semibold text-sm mb-2">{t.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t.desc}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4 mx-auto">
              <Rocket className="h-3 w-3 text-primary" /> Quick Start
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Live in 3 steps</h2>
          </motion.div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="hidden md:block absolute top-12 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-primary/40 via-primary/70/40 to-primary/40" />
            {[
              { n: "1", title: "Create Account", desc: "Sign up in 30 seconds — no credit card required." },
              { n: "2", title: "Add Your App", desc: "Create an application. This holds your keys, users & data." },
              { n: "3", title: "Integrate API", desc: "Copy our SDK snippet — authentication live in 5 minutes." },
            ].map((s, i) => (
              <motion.div key={s.n} variants={fadeUp} custom={i} className="relative rounded-xl border border-border/50 bg-card/40 p-6 md:backdrop-blur hover:border-primary/30 transition-all duration-300 md:hover:-translate-y-1">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-white shadow-lg shadow-primary/25">
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4 mx-auto">
              <Eye className="h-3 w-3 text-primary" /> Compare
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why switch to GX Auth?</h2>
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-xl border border-border/50 bg-card/40 md:backdrop-blur overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-primary/5">
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                    <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-primary">GX Auth</th>
                    <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISONS.map((c, i) => (
                    <tr key={c.feature} className={`border-b border-border/30 transition-colors hover:bg-primary/[0.04] ${i % 2 === 0 ? "bg-primary/[0.02]" : ""}`}>
                      <td className="px-5 py-3 text-foreground/90">{c.feature}</td>
                      <td className="px-5 py-3 text-center">{c.us ? <CheckCircle2 className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}</td>
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
          <motion.div variants={fadeUp}>
            <AnimatedCodeBlock tabs={CODE_TABS} />
          </motion.div>
        </div>
      </Section>

      {/* Pricing teaser */}
      <Section id="pricing-teaser" className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4 mx-auto">
              <Sparkles className="h-3 w-3 text-primary" /> Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-3 text-muted-foreground">Free forever for solo devs. Pay only when you scale.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {PRICING_TEASER.map((p, i) => (
              <motion.div
                key={p.name}
                variants={fadeUp}
                custom={i}
                className={`relative rounded-2xl border p-7 md:backdrop-blur transition-all duration-300 md:hover:-translate-y-1 ${
                  p.highlight
                    ? "border-primary/60 bg-gradient-to-br from-primary/10 to-primary/70/5 shadow-2xl shadow-primary/20"
                    : "border-border/50 bg-card/40 hover:border-primary/30"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg">
                    Most popular
                  </div>
                )}
                <div className="text-sm font-medium text-muted-foreground mb-2">{p.name}</div>
                <div className="mb-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-xs text-muted-foreground">{p.suffix}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{p.desc}</p>
                <Link to="/pricing">
                  <Button
                    className={`w-full ${p.highlight ? "gradient-primary text-white border-0 hover:shadow-lg hover:shadow-primary/30" : ""}`}
                    variant={p.highlight ? "default" : "outline"}
                  >
                    {p.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link to="/pricing" className="text-sm text-primary hover:text-primary inline-flex items-center gap-1">
              See full feature comparison <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4 mx-auto">
              <Star className="h-3 w-3 text-primary" /> Reviews
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Loved by developers</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="rounded-xl border border-border/50 bg-card/40 md:backdrop-blur p-5 transition-all duration-300 hover:border-primary/30 md:hover:-translate-y-1">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-white">
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4 mx-auto">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
          </motion.div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className={`group rounded-xl border md:backdrop-blur overflow-hidden transition-all duration-300 ${
                  openFaq === i
                    ? "border-primary/50 bg-primary/[0.04] shadow-lg shadow-primary/10"
                    : "border-border/50 bg-card/40 hover:border-primary/30"
                }`}
              >
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium">
                  <span className={openFaq === i ? "text-foreground" : "text-foreground/90"}>{f.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0">
                    <ChevronDown className={`h-4 w-4 ${openFaq === i ? "text-primary" : "text-muted-foreground"}`} />
                  </motion.div>
                </button>
                {openFaq === i && (
                  <div className="overflow-hidden animate-fade-in">
                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-primary/10 pt-4">
                      {f.a}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div variants={fadeUp} className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-8 sm:p-14 md:backdrop-blur-xl shadow-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to protect your software?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Join developers who trust GX Auth. Start free today.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/70 text-white border-0 shadow-lg shadow-primary/25 transition-shadow hover:shadow-2xl hover:shadow-primary/30">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-8 gap-2 border-primary/30 hover:bg-primary/10">View Pricing</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/60 md:backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <span>&copy; {new Date().getFullYear()} GX Auth. All rights reserved.</span>
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
