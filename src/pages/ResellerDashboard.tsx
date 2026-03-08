import { useEffect, useState } from "react";
import { ResellerLayout } from "@/components/ResellerLayout";
import { StatCard } from "@/components/StatCard";
import { formatDate, getLicenseStatusColor } from "@/lib/license";
import { Key, CheckCircle, CreditCard, AppWindow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ResellerDashboard() {
  const { user } = useAuth();
  const [reseller, setReseller] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [allowedApps, setAllowedApps] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Get reseller record
      const { data: resellerData } = await supabase
        .from("resellers")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setReseller(resellerData);

      if (resellerData) {
        // Get allowed apps
        if (resellerData.allowed_apps?.length > 0) {
          const { data: appsData } = await supabase
            .from("applications")
            .select("*")
            .in("id", resellerData.allowed_apps);
          setAllowedApps(appsData || []);
        }

        // Get licenses created by this reseller
        const { data: licData } = await supabase
          .from("licenses")
          .select("*, applications(name)")
          .eq("created_by_reseller", resellerData.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setLicenses(licData || []);
      }
    };
    fetchData();
  }, [user]);

  const activeLicenses = licenses.filter(l => l.status === "active").length;

  return (
    <ResellerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, <span className="text-primary">{reseller?.username || "Reseller"}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Your reseller dashboard overview</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Credits Left" value={reseller?.credits || 0} icon={CreditCard} />
        <StatCard title="Total Generated" value={reseller?.total_generated || 0} icon={Key} />
        <StatCard title="Active Licenses" value={activeLicenses} icon={CheckCircle} />
        <StatCard title="Allowed Apps" value={allowedApps.length} icon={AppWindow} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Allowed Applications</h3>
          {allowedApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications assigned yet</p>
          ) : (
            <div className="space-y-2">
              {allowedApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.description}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${app.kill_switch ? "badge-banned" : app.suspended ? "badge-suspended" : "badge-active"}`}>
                    {app.kill_switch ? "Killed" : app.suspended ? "Suspended" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Generated Keys</h3>
          {licenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys generated yet</p>
          ) : (
            <div className="space-y-2">
              {licenses.slice(0, 5).map((lic) => (
                <div key={lic.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2.5">
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
