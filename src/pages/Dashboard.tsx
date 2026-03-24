import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTransition, StaggerChildren } from "@/components/PageTransition";
import { StatCard } from "@/components/StatCard";
import { ActiveSessionsWidget } from "@/components/ActiveSessionsWidget";
import { CountryHeatmap } from "@/components/CountryHeatmap";
import { SystemHealthWidget } from "@/components/SystemHealthWidget";
import { HourlyTrendsChart } from "@/components/HourlyTrendsChart";
import { formatDate, getLicenseStatusColor } from "@/lib/license";
import { AppWindow, Key, CheckCircle, XCircle, Ban, Users, TrendingUp, Clock, Bell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

function getLast7DaysLabels(): { label: string; dateStr: string }[] {
  const days: { label: string; dateStr: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      dateStr: d.toISOString().split("T")[0],
    });
  }
  return days;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalApps: 0, totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, bannedLicenses: 0, totalResellers: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [recentLicenses, setRecentLicenses] = useState<any[]>([]);
  const [resellerStats, setResellerStats] = useState<any[]>([]);
  const [barData, setBarData] = useState<{ name: string; validations: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const [bellFlash, setBellFlash] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [appsRes, licensesRes, resellersRes, logsRes, latestLicRes, resellerDetailRes, validationLogsRes] = await Promise.all([
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("licenses").select("id, status", { count: "exact" }),
      supabase.from("resellers").select("id", { count: "exact", head: true }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("licenses").select("*, applications(name)").order("created_at", { ascending: false }).limit(5),
      supabase.from("resellers").select("*").order("created_at", { ascending: false }),
      supabase.from("activity_logs")
        .select("created_at")
        .in("action", ["License Login", "First Login — HWID Bound"])
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true }),
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

    const days = getLast7DaysLabels();
    const countsByDate = new Map<string, number>();
    for (const row of validationLogsRes.data || []) {
      const dateKey = new Date(row.created_at).toISOString().split("T")[0];
      countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
    }
    setBarData(days.map(d => ({
      name: d.label,
      validations: countsByDate.get(d.dateStr) || 0,
    })));
    setLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  // Real-time subscriptions — auto-refresh dashboard on new data
  useEffect(() => {
    if (!user) return;

    const handleNewActivity = () => {
      setNewActivityCount(prev => prev + 1);
      setBellFlash(true);
      setTimeout(() => setBellFlash(false), 2000);
      fetchData();
    };

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, handleNewActivity)
      .on("postgres_changes", { event: "*", schema: "public", table: "licenses" }, handleNewActivity)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "resellers" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const pieData = [
    { name: "Active", value: stats.activeLicenses || 1, color: "hsl(142, 72%, 45%)" },
    { name: "Expired", value: stats.expiredLicenses || 1, color: "hsl(0, 72%, 55%)" },
    { name: "Banned", value: stats.bannedLicenses || 1, color: "hsl(38, 92%, 55%)" },
  ];

  return (
    <DashboardLayout>
      <PageTransition>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your license management system</p>
        </div>
        <button
          onClick={() => setNewActivityCount(0)}
          className={`relative rounded-xl border border-border/60 bg-card p-2.5 transition-all duration-300 hover:border-primary/40 hover:bg-secondary/40 ${bellFlash ? 'ring-2 ring-primary/50 border-primary/60' : ''}`}
          title={newActivityCount > 0 ? `${newActivityCount} new events` : 'No new events'}
        >
          <Bell className={`h-5 w-5 transition-all duration-300 ${bellFlash ? 'text-primary animate-[bell-ring_0.6s_ease-in-out]' : 'text-muted-foreground'}`} />
          {newActivityCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-scale-in">
              {newActivityCount > 99 ? '99+' : newActivityCount}
            </span>
          )}
        </button>
      </div>

      {/* Stat Cards */}
      <StaggerChildren className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))
        ) : (
          <>
            <StatCard title="Total Apps" value={stats.totalApps} icon={AppWindow} />
            <StatCard title="Total Licenses" value={stats.totalLicenses} icon={Key} />
            <StatCard title="Active" value={stats.activeLicenses} icon={CheckCircle} />
            <StatCard title="Expired" value={stats.expiredLicenses} icon={XCircle} />
            <StatCard title="Banned" value={stats.bannedLicenses} icon={Ban} />
            <StatCard title="Resellers" value={stats.totalResellers} icon={Users} />
          </>
        )}
      </StaggerChildren>

      {/* Charts Row */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 glow-hover animate-fade-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">License Validations (7 days)</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(215, 12%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(215, 12%, 50%)" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220, 18%, 10%)",
                      border: "1px solid hsl(220, 14%, 18%)",
                      borderRadius: "10px",
                      color: "hsl(210, 20%, 92%)",
                      boxShadow: "0 10px 30px -10px hsl(220, 20%, 5% / 0.5)",
                    }}
                    cursor={{ fill: "hsl(220, 14%, 14% / 0.5)" }}
                  />
                  <Bar dataKey="validations" fill="hsl(174, 72%, 52%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 glow-hover animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">License Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220, 18%, 10%)",
                      border: "1px solid hsl(220, 14%, 18%)",
                      borderRadius: "10px",
                      color: "hsl(210, 20%, 92%)",
                      boxShadow: "0 10px 30px -10px hsl(220, 20%, 5% / 0.5)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-muted-foreground">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Widgets Row */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActiveSessionsWidget />
        <CountryHeatmap />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SystemHealthWidget />
        <HourlyTrendsChart />
      </div>

      {/* Recent Activity & Licenses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 glow-hover animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="space-y-2">
            {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            {!loading && recentLogs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
            )}
            {!loading && recentLogs.map((log: any, i: number) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-lg bg-secondary/20 px-3 py-3 transition-all duration-200 hover:bg-secondary/40 border border-transparent hover:border-border/30"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{log.action}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate mt-0.5">{log.license_key}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.application_name} · {formatDate(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 glow-hover animate-fade-in" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Latest Licenses</h3>
          </div>
          <div className="space-y-2">
            {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            {!loading && recentLicenses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No licenses yet</p>
            )}
            {!loading && recentLicenses.map((lic: any) => (
              <div key={lic.id} className="flex items-center justify-between rounded-lg bg-secondary/20 px-3 py-3 transition-all duration-200 hover:bg-secondary/40 border border-transparent hover:border-border/30">
                <div className="min-w-0">
                  <p className="license-key truncate">{lic.license_key}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lic.applications?.name || "Unknown"}</p>
                </div>
                <span className={`ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                  {lic.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reseller Stats */}
      {resellerStats.length > 0 && (
        <div className="mt-8 rounded-xl border border-border/60 bg-card p-5 sm:p-6 glow-hover animate-fade-in" style={{ animationDelay: "500ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Reseller Statistics</h3>
          </div>
          <div className="table-responsive">
            <div className="rounded-lg border border-border/50 overflow-hidden min-w-[500px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Credits</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Generated</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {resellerStats.map((r: any, i: number) => (
                    <tr key={r.id} className="table-row-hover border-b border-border/50 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
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
      </PageTransition>
    </DashboardLayout>
  );
}
