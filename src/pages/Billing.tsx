import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RoleLayout } from "@/components/RoleLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CheckCircle2, Minus, Crown, Calendar, AlertTriangle, ArrowUpRight, AppWindow, Key, Users, ShieldCheck, Sparkles, Receipt, Copy } from "lucide-react";

type PaymentTransaction = {
  id: string;
  plan: string;
  status: string;
  order_id: string;
  payment_url: string | null;
  pay_address: string | null;
  pay_amount: number | null;
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  created_at: string;
};

const PLAN_FEATURES: Record<string, { label: string; tagline: string; perks: { name: string; on: boolean }[] }> = {
  free: {
    label: "Free",
    tagline: "Try the platform with limited features.",
    perks: [
      { name: "1 Application", on: true },
      { name: "25 license keys", on: true },
      { name: "HWID protection", on: true },
      { name: "Account logs", on: true },
      { name: "Resellers / Managers", on: false },
      { name: "Webhooks & Live analytics", on: false },
      { name: "Discord / Telegram bot", on: false },
      { name: "Priority support", on: false },
    ],
  },
  lifetime: {
    label: "Lifetime",
    tagline: "Every feature unlocked, forever. One-time payment.",
    perks: [
      { name: "Unlimited Applications", on: true },
      { name: "Unlimited license keys", on: true },
      { name: "Unlimited Resellers & Managers", on: true },
      { name: "HWID + anti-sharing + auto-ban", on: true },
      { name: "Discord Webhook alerts", on: true },
      { name: "Advanced analytics & full logs", on: true },
      { name: "HMAC-signed API + Webhooks", on: true },
      { name: "Priority support", on: true },
    ],
  },
  monthly: {
    label: "Monthly",
    tagline: "Premium access for 30 days.",
    perks: [
      { name: "Unlimited Applications", on: true },
      { name: "Unlimited license keys", on: true },
      { name: "Unlimited Resellers & Managers", on: true },
      { name: "HWID + anti-sharing + auto-ban", on: true },
      { name: "Discord Webhook alerts", on: true },
      { name: "Advanced analytics & full logs", on: true },
      { name: "HMAC-signed API + Webhooks", on: true },
      { name: "Priority support", on: true },
    ],
  },
  platform: {
    label: "Platform (Staff)",
    tagline: "Internal platform account with full access.",
    perks: [
      { name: "Everything in Lifetime", on: true },
      { name: "Admin control center", on: true },
    ],
  },
};

function UsageBar({ icon: Icon, label, used, limit }: { icon: any; label: string; used: number; limit: number | "unlimited" | string }) {
  const isUnlimited = limit === "unlimited" || limit === "∞";
  const limitNum = typeof limit === "number" ? limit : 0;
  const pct = isUnlimited ? 5 : Math.min(100, limitNum > 0 ? (used / limitNum) * 100 : 0);
  const over = !isUnlimited && limitNum > 0 && used >= limitNum;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-foreground/80">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium">{label}</span>
        </div>
        <span className={`font-mono text-xs ${over ? "text-destructive" : "text-muted-foreground"}`}>
          {used} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      <Progress value={pct} className={`h-1.5 ${over ? "[&>div]:bg-destructive" : ""}`} />
    </div>
  );
}

