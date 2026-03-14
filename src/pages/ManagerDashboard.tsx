import { useEffect, useState } from "react";
import { ManagerLayout } from "@/components/ManagerLayout";
import { StatCard } from "@/components/StatCard";
import { AppWindow, Key, CheckCircle, XCircle, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, getLicenseStatusColor } from "@/lib/license";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalApps: 0, totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, bannedLicenses: 0 });
  const [recentLicenses, setRecentLicenses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [appsRes, licensesRes, latestLicRes] = await Promise.all([
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("licenses").select("id, status", { count: "exact" }),
        supabase.from("licenses").select("*, applications(name)").order("created_at", { ascending: false }).limit(5),
      ]);
      const licenses = licensesRes.data || [];
      setStats({
        totalApps: appsRes.count || 0,
        totalLicenses: licensesRes.count || 0,
        activeLicenses: licenses.filter(l => l.status === "active").length,
        expiredLicenses: licenses.filter(l => l.status === "expired").length,
        bannedLicenses: licenses.filter(l => l.status === "banned").length,
      });
      setRecentLicenses(latestLicRes.data || []);
    };
    fetchData();
  }, [user]);

  return (
    <ManagerLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of the license management system</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard title="Total Apps" value={stats.totalApps} icon={AppWindow} />
        <StatCard title="Total Licenses" value={stats.totalLicenses} icon={Key} />
        <StatCard title="Active" value={stats.activeLicenses} icon={CheckCircle} />
        <StatCard title="Expired" value={stats.expiredLicenses} icon={XCircle} />
        <StatCard title="Banned" value={stats.bannedLicenses} icon={Ban} />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Latest Licenses</h3>
        <div className="space-y-3">
          {recentLicenses.length === 0 && <p className="text-sm text-muted-foreground">No licenses yet</p>}
          {recentLicenses.map((lic: any) => (
            <div key={lic.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2.5 transition-all duration-200 hover:bg-secondary/50">
              <div className="min-w-0">
                <p className="license-key truncate">{lic.license_key}</p>
                <p className="text-xs text-muted-foreground">{lic.applications?.name || "Unknown"}</p>
              </div>
              <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                {lic.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ManagerLayout>
  );
}
