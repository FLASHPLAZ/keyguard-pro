import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, CheckCircle2, ArrowRight, Sparkles, X, Minus } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const PLANS = [
  {
    name: "Tester",
    monthlyPrice: 0,
    yearlyPrice: 0,
    subtitle: "Perfect for testing and small projects",
    cta: "Get Started Free",
    ctaLink: "/signup",
    highlight: false,
    color: "border-border/50",
  },
  {
    name: "Developer",
    monthlyPrice: 2.99,
    yearlyPrice: 14.99,
    subtitle: "For serious developers and growing projects",
    cta: "Start Developer Plan",
    ctaLink: "/signup",
    highlight: true,
    color: "border-primary/50",
  },
  {
    name: "Seller",
    monthlyPrice: 4.99,
    yearlyPrice: 24.99,
    subtitle: "For businesses, resellers, and larger projects",
    cta: "Start Seller Plan",
    ctaLink: "/signup",
    highlight: false,
    color: "border-primary-glow/40",
  },
];

type CellVal = boolean | string | number;

interface FeatureRow {
  name: string;
  tester: CellVal;
  developer: CellVal;
  seller: CellVal;
}

interface FeatureSection {
  category: string;
  rows: FeatureRow[];
}

const FEATURE_TABLE: FeatureSection[] = [
  {
    category: "Core Authentication",
    rows: [
      { name: "Applications", tester: 1, developer: 8, seller: "Unlimited" },
      { name: "License Keys (Total)", tester: 10, developer: "10,000", seller: "Unlimited" },
      { name: "All Authentication Methods", tester: true, developer: true, seller: true },
      { name: "Token System", tester: true, developer: true, seller: true },
      { name: "Hash Checks", tester: true, developer: true, seller: true },
      { name: "HWID Protection", tester: true, developer: true, seller: true },
    ],
  },
  {
    category: "Management & Administration",
    rows: [
      { name: "App Creation & Management", tester: true, developer: true, seller: true },
      { name: "User Management", tester: true, developer: true, seller: true },
      { name: "License Management", tester: true, developer: true, seller: true },
      { name: "Subscription Management", tester: true, developer: true, seller: true },
      { name: "Session Management", tester: true, developer: true, seller: true },
      { name: "File Management", tester: false, developer: true, seller: true },
      { name: "Variables Management", tester: false, developer: true, seller: true },
      { name: "User Variables", tester: false, developer: true, seller: true },
    ],
  },
  {
    category: "Security & Protection",
    rows: [
      { name: "Blacklists", tester: false, developer: true, seller: true },
      { name: "Whitelists", tester: false, developer: true, seller: true },
      { name: "Account 2FA", tester: true, developer: true, seller: true },
      { name: "Client 2FA", tester: true, developer: true, seller: true },
      { name: "FIDO Security Key", tester: true, developer: true, seller: true },
      { name: "Anti-Sharing (IP)", tester: false, developer: true, seller: true },
      { name: "Request Signing", tester: false, developer: false, seller: true },
      { name: "Global Blacklist", tester: false, developer: false, seller: true },
    ],
  },
  {
    category: "Communication & Integration",
    rows: [
      { name: "Chat System", tester: false, developer: true, seller: true },
      { name: "Webhooks", tester: false, developer: true, seller: true },
      { name: "Webhook Testing", tester: false, developer: true, seller: true },
      { name: "Discord Bot", tester: false, developer: false, seller: true },
      { name: "Telegram Bot", tester: false, developer: false, seller: true },
    ],
  },
  {
    category: "Team & Business",
    rows: [
      { name: "Resellers", tester: 0, developer: 5, seller: "Unlimited" },
      { name: "Managers", tester: 0, developer: 2, seller: "Unlimited" },
      { name: "Customer Panel", tester: false, developer: false, seller: true },
    ],
  },
  {
    category: "Logging & Analytics",
    rows: [
      { name: "Event Logs", tester: false, developer: true, seller: true },
      { name: "Account Logs", tester: true, developer: true, seller: true },
      { name: "Seller Logs", tester: false, developer: false, seller: true },
      { name: "Live Analytics", tester: false, developer: true, seller: true },
    ],
  },
  {
    category: "Developer Tools",
    rows: [
      { name: "Web Loader", tester: false, developer: false, seller: true },
      { name: "Premade Code Examples", tester: true, developer: true, seller: true },
      { name: "Function Management", tester: true, developer: true, seller: true },
      { name: "Seller API", tester: false, developer: false, seller: true },
    ],
  },
  {
    category: "Support",
    rows: [
      { name: "Support Level", tester: "Delayed", developer: "Priority", seller: "Priority" },
    ],
  },
];

