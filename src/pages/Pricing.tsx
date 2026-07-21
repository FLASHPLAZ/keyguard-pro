import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, CheckCircle2, Coins, Copy, Crown, Infinity as InfinityIcon, Loader2, Lock, Sparkles, Wallet, X, Zap, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import discordIcon from "@/assets/discord-icon.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
    subtitle: "Same premium features for 30 days with automatic Litecoin tracking.",
    cta: "Pay Monthly",
    highlight: false,
    color: "border-primary/40",
    features: [...premiumFeatures, { text: "Expires after 30 days", ok: true }],
  },
  {
    name: "Lifetime",
    price: "$24.99",
    priceSuffix: "one-time",
    subtitle: "Pay once. Every premium feature stays unlocked forever.",
    cta: "Pay Lifetime",
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
  { q: "How do Litecoin payments work?", a: "Choose a plan, GX Auth creates a unique Litecoin amount, then scans the blockchain and activates your plan after the payment has enough confirmations." },
  { q: "Is Lifetime really one payment?", a: "Yes. Lifetime is $24.99 one-time and has no expiry." },
  { q: "What does Monthly include?", a: "Monthly is $3.99 for 30 days and includes the same premium feature limits as Lifetime." },
  { q: "Can I start free and upgrade later?", a: "Yes. Your apps, keys and logs stay on your account when admin upgrades your plan." },
];

function CompareValue({ value, primary = false }: { value: string | boolean; primary?: boolean }) {
  if (value === true) return <CheckCircle2 className={`mx-auto h-4 w-4 ${primary ? "text-primary" : "text-emerald-400"}`} />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span className={primary ? "font-medium text-primary" : "font-medium text-foreground/80"}>{value}</span>;
}

