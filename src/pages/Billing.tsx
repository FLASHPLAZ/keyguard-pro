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
import { CheckCircle2, Minus, Crown, Calendar, AlertTriangle, ArrowUpRight, AppWindow, Key, Users, ShieldCheck, Sparkles } from "lucide-react";

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
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const planKey = (data?.plan ?? "free") as keyof typeof PLAN_FEATURES;
  const planInfo = PLAN_FEATURES[planKey] ?? PLAN_FEATURES.free;
  const expired = !!data?.expired;
  const expiresAt = data?.plan_expires_at ? new Date(data.plan_expires_at) : null;
  const lifetime = !expiresAt;

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
          </div>
        )}
      </PageTransition>
    </RoleLayout>
  );
}