function CellDisplay({ value }: { value: CellVal }) {
  if (value === true) return <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />;
  if (value === false) return <Minus className="h-4 w-4 text-red-400/60 mx-auto" />;
  return <span className="text-sm text-foreground/80 font-medium">{value}</span>;
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-32 h-[600px] w-[600px] rounded-full bg-primary/[0.1] blur-[120px]" />
        <div className="absolute -right-32 top-[400px] h-[500px] w-[500px] rounded-full bg-primary/[0.08] blur-[100px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-lg bg-primary/30 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/25">
                <Key className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">GrazeXauth</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white border-0">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing Header */}
      <section className="relative z-10 px-4 sm:px-6 pt-16 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4">
            <Sparkles className="h-3 w-3 text-primary" /> Pricing
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Simple, transparent pricing.
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Start free. Upgrade when you're ready. No hidden fees.</p>
        </motion.div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
          <button onClick={() => setYearly(!yearly)} className={`relative h-7 w-12 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-secondary"}`}>
            <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${yearly ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm ${yearly ? "text-foreground" : "text-muted-foreground"}`}>Yearly</span>
          {yearly && <span className="text-xs font-semibold text-green-400 ml-1">save 60%</span>}
        </div>
      </section>

      {/* Plan Cards */}
      <section className="relative z-10 px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className={`relative rounded-2xl border backdrop-blur p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                plan.highlight
                  ? "border-primary/50 bg-primary/5 shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border-border/50 bg-card/40"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-4 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{plan.subtitle}</p>
              <div className="mt-4 flex items-baseline gap-1">
                {plan.monthlyPrice === 0 ? (
                  <>
                    <span className="text-4xl font-bold">Free</span>
                    <span className="text-sm text-muted-foreground ml-1">Forever free</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      ${yearly ? plan.yearlyPrice.toFixed(2) : plan.monthlyPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/{yearly ? "year" : "month"}</span>
                  </>
                )}
              </div>
              <Link to={plan.ctaLink} className="mt-6">
                <Button className={`w-full ${
                  plan.highlight
                    ? "bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white border-0"
                    : plan.name === "Seller"
                    ? "bg-gradient-to-r from-primary-glow to-primary hover:from-primary-glow/90 hover:to-primary/90 text-white border-0"
                    : "bg-secondary hover:bg-secondary/80"
                }`}>
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Full Feature Comparison Table */}
      <section className="relative z-10 px-4 sm:px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Complete Feature Comparison</h2>
            <p className="mt-2 text-muted-foreground">See everything that's included in each plan</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-primary/5">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[40%]">Features</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">
                      <div>Tester</div>
                      <div className="text-[10px] font-normal mt-0.5 text-muted-foreground/60">Free</div>
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-primary w-[20%]">
                      <div>Developer</div>
                      <div className="text-[10px] font-normal mt-0.5 text-primary/60">${yearly ? "14.99/yr" : "2.99/mo"}</div>
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-primary-glow w-[20%]">
                      <div>Seller</div>
                      <div className="text-[10px] font-normal mt-0.5 text-primary-glow/60">${yearly ? "24.99/yr" : "4.99/mo"}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_TABLE.map((section) => (
                    <>
                      <tr key={section.category} className="bg-primary/[0.03]">
                        <td colSpan={4} className="px-5 py-2.5 text-xs font-semibold text-primary uppercase tracking-wider">{section.category}</td>
                      </tr>
                      {section.rows.map((row, ri) => (
                        <tr key={row.name} className={`border-b border-border/20 transition-colors hover:bg-primary/[0.04] ${ri % 2 === 0 ? "" : "bg-primary/[0.01]"}`}>
                          <td className="px-5 py-3 text-foreground/80 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-center"><CellDisplay value={row.tester} /></td>
                          <td className="px-4 py-3 text-center"><CellDisplay value={row.developer} /></td>
                          <td className="px-4 py-3 text-center"><CellDisplay value={row.seller} /></td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="relative z-10 px-4 sm:px-6 pb-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <div className="flex items-start gap-3">
            <span className="text-yellow-500 text-lg">⚠</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground mb-2">Important: We are an authentication service, not a code obfuscator</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs">
                <li><strong className="text-foreground/80">What we provide:</strong> License/key management, HWID binding, server-side validation, rate limiting, webhooks, and admin controls.</li>
                <li><strong className="text-foreground/80">What we do not do:</strong> Code obfuscation, anti-debug/anti-tamper inside your binaries, or DRM for compiled code.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 sm:px-6 pb-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs text-muted-foreground">All yearly plans include a 14-day money-back guarantee. No credit card required for free plan.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} GrazeXauth</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}