type CheckoutPayment = {
  payment_id: string;
  order_id: string;
  plan: "monthly" | "lifetime";
  amount: number;
  pay_currency: string;
  pay_address: string;
  pay_amount: string | number;
  payment_status: string;
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayment | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"monthly" | "lifetime" | null>(null);

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard?.writeText(text);
    toast.success(`${label} copied`);
  };

  const requestCheckout = (plan: "monthly" | "lifetime") => {
    if (!user) {
      toast.error("Please sign in before checkout");
      navigate("/login");
      return;
    }
    setPendingPlan(plan);
  };

  const startCheckout = async (plan: "monthly" | "lifetime") => {
    setPendingPlan(null);
    setLoadingPlan(plan);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const checkoutUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-nowpayments-checkout`;
    let data: any = null;
    let errorMessage = "";

    try {
      const response = await fetch(checkoutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan, payCurrency: "ltc" }),
      });
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!response.ok) {
        errorMessage = data?.error || text || `Checkout failed (${response.status})`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Could not reach checkout service";
    }
    setLoadingPlan(null);

    if (errorMessage || data?.error || !data?.pay_address || !data?.pay_amount) {
      toast.error(data?.error || errorMessage || "Could not create Litecoin invoice");
      return;
    }

    setCheckout(data as CheckoutPayment);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/45 shadow-[0_18px_70px_-50px_hsl(var(--primary)/0.75)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/35">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
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
            <Sparkles className="h-3.5 w-3.5" /> Litecoin checkout with auto-tracking
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }} className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Monthly or lifetime. <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Your choice.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Start free, then pay with Litecoin for Monthly or Lifetime access. Your plan unlocks automatically after blockchain confirmation.
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
                  <Button
                    type="button"
                    onClick={() => requestCheckout(plan.name.toLowerCase() as "monthly" | "lifetime")}
                    disabled={loadingPlan === plan.name.toLowerCase()}
                    className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                    size="lg"
                  >
                    {loadingPlan === plan.name.toLowerCase() ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coins className="mr-2 h-4 w-4" />}
                    {plan.cta}
                  </Button>
                  <a href="https://discord.gg/galaticboosts" target="_blank" rel="noreferrer" className="mt-3 block">
                    <Button type="button" variant="outline" className="w-full border-[#5865F2]/40 bg-[#5865F2]/10 hover:bg-[#5865F2]/15" size="lg">
                      <img src={discordIcon} alt="" className="mr-2 h-5 w-5" />
                      Need help? Join Discord
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
            { icon: ShieldCheck, label: "Auto activation" },
            { icon: Zap, label: "Auto blockchain scan" },
            { icon: Lock, label: "Exact LTC invoice" },
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
                <Wallet className="h-3.5 w-3.5" /> Automatic Litecoin flow
              </div>
              <h2 className="text-2xl font-bold">How payment activation works</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                GX Auth creates a unique Litecoin amount, watches your payment address, and activates the plan after the matching transaction reaches the required confirmations.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Checkout process</p>
              <ol className="mt-3 space-y-2 text-sm text-foreground">
                <li>1. Sign in to your GX Auth account.</li>
                <li>2. Choose Monthly or Lifetime on this page.</li>
                <li>3. Send the exact LTC amount to the shown address.</li>
                <li>4. The tracker confirms the transaction and unlocks your plan.</li>
              </ol>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="gap-2" onClick={() => requestCheckout("monthly")} disabled={loadingPlan === "monthly"}>
                  {loadingPlan === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />} Monthly checkout
                </Button>
                <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => requestCheckout("lifetime")} disabled={loadingPlan === "lifetime"}>
                  {loadingPlan === "lifetime" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Lifetime checkout
                </Button>
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
            <p className="mt-2 text-sm text-muted-foreground">Choose Monthly for $3.99 or Lifetime for $24.99. A Litecoin invoice opens instantly.</p>
            <Button type="button" onClick={() => requestCheckout("lifetime")} disabled={loadingPlan === "lifetime"} size="lg" className="mt-5 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
              {loadingPlan === "lifetime" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Unlock Lifetime <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={!!pendingPlan} onOpenChange={(open) => !open && setPendingPlan(null)}>
        <DialogContent className="border-primary/30 bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirm checkout
            </DialogTitle>
            <DialogDescription>
              GX Auth will create one Litecoin invoice and start monitoring that invoice for the exact incoming amount.
            </DialogDescription>
          </DialogHeader>
          {pendingPlan && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected plan</div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold capitalize text-foreground">{pendingPlan}</p>
                    <p className="text-xs text-muted-foreground">
                      {pendingPlan === "monthly" ? "30 days of premium access" : "Premium access with no expiry"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold text-primary">{pendingPlan === "monthly" ? "$3.99" : "$24.99"}</p>
                    <p className="text-xs text-muted-foreground">{pendingPlan === "monthly" ? "per month" : "one-time"}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                After confirmation, copy the exact LTC amount shown on the invoice. Sending a different amount can stop automatic matching.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setPendingPlan(null)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1 bg-gradient-to-r from-primary to-primary-glow" onClick={() => startCheckout(pendingPlan)}>
                  Create invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkout} onOpenChange={(open) => !open && setCheckout(null)}>
        <DialogContent className="border-primary/30 bg-card text-card-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Litecoin invoice created
            </DialogTitle>
            <DialogDescription>
              Send the exact Litecoin amount to this address. GX Auth will detect the transaction and activate your plan after confirmations.
            </DialogDescription>
          </DialogHeader>
          {checkout && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Invoice amount</div>
                <div className="mt-1 flex flex-wrap items-end gap-2">
                  <span className="font-mono text-3xl font-bold text-foreground">{Number(checkout.pay_amount).toFixed(8)}</span>
                  <span className="pb-1 text-sm font-semibold uppercase text-primary">LTC</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Plan: {checkout.plan === "monthly" ? "Monthly $3.99" : "Lifetime $24.99"}.
                  Send exactly this amount so the tracker can match your invoice.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Litecoin address</div>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs break-all">
                    {checkout.pay_address}
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => copyText(checkout.pay_address, "Address")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-border/60 bg-background/60 p-4 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Invoice ID</div>
                  <div className="mt-1 truncate font-mono text-xs">{checkout.payment_id}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1 capitalize text-primary">{checkout.payment_status.replaceAll("_", " ")}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-muted-foreground">Order ID</div>
                  <div className="mt-1 flex gap-2">
                    <div className="min-w-0 flex-1 truncate font-mono text-xs">{checkout.order_id}</div>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => copyText(checkout.order_id, "Order ID")}>Copy</button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link to="/dashboard/billing" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-primary to-primary-glow">View payment status</Button>
                </Link>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCheckout(null)}>
                  I will pay now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
