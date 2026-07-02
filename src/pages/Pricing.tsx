import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, CheckCircle2, ArrowRight, Sparkles, X, Crown } from "lucide-react";
import { motion } from "framer-motion";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Try the platform with limited features",
    cta: "Get Started",
    ctaLink: "/signup",
    highlight: false,
    color: "border-border/50",
    features: [
      { text: "1 Application", ok: true },
      { text: "25 License Keys (total)", ok: true },
      { text: "HWID Binding", ok: true },
      { text: "Standard API access", ok: true },
      { text: "Community support", ok: true },
      { text: "Resellers & Managers", ok: false },
      { text: "Discord Webhook alerts", ok: false },
      { text: "Advanced Analytics", ok: false },
      { text: "Priority Support", ok: false },
    ],
  },
  {
    name: "Lifetime",
    price: "$49",
    priceSuffix: "one-time",
    subtitle: "Pay once. Every feature. Forever.",
    cta: "Get Lifetime Access",
    ctaLink: "/signup",
    highlight: true,
    color: "border-primary/60",
    features: [
      { text: "Unlimited Applications", ok: true },
      { text: "Unlimited License Keys", ok: true },
      { text: "HWID Binding + Anti-sharing", ok: true },
      { text: "Full API + Webhooks", ok: true },
      { text: "Resellers & Managers", ok: true },
      { text: "Discord Webhook alerts", ok: true },
      { text: "Advanced Analytics & Logs", ok: true },
      { text: "Priority Support", ok: true },
      { text: "Free updates forever", ok: true },
    ],
  },
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

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
          All plans include HWID binding, HMAC-signed API, IP tracking, and auto-ban protection. Lifetime is a one-time payment — no subscriptions, no renewals.
        </p>
      </section>
    </div>
  );
}