export default function Billing() {
  const { data, loading, refresh, daysRemaining } = usePlanLimits();
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!user) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }

    setPaymentsLoading(true);
    supabase
      .from("payment_transactions" as any)
      .select("id, plan, status, order_id, payment_url, pay_address, pay_amount, price_amount, price_currency, pay_currency, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setPayments((data || []) as PaymentTransaction[]);
        setPaymentsLoading(false);
      });
  }, [user]);

  const planKey = (data?.plan ?? "free") as keyof typeof PLAN_FEATURES;
  const planInfo = PLAN_FEATURES[planKey] ?? PLAN_FEATURES.free;
  const expired = !!data?.expired;
  const expiresAt = data?.plan_expires_at ? new Date(data.plan_expires_at) : null;
  const lifetime = !expiresAt;
  const copyText = async (text: string, label: string) => {
    await navigator.clipboard?.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <RoleLayout>
      <PageTransition>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" /> Your Plan & Billing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track your subscription, usage, and unlocked features.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>Refresh</Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Current plan card */}
            <Card className="lg:col-span-2 border-primary/40 bg-gradient-to-br from-primary/[0.06] to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{planInfo.label}</CardTitle>
                      {expired ? (
                        <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-emerald-400 border-emerald-400/30">Active</Badge>
                      )}
                      {data?.suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{planInfo.tagline}</p>
                  </div>
                  <Link to="/pricing">
                    <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-primary-glow text-white border-0">
                      Upgrade <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {lifetime ? (
                      <span><span className="text-muted-foreground">Billing:</span> <strong>Lifetime / No expiry</strong></span>
                    ) : (
                      <span>
                        <span className="text-muted-foreground">Renews / expires:</span>{" "}
                        <strong>{expiresAt!.toLocaleDateString()}</strong>
                      </span>
                    )}
                  </div>
                  {!lifetime && daysRemaining !== null && (
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${daysRemaining <= 7 ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border/60 bg-card"}`}>
                      {daysRemaining <= 7 && <AlertTriangle className="h-4 w-4" />}
                      <strong>{daysRemaining}</strong>
                      <span className="text-muted-foreground">day{daysRemaining === 1 ? "" : "s"} remaining</span>
                    </div>
                  )}
                  {data?.billing_cycle && data.billing_cycle !== "lifetime" && (
                    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                      {data.billing_cycle}
                    </div>
                  )}
                </div>

                {expired && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    Your subscription expired. You've been temporarily downgraded to the Free tier — upgrade to restore your features.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <UsageBar icon={AppWindow} label="Applications" used={data?.usage.apps ?? 0} limit={data?.limits.apps ?? 0} />
                  <UsageBar icon={Key} label="License Keys" used={data?.usage.keys ?? 0} limit={data?.limits.keys ?? 0} />
                  <UsageBar icon={Users} label="Resellers" used={data?.usage.resellers ?? 0} limit={data?.limits.resellers ?? 0} />
                  <UsageBar icon={ShieldCheck} label="Managers" used={data?.usage.managers ?? 0} limit={data?.limits.managers ?? 0} />
                </div>
              </CardContent>
            </Card>

            {/* Features unlocked */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {planInfo.perks.map((p) => (
                    <li key={p.name} className="flex items-start gap-2 text-sm">
                      {p.on ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Minus className="h-4 w-4 mt-0.5 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={p.on ? "text-foreground/90" : "text-muted-foreground line-through"}>{p.name}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Compare all plans <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" /> Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    No payment invoices yet. Choose a plan on the pricing page to create a NOWPayments checkout.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <th className="py-3 pr-4 font-medium">Plan</th>
                          <th className="py-3 pr-4 font-medium">Amount</th>
                          <th className="py-3 pr-4 font-medium">Status</th>
                          <th className="py-3 pr-4 font-medium">LTC Payment</th>
                          <th className="py-3 pr-4 font-medium">Created</th>
                          <th className="py-3 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id} className="border-b border-border/30 last:border-0">
                            <td className="py-3 pr-4 font-medium capitalize">{payment.plan}</td>
                            <td className="py-3 pr-4 font-mono text-xs">
                              ${Number(payment.price_amount).toFixed(2)} {payment.price_currency?.toUpperCase()} / {payment.pay_currency?.toUpperCase()}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant={["finished", "confirmed"].includes(payment.status) ? "secondary" : "outline"} className={["finished", "confirmed"].includes(payment.status) ? "text-emerald-400 border-emerald-400/30" : ""}>
                                {payment.status || "created"}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4">
                              {payment.pay_address ? (
                                <div className="max-w-[260px] space-y-1">
                                  <div className="font-mono text-xs text-foreground">
                                    {payment.pay_amount ? `${payment.pay_amount} ${payment.pay_currency?.toUpperCase()}` : payment.pay_currency?.toUpperCase()}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyText(payment.pay_address!, "Litecoin address")}
                                    className="flex max-w-full items-center gap-1 text-left font-mono text-[11px] text-muted-foreground hover:text-primary"
                                    title={payment.pay_address}
                                  >
                                    <span className="truncate">{payment.pay_address}</span>
                                    <Copy className="h-3 w-3 shrink-0" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Waiting</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              {new Date(payment.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 text-right">
                              {payment.payment_url ? (
                                <a href={payment.payment_url} target="_blank" rel="noreferrer">
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    Open <ArrowUpRight className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              ) : (
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyText(payment.order_id, "Order ID")}>
                                  Copy order <Copy className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </PageTransition>
    </RoleLayout>
  );
}
