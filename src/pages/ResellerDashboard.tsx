import { useEffect, useState } from "react";
import { ResellerLayout } from "@/components/ResellerLayout";
import { StatCard } from "@/components/StatCard";
import { formatDate, getLicenseStatusColor } from "@/lib/license";
import { Key, CheckCircle, CreditCard, AppWindow, Clock, Ban } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ResellerDashboard() {
  const { user } = useAuth();
  const [reseller, setReseller] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [allowedApps, setAllowedApps] = useState<any[]>([]);
  const [appCredits, setAppCredits] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: resellerData } = await supabase
        .from("resellers").select("*").eq("user_id", user.id).single();
      setReseller(resellerData);

      if (resellerData) {
        const [appsRes, licRes, creditsRes] = await Promise.all([
          resellerData.allowed_apps?.length > 0
            ? supabase.from("applications").select("*").in("id", resellerData.allowed_apps)
            : Promise.resolve({ data: [] }),
          supabase.from("licenses").select("*, applications(name)")
            .eq("created_by_reseller", resellerData.id)
            .order("created_at", { ascending: false }).limit(1000),
          supabase.from("reseller_app_credits").select("*").eq("reseller_id", resellerData.id),
        ]);
        setAllowedApps(appsRes.data || []);
        setLicenses(licRes.data || []);
        setAppCredits(creditsRes.data || []);
      }
    };
    fetchData();
  }, [user]);

  const activeLicenses = licenses.filter(l => l.status === "active").length;
  const totalCredits = appCredits.reduce((sum, c) => sum + (c.credits || 0), 0);
  const totalGenerated = appCredits.reduce((sum, c) => sum + (c.total_generated || 0), 0);

  const getAppStats = (appId: string) => {
    const credit = appCredits.find(c => c.application_id === appId);
    const appLicenses = licenses.filter(l => l.application_id === appId);
    const generated = credit?.total_generated || 0;
    const remaining = credit?.credits || 0;
    const limit = remaining + generated; // total quota originally assigned
    const unused = appLicenses.filter(l => l.status === "unused" && !l.banned).length;
    const active = appLicenses.filter(l => l.status === "active" && !l.banned).length;
    const banned = appLicenses.filter(l => l.banned).length;
    return { remaining, generated, limit, unused, active, banned };
  };

  return (
    <ResellerLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Welcome, <span className="text-primary">{reseller?.username || "Reseller"}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Your reseller dashboard overview</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title="Credits Remaining" value={totalCredits} icon={CreditCard} />
        <StatCard title="Keys Generated" value={totalGenerated} icon={Key} />
        <StatCard title="Active Licenses" value={activeLicenses} icon={CheckCircle} />
        <StatCard title="Allowed Apps" value={allowedApps.length} icon={AppWindow} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Per-App Quota Dashboard */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Quota Per Application</h3>
          <p className="mb-4 text-xs text-muted-foreground">Live limits, remaining credits, and key status per app</p>
          {allowedApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications assigned yet</p>
          ) : (
            <div className="space-y-3">
              {allowedApps.map((app) => {
                const s = getAppStats(app.id);
                const usedPct = s.limit > 0 ? Math.min(100, (s.generated / s.limit) * 100) : 0;
                return (
                  <div key={app.id} className="rounded-lg border border-border/60 bg-secondary/20 p-3.5 transition-all hover:bg-secondary/40">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{app.name}</p>
                        {app.description && <p className="text-xs text-muted-foreground truncate">{app.description}</p>}
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${app.kill_switch ? "badge-banned" : app.suspended ? "badge-suspended" : "badge-active"}`}>
                        {app.kill_switch ? "Killed" : app.suspended ? "Suspended" : "Active"}
                      </span>
                    </div>

                    <div className="mb-2 flex items-end justify-between text-xs">
                      <span className="text-muted-foreground">
                        Used <span className="font-mono font-semibold text-foreground">{s.generated}</span> / {s.limit > 0 ? <span className="font-mono">{s.limit}</span> : <span className="font-mono">∞</span>}
                      </span>
                      <span className="font-mono font-bold text-primary">{s.remaining} left</span>
                    </div>
                    <Progress value={usedPct} className="h-1.5" />

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-background/60 px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> Unused</div>
                        <p className="font-mono text-sm font-bold text-amber-400">{s.unused}</p>
                      </div>
                      <div className="rounded-md bg-background/60 px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><CheckCircle className="h-3 w-3" /> Active</div>
                        <p className="font-mono text-sm font-bold text-emerald-400">{s.active}</p>
                      </div>
                      <div className="rounded-md bg-background/60 px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><Ban className="h-3 w-3" /> Banned</div>
                        <p className="font-mono text-sm font-bold text-destructive">{s.banned}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Keys */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Generated Keys</h3>
          {licenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys generated yet</p>
          ) : (
            <div className="space-y-2">
              {licenses.slice(0, 5).map((lic) => (
                <div key={lic.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2.5 transition-all duration-200 hover:bg-secondary/50">
                  <div className="min-w-0">
                    <p className="license-key truncate text-xs">{lic.license_key}</p>
                    <p className="text-xs text-muted-foreground">{lic.applications?.name} · {formatDate(lic.created_at)}</p>
                  </div>
                  <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                    {lic.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResellerLayout>
  );
}
