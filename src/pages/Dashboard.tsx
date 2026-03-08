import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { formatDate, getLicenseStatusColor } from "@/lib/license";
import { AppWindow, Key, CheckCircle, XCircle, Ban, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalApps: 0, totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, bannedLicenses: 0, totalResellers: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [recentLicenses, setRecentLicenses] = useState<any[]>([]);
  const [resellerStats, setResellerStats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [appsRes, licensesRes, resellersRes, logsRes, latestLicRes, resellerDetailRes] = await Promise.all([
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("licenses").select("id, status", { count: "exact" }),
        supabase.from("resellers").select("id", { count: "exact", head: true }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("licenses").select("*, applications(name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("resellers").select("*").order("created_at", { ascending: false }),
      ]);

      const licenses = licensesRes.data || [];
      setStats({
        totalApps: appsRes.count || 0,
        totalLicenses: licensesRes.count || 0,
        activeLicenses: licenses.filter(l => l.status === "active").length,
        expiredLicenses: licenses.filter(l => l.status === "expired").length,
        bannedLicenses: licenses.filter(l => l.status === "banned").length,
        totalResellers: resellersRes.count || 0,
      });
      setRecentLogs(logsRes.data || []);
      setRecentLicenses(latestLicRes.data || []);
      setResellerStats(resellerDetailRes.data || []);
    };
    fetchData();
  }, [user]);

  const barData = [
    { name: "Mon", validations: 45 },
    { name: "Tue", validations: 62 },
    { name: "Wed", validations: 38 },
    { name: "Thu", validations: 71 },
    { name: "Fri", validations: 55 },
    { name: "Sat", validations: 29 },
    { name: "Sun", validations: 18 },
  ];

  const pieData = [
    { name: "Active", value: stats.activeLicenses || 1, color: "hsl(142, 72%, 45%)" },
    { name: "Expired", value: stats.expiredLicenses || 1, color: "hsl(0, 72%, 55%)" },
    { name: "Banned", value: stats.bannedLicenses || 1, color: "hsl(38, 92%, 55%)" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your license management system</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Apps" value={stats.totalApps} icon={AppWindow} />
        <StatCard title="Total Licenses" value={stats.totalLicenses} icon={Key} />
        <StatCard title="Active" value={stats.activeLicenses} icon={CheckCircle} />
        <StatCard title="Expired" value={stats.expiredLicenses} icon={XCircle} />
        <StatCard title="Banned" value={stats.bannedLicenses} icon={Ban} />
        <StatCard title="Resellers" value={stats.totalResellers} icon={Users} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">License Validations (7 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="name" stroke="hsl(215, 12%, 50%)" fontSize={12} />
              <YAxis stroke="hsl(215, 12%, 50%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "6px", color: "hsl(210, 20%, 92%)" }} />
              <Bar dataKey="validations" fill="hsl(174, 72%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">License Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "6px", color: "hsl(210, 20%, 92%)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Activity</h3>
          <div className="space-y-3">
            {recentLogs.length === 0 && <p className="text-sm text-muted-foreground">No activity yet</p>}
            {recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 rounded-md bg-secondary/30 px-3 py-2.5 transition-all duration-200 hover:bg-secondary/50">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary animate-glow-pulse" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{log.action}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{log.license_key}</p>
                  <p className="text-xs text-muted-foreground">{log.application_name} · {formatDate(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "400ms" }}>
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
      </div>

      {resellerStats.length > 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Reseller Statistics</h3>
          <div className="table-responsive">
            <div className="rounded-lg border border-border overflow-hidden min-w-[500px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Credits</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Generated</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {resellerStats.map((r: any, i: number) => (
                    <tr key={r.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-4 py-3 font-medium text-foreground">{r.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                      <td className="px-4 py-3"><span className="font-mono text-primary font-semibold">{r.credits}</span></td>
                      <td className="px-4 py-3 text-foreground">{r.total_generated}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
