import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Coins, Copy, Crown, ExternalLink, Infinity as InfinityIcon, Lock, Sparkles, Wallet, X, Zap, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import discordIcon from "@/assets/discord-icon.png";

const premiumFeatures = [
  { text: "Unlimited Applications", ok: true },
  { text: "Unlimited License Keys", ok: true },
  { text: "Unlimited Resellers & Managers", ok: true },
  { text: "HWID Binding & Anti-Sharing", ok: true },
  { text: "Full API + Webhooks + Discord Bot", ok: true },
  { text: "Advanced logs & analytics", ok: true },
  { text: "Priority support", ok: true },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    priceSuffix: "forever",
    subtitle: "Everything you need to launch your first licensed app.",
    cta: "Get Started",
    highlight: false,
    color: "border-border/50",
    features: [
      { text: "1 Application", ok: true },
      { text: "25 License Keys", ok: true },
      { text: "HWID Binding & Anti-Sharing", ok: true },
      { text: "Validation & Heartbeat API", ok: true },
      { text: "Resellers & Managers", ok: false },
      { text: "Advanced logs & analytics", ok: false },
    ],
  },
  {
    name: "Monthly",
    price: "$3.99",
    priceSuffix: "per month",
    subtitle: "Same premium features for 30 days. Good for testing the full platform.",
    cta: "Request Monthly Invoice",
    highlight: false,
    color: "border-primary/40",
    features: [...premiumFeatures, { text: "Expires after 30 days", ok: true }],
  },
  {
    name: "Lifetime",
    price: "$24.99",
    priceSuffix: "one-time",
    subtitle: "Pay once. Every premium feature stays unlocked forever.",
    cta: "Request Lifetime Invoice",
    highlight: true,
    color: "border-primary/70",
    features: [...premiumFeatures, { text: "No renewal or expiry", ok: true }],
  },
];

const COMPARE_ROWS: { label: string; free: string | boolean; monthly: string | boolean; lifetime: string | boolean }[] = [
  { label: "Applications", free: "1", monthly: "Unlimited", lifetime: "Unlimited" },
  { label: "License keys", free: "25", monthly: "Unlimited", lifetime: "Unlimited" },
  { label: "Resellers", free: false, monthly: "Unlimited", lifetime: "Unlimited" },
  { label: "Managers", free: false, monthly: "Unlimited", lifetime: "Unlimited" },
  { label: "HWID binding & anti-sharing", free: true, monthly: true, lifetime: true },
  { label: "Validation & heartbeat API", free: true, monthly: true, lifetime: true },
  { label: "Discord bot integration", free: false, monthly: true, lifetime: true },
  { label: "Advanced analytics & logs", free: false, monthly: true, lifetime: true },
  { label: "Renewal", free: "None", monthly: "30 days", lifetime: "Never" },
];

const FAQS = [
  { q: "How do Litecoin payments work?", a: "Join Discord, request a Monthly or Lifetime Litecoin invoice, pay it, then send your transaction hash and account email. Admin grants the plan after confirmation." },
  { q: "Is Lifetime really one payment?", a: "Yes. Lifetime is $24.99 one-time and has no expiry." },
  { q: "What does Monthly include?", a: "Monthly is $3.99 for 30 days and includes the same premium feature limits as Lifetime." },
  { q: "Can I start free and upgrade later?", a: "Yes. Your apps, keys and logs stay on your account when admin upgrades your plan." },
];

function CompareValue({ value, primary = false }: { value: string | boolean; primary?: boolean }) {
  if (value === true) return <CheckCircle2 className={`mx-auto h-4 w-4 ${primary ? "text-primary" : "text-emerald-400"}`} />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span className={primary ? "font-medium text-primary" : "font-medium text-foreground/80"}>{value}</span>;
}

