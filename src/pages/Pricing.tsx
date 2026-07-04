import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, CheckCircle2, ArrowRight, Sparkles, X, Crown, ShieldCheck, Infinity as InfinityIcon, Zap, Lock } from "lucide-react";
import { motion } from "framer-motion";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    priceSuffix: "forever",
    subtitle: "Everything you need to launch your first licensed app.",
    cta: "Get Started",
    ctaLink: "/signup",
    highlight: false,
    color: "border-border/50",
    features: [
      { text: "1 Application", ok: true },
      { text: "25 License Keys (total)", ok: true },
      { text: "HWID Binding & Anti-Sharing", ok: true },
      { text: "Full Validation & Heartbeat API", ok: true },
      { text: "HMAC-signed requests", ok: true },
      { text: "Community support", ok: true },
      { text: "Resellers & Managers", ok: false },
      { text: "Personal Discord webhook", ok: false },
      { text: "Advanced logs & analytics", ok: false },
      { text: "Priority support", ok: false },
    ],
  },
  {
    name: "Lifetime",
    price: "$49",
    priceSuffix: "one-time",
    subtitle: "Pay once. Every feature, every future update — yours forever.",
    cta: "Get Lifetime Access",
    ctaLink: "/signup",
    highlight: true,
    color: "border-primary/60",
    features: [
      { text: "Unlimited Applications", ok: true },
      { text: "Unlimited License Keys", ok: true },
      { text: "Unlimited Resellers & Managers", ok: true },
      { text: "HWID Binding & Anti-Sharing", ok: true },
      { text: "Full API + Webhooks + Discord Bot", ok: true },
      { text: "HMAC-signed requests", ok: true },
      { text: "Personal Discord webhook logs", ok: true },
      { text: "Advanced logs & analytics", ok: true },
      { text: "Priority support", ok: true },
      { text: "Free updates forever", ok: true },
    ],
  },
];

const COMPARE_ROWS: { label: string; free: string | boolean; lifetime: string | boolean }[] = [
  { label: "Applications", free: "1", lifetime: "Unlimited" },
  { label: "License keys", free: "25", lifetime: "Unlimited" },
  { label: "Resellers", free: false, lifetime: "Unlimited" },
  { label: "Managers", free: false, lifetime: "Unlimited" },
  { label: "HWID binding & anti-sharing", free: true, lifetime: true },
  { label: "Validation & heartbeat API", free: true, lifetime: true },
  { label: "HMAC request signing", free: true, lifetime: true },
  { label: "Discord bot integration", free: false, lifetime: true },
  { label: "Personal Discord webhook", free: false, lifetime: true },
  { label: "Advanced analytics & logs", free: false, lifetime: true },
  { label: "Priority support", free: false, lifetime: true },
  { label: "Free lifetime updates", free: false, lifetime: true },
];

const FAQS = [
  { q: "Is Lifetime really a single payment?", a: "Yes. Pay $49 once — no monthly bill, no seat fees, no per-app charges. Every current and future core feature is included forever." },
  { q: "Can I start free and upgrade later?", a: "Absolutely. Every account starts on Free. When you're ready, upgrade to Lifetime and all your existing apps, keys, resellers and logs carry over instantly." },
  { q: "Do you offer refunds?", a: "If the platform doesn't work for you, contact support within 7 days of purchase and we'll issue a full refund — no questions asked." },
  { q: "What happens if I hit the Free limit?", a: "Creation calls return a friendly upgrade prompt. Existing keys keep working — your users are never affected, only new key generation is paused until you upgrade." },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold">GrazeXauth</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-primary hover:bg-primary/90">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 pt-16 pb-10 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" /> Simple pricing — no subscriptions
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
          >
            One price. <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Lifetime access.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            Start free and upgrade once to unlock everything, forever. No monthly fees, no hidden limits.
          </motion.p>
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
              className={`relative rounded-2xl border ${plan.color} bg-card/60 p-7 backdrop-blur-sm ${
                plan.highlight ? "shadow-[0_0_60px_-15px_hsl(var(--primary)/0.6)]" : ""
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-4 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                  MOST POPULAR
                </div>
              )}
              <div className="mb-2 flex items-center gap-2">
                {plan.highlight ? (
                  <Crown className="h-5 w-5 text-primary" />
                ) : (
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                )}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">{plan.subtitle}</p>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                {plan.priceSuffix && (
                  <span className="text-sm font-medium text-muted-foreground">{plan.priceSuffix}</span>
                )}
              </div>
              <Link to={plan.ctaLink} className="block">
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                  size="lg"
                >
                  {plan.cta} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <ul className="mt-7 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5">
                    {f.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className={f.ok ? "text-foreground" : "text-muted-foreground/60 line-through"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: InfinityIcon, label: "No renewals" },
            { icon: ShieldCheck, label: "7-day money back" },
            { icon: Zap, label: "Instant activation" },
            { icon: Lock, label: "Secure Paddle checkout" },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/40 px-3 py-3 text-xs text-muted-foreground">
              <t.icon className="h-4 w-4 text-primary" />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Full feature comparison */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Full feature comparison</h2>
            <p className="mt-2 text-sm text-muted-foreground">Everything on the platform, side by side.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/40">
                  <th className="px-5 py-4 text-left font-medium text-muted-foreground">Feature</th>
                  <th className="px-5 py-4 text-center font-medium text-muted-foreground">Free</th>
                  <th className="px-5 py-4 text-center font-medium text-primary">Lifetime</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.label} className={`border-b border-border/30 ${i % 2 === 0 ? "bg-primary/[0.015]" : ""}`}>
                    <td className="px-5 py-3 text-foreground/90">{row.label}</td>
                    <td className="px-5 py-3 text-center text-xs">
                      {row.free === true ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /> :
                       row.free === false ? <X className="mx-auto h-4 w-4 text-muted-foreground/40" /> :
                       <span className="font-medium text-foreground/80">{row.free}</span>}
                    </td>
                    <td className="px-5 py-3 text-center text-xs">
                      {row.lifetime === true ? <CheckCircle2 className="mx-auto h-4 w-4 text-primary" /> :
                       row.lifetime === false ? <X className="mx-auto h-4 w-4 text-muted-foreground/40" /> :
                       <span className="font-medium text-primary">{row.lifetime}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Frequently asked</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-xl border border-border/50 bg-card/40 p-5">
                <div className="font-semibold text-foreground text-sm mb-1.5">{f.q}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center">
            <Crown className="mx-auto h-6 w-6 text-primary mb-3" />
            <h3 className="text-xl font-bold">Ready to own it forever?</h3>
            <p className="mt-2 text-sm text-muted-foreground">One payment, every feature, no expiration.</p>
            <Link to="/signup" className="mt-5 inline-block">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
                Get Lifetime — $49 <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}