export default function Pricing() {
  const manualInstructions = "Open https://discord.gg/galaticboosts and request a GX Auth Litecoin invoice. Include your GX Auth account email and desired plan: Monthly $3.99 or Lifetime $24.99.";

  const copyManualInstructions = () => {
    navigator.clipboard?.writeText(manualInstructions);
    toast.success("Manual payment instructions copied");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-primary hover:bg-primary/90">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      <section className="relative px-4 pt-16 pb-10 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Litecoin payments with manual approval
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }} className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Monthly or lifetime. <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Your choice.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Start free, then request a Litecoin invoice for Monthly or Lifetime access. Admin activates your plan after payment proof.
          </motion.p>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
              className={`relative rounded-2xl border ${plan.color} bg-card/60 p-7 backdrop-blur-sm ${plan.highlight ? "shadow-[0_0_60px_-15px_hsl(var(--primary)/0.6)]" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-4 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                  BEST VALUE
                </div>
              )}
              <div className="mb-2 flex items-center gap-2">
                {plan.highlight ? <Crown className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5 text-muted-foreground" />}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
              </div>
              <p className="mb-5 min-h-[40px] text-sm text-muted-foreground">{plan.subtitle}</p>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                <span className="text-sm font-medium text-muted-foreground">{plan.priceSuffix}</span>
              </div>

              {plan.name === "Free" ? (
                <Link to="/signup" className="block">
                  <Button className="w-full" variant="outline" size="lg">
                    {plan.cta} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Button type="button" onClick={copyManualInstructions} className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90" size="lg">
                    <Coins className="mr-2 h-4 w-4" />
                    {plan.cta}
                  </Button>
                  <a href="https://discord.gg/galaticboosts" target="_blank" rel="noreferrer" className="mt-3 block">
                    <Button type="button" variant="outline" className="w-full border-[#5865F2]/40 bg-[#5865F2]/10 hover:bg-[#5865F2]/15" size="lg">
                      <img src={discordIcon} alt="" className="mr-2 h-5 w-5" />
                      Send proof in Discord
                    </Button>
                  </a>
                </>
              )}

              <ul className="mt-7 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2.5">
                    {feature.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />}
                    <span className={feature.ok ? "text-foreground" : "text-muted-foreground/60 line-through"}>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: InfinityIcon, label: "Lifetime available" },
            { icon: ShieldCheck, label: "Manual verification" },
            { icon: Zap, label: "Fast admin approval" },
            { icon: Lock, label: "Litecoin invoice proof" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/40 px-3 py-3 text-xs text-muted-foreground">
              <item.icon className="h-4 w-4 text-primary" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-primary/30 bg-card/55 p-6 backdrop-blur-sm">
          <div className="grid gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Wallet className="h-3.5 w-3.5" /> Manual Litecoin flow
              </div>
              <h2 className="text-2xl font-bold">How manual activation works</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Because this Lovable Supabase project does not expose service-role access, manual approval is the clean payment path right now.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Manual process</p>
              <ol className="mt-3 space-y-2 text-sm text-foreground">
                <li>1. Create an account and keep your email ready.</li>
                <li>2. Request a Monthly or Lifetime Litecoin invoice in Discord.</li>
                <li>3. Pay and send the transaction hash.</li>
                <li>4. Admin grants the plan after confirmation.</li>
              </ol>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="gap-2" onClick={copyManualInstructions}>
                  <Copy className="h-4 w-4" /> Copy steps
                </Button>
                <a href="https://discord.gg/galaticboosts" target="_blank" rel="noreferrer">
                  <Button type="button" className="w-full gap-2 sm:w-auto">
                    Discord <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
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
                  <th className="px-5 py-4 text-center font-medium text-primary">Monthly</th>
                  <th className="px-5 py-4 text-center font-medium text-primary">Lifetime</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.label} className={`border-b border-border/30 ${i % 2 === 0 ? "bg-primary/[0.015]" : ""}`}>
                    <td className="px-5 py-3 text-foreground/90">{row.label}</td>
                    <td className="px-5 py-3 text-center text-xs"><CompareValue value={row.free} /></td>
                    <td className="px-5 py-3 text-center text-xs"><CompareValue value={row.monthly} primary /></td>
                    <td className="px-5 py-3 text-center text-xs"><CompareValue value={row.lifetime} primary /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Frequently asked</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-border/50 bg-card/40 p-5">
                <div className="font-semibold text-foreground text-sm mb-1.5">{faq.q}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center">
            <Crown className="mx-auto h-6 w-6 text-primary mb-3" />
            <h3 className="text-xl font-bold">Ready to unlock premium?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Choose Monthly for $3.99 or Lifetime for $24.99.</p>
            <Button type="button" onClick={copyManualInstructions} size="lg" className="mt-5 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
              Copy Litecoin invoice steps <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
