import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/TablePagination";
import { formatDate, getLicenseStatusColor } from "@/lib/license";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { notifyDiscord } from "@/lib/discord-notify";
import {
  Users, Key, AppWindow, ShieldCheck, CreditCard, BarChart3,
  Search, Ban, CheckCircle, XCircle, Trash2, Eye, RefreshCw,
  TrendingUp, Activity, Globe, Clock, Crown, UserX, UserCheck,
  AlertTriangle, Shield, Calendar, Infinity as InfinityIcon,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";

const PAGE_SIZE = 15;

function StatMini({ label, value, icon: Icon, color = "text-primary" }: { label: string; value: number | string; icon: any; color?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/90 p-4 shadow-[var(--shadow-card)] transition-all hover:border-primary/35">
      <div className="rounded-md border border-primary/15 bg-primary/10 p-2">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // ─── Overview stats ───
  const [stats, setStats] = useState({
    totalUsers: 0, totalApps: 0, totalLicenses: 0, activeLicenses: 0,
    expiredLicenses: 0, bannedLicenses: 0, totalResellers: 0, totalManagers: 0,
    totalTenants: 0, freeTenants: 0, lifetimeTenants: 0, platformTenants: 0,
  });
  const [barData, setBarData] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ─── Users tab ───
  const [users, setUsers] = useState<any[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);

  // ─── Tenants tab ───
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsSearch, setTenantsSearch] = useState("");
  const [tenantsPage, setTenantsPage] = useState(1);
  const [tenantsLoading, setTenantsLoading] = useState(false);

  // ─── Recent logs ───
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadOverview();
  }, [user]);

  useEffect(() => {
    if (activeTab === "users" && users.length === 0) loadUsers();
    if (activeTab === "tenants" && tenants.length === 0) loadTenants();
  }, [activeTab]);

  async function loadOverview() {
    setStatsLoading(true);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [profilesRes, activeProfilesRes, appsRes, licensesRes, resellersRes, managersRes, tenantsRes, logsRes, validationLogsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("user_id"),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("licenses").select("id, status", { count: "exact" }),
      supabase.from("resellers").select("id", { count: "exact", head: true }),
      supabase.from("manager_permissions").select("id", { count: "exact", head: true }),
      supabase.from("tenants").select("id, plan"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("activity_logs")
        .select("created_at")
        .in("action", ["License Login", "First Login — HWID Bound"])
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true }),
    ]);

    const licenses = licensesRes.data || [];
    const activeUserIds = new Set((activeProfilesRes.data || []).map((p: any) => p.user_id));
    const tenantData = (tenantsRes.data || []).filter((t: any) => !t.owner_user_id || activeUserIds.has(t.owner_user_id));
    setStats({
      totalUsers: profilesRes.count || 0,
      totalApps: appsRes.count || 0,
      totalLicenses: licensesRes.count || 0,
      activeLicenses: licenses.filter(l => l.status === "active").length,
      expiredLicenses: licenses.filter(l => l.status === "expired").length,
      bannedLicenses: licenses.filter(l => l.status === "banned").length,
      totalResellers: resellersRes.count || 0,
      totalManagers: managersRes.count || 0,
      totalTenants: tenantData.length,
      freeTenants: tenantData.filter(t => t.plan === "free").length,
      lifetimeTenants: tenantData.filter(t => t.plan === "lifetime").length,
      platformTenants: tenantData.filter(t => t.plan === "platform").length,
    });

    setRecentLogs(logsRes.data || []);

    // Build 7-day chart
    const days: { label: string; dateStr: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ label: d.toLocaleDateString("en-US", { weekday: "short" }), dateStr: d.toISOString().split("T")[0] });
    }
    const countsByDate = new Map<string, number>();
    for (const row of validationLogsRes.data || []) {
      const dateKey = new Date(row.created_at).toISOString().split("T")[0];
      countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
    }
    setBarData(days.map(d => ({ name: d.label, validations: countsByDate.get(d.dateStr) || 0 })));
    setStatsLoading(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load users: " + error.message);
      setUsersLoading(false);
      return;
    }
    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    (rolesData || []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) || [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const enriched = (profiles || []).map((p: any) => ({
      ...p,
      user_roles: (roleMap.get(p.user_id) || []).map((role) => ({ role })),
    }));
    setUsers(enriched);
    setUsersLoading(false);
  }

  async function loadTenants() {
    setTenantsLoading(true);
    const [{ data }, { data: profiles }] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, email, username"),
    ]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setTenants((data || [])
      .filter((t: any) => !t.owner_user_id || profileMap.has(t.owner_user_id))
      .map((t: any) => ({ ...t, owner_profile: t.owner_user_id ? profileMap.get(t.owner_user_id) : null })));
    setTenantsLoading(false);
  }

  async function suspendTenant(id: string, suspended: boolean) {
    const { error } = await supabase.from("tenants").update({ suspended: !suspended }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(suspended ? "Workspace re-activated" : "Workspace suspended");
    const t = tenants.find(x => x.id === id);
    notifyDiscord(suspended ? "Admin re-activated workspace" : "Admin suspended workspace", { Workspace: t?.name || id, "Tenant ID": id });
    loadTenants();
    loadOverview();
  }

  async function updateTenantPlan(id: string, plan: string) {
    // Two-tier model: free & lifetime never expire. 'platform' is internal.
    const allowed = ["free", "lifetime", "platform"] as const;
    if (!allowed.includes(plan as any)) {
      toast.error("Invalid plan");
      return;
    }
    const t = tenants.find(x => x.id === id);
    if (t?.plan === "platform" && plan !== "platform") {
      toast.error("Cannot change the platform workspace plan");
      return;
    }
    if (t?.plan === "lifetime" && plan === "free") {
      const ok = window.confirm(
        `Downgrade "${t?.name || id}" from Lifetime to Free?\n\nThe seller will immediately lose access to resellers, managers, and premium features, and be capped at 1 app / 25 keys.`
      );
      if (!ok) return;
    }
    const cycleMap: Record<string, string> = { free: "free", lifetime: "lifetime", platform: "lifetime" };
    const patch: any = {
      plan,
      billing_cycle: cycleMap[plan] || "lifetime",
      plan_expires_at: null,
      plan_started_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("tenants").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Plan updated to ${plan}`);
    notifyDiscord("Admin changed workspace plan", { Workspace: t?.name || id, "New Plan": plan, "Tenant ID": id });
    loadTenants();
    loadOverview();
  }

  // ─── User ban / delete ───
  const [pendingUser, setPendingUser] = useState<{ id: string; email: string; action: "ban" | "delete" } | null>(null);

  async function manageUser(action: "ban" | "unban" | "delete", userId: string) {
    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: { action, userId },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success(`User ${action}${action === "ban" ? "ned" : action === "unban" ? "ned" : "d"}`);
    const target = users.find((u) => u.user_id === userId);
    notifyDiscord(
      action === "ban" ? "Admin banned user" : action === "unban" ? "Admin unbanned user" : "Admin deleted user",
      { User: target?.email || target?.username || userId, "User ID": userId, Action: action }
    );
    loadUsers();
    loadOverview();
  }

  // Filtered data
  const filteredUsers = users.filter(u =>
    (u.username || "").toLowerCase().includes(usersSearch.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(usersSearch.toLowerCase())
  );
  const paginatedUsers = filteredUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE);

  const filteredTenants = tenants.filter(t =>
    (t.name || "").toLowerCase().includes(tenantsSearch.toLowerCase())
  );
  const paginatedTenants = filteredTenants.slice((tenantsPage - 1) * PAGE_SIZE, tenantsPage * PAGE_SIZE);

  const pieData = [
    { name: "Free", value: stats.freeTenants || 0, color: "hsl(215, 15%, 45%)" },
    { name: "Lifetime", value: stats.lifetimeTenants || 0, color: "hsl(var(--primary))" },
    { name: "Platform", value: stats.platformTenants || 0, color: "hsl(var(--primary-glow))" },
  ];

  const licensePie = [
    { name: "Active", value: stats.activeLicenses || 0, color: "hsl(142, 72%, 45%)" },
    { name: "Expired", value: stats.expiredLicenses || 0, color: "hsl(38, 92%, 55%)" },
    { name: "Banned", value: stats.bannedLicenses || 0, color: "hsl(0, 72%, 55%)" },
  ];

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-6 overflow-hidden rounded-lg border border-border/70 bg-card/90 p-5 shadow-[var(--shadow-card)]">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Platform Command
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin Control Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete platform management — users, subscriptions, apps, licenses & analytics</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 border border-border/60 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="tenants" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />Subscriptions</TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW TAB ─── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Top-level stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {statsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                    <Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-10" />
                  </div>
                ))
              ) : (
                <>
                  <StatMini label="Total Users" value={stats.totalUsers} icon={Users} />
                  <StatMini label="Applications" value={stats.totalApps} icon={AppWindow} />
                  <StatMini label="Total Licenses" value={stats.totalLicenses} icon={Key} />
                  <StatMini label="Active Licenses" value={stats.activeLicenses} icon={CheckCircle} color="text-emerald-400" />
                  <StatMini label="Resellers" value={stats.totalResellers} icon={Crown} />
                  <StatMini label="Managers" value={stats.totalManagers} icon={ShieldCheck} />
                </>
              )}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Validation chart */}
              <Card className="lg:col-span-2 border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />License Validations (7 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? <Skeleton className="h-[200px] w-full" /> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={barData}>
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
                        <XAxis dataKey="name" stroke="hsl(215, 12%, 50%)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(215, 12%, 50%)" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "10px", color: "hsl(210, 20%, 92%)" }} />
                        <Area type="monotone" dataKey="validations" stroke="hsl(262, 83%, 58%)" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Plan distribution pie */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? <Skeleton className="h-[200px] w-full" /> : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "10px", color: "hsl(210, 20%, 92%)" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 mt-2">
                        {pieData.map(e => (
                          <div key={e.name} className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                            <span className="text-xs text-muted-foreground">{e.name}: {e.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* License distribution + Recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4 text-primary" />License Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? <Skeleton className="h-[180px] w-full" /> : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={licensePie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {licensePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "10px", color: "hsl(210, 20%, 92%)" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 mt-2">
                        {licensePie.map(e => (
                          <div key={e.name} className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                            <span className="text-xs text-muted-foreground">{e.name}: {e.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {recentLogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>}
                    {recentLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2 rounded-lg bg-secondary/20 px-3 py-2 border border-transparent hover:border-border/30 transition-all">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">{log.action}</p>
                          {log.license_key && <p className="font-mono text-[10px] text-muted-foreground truncate">{log.license_key}</p>}
                          <p className="text-[10px] text-muted-foreground">{log.application_name} · {formatDate(log.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatMini label="Banned Licenses" value={stats.bannedLicenses} icon={Ban} color="text-destructive" />
              <StatMini label="Expired Licenses" value={stats.expiredLicenses} icon={XCircle} color="text-yellow-500" />
              <StatMini label="Total Tenants" value={stats.totalTenants} icon={Globe} />
              <StatMini label="Free Plans" value={stats.freeTenants} icon={Shield} color="text-muted-foreground" />
            </div>
          </TabsContent>

          {/* ─── USERS TAB ─── */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">All Platform Users</h2>
                <p className="text-xs text-muted-foreground">View and manage every registered user across the platform</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadUsers}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
            </div>

            <div className="relative sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users..." value={usersSearch} onChange={e => setUsersSearch(e.target.value)} className="bg-secondary border-border pl-10" />
            </div>

            {usersLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map((u: any) => {
                          const roles = u.user_roles || [];
                          const roleStr = roles.length > 0 ? roles.map((r: any) => r.role).join(", ") : u.role || "unknown";
                          return (
                            <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  {u.username}
                                  {u.banned && <Badge variant="destructive" className="text-[9px]">BANNED</Badge>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                              <td className="px-4 py-3">
                                <Badge variant={roleStr.includes("admin") ? "default" : "secondary"} className="text-[10px]">
                                  {roleStr}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  {u.user_id === user?.id ? (
                                    <span className="text-[10px] text-muted-foreground">You</span>
                                  ) : roleStr.includes("admin") ? (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  ) : (
                                    <>
                                      {u.banned ? (
                                        <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400" onClick={() => manageUser("unban", u.user_id)}>
                                          <UserCheck className="h-3 w-3 mr-1" />Unban
                                        </Button>
                                      ) : (
                                        <Button size="sm" variant="ghost" className="h-7 px-2 text-yellow-500" onClick={() => setPendingUser({ id: u.user_id, email: u.email, action: "ban" })}>
                                          <Ban className="h-3 w-3 mr-1" />Ban
                                        </Button>
                                      )}
                                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setPendingUser({ id: u.user_id, email: u.email, action: "delete" })}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {paginatedUsers.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <TablePagination currentPage={usersPage} totalItems={filteredUsers.length} pageSize={PAGE_SIZE} onPageChange={setUsersPage} />
              </>
            )}
          </TabsContent>

          {/* ─── TENANTS / SUBSCRIPTIONS TAB ─── */}
          <TabsContent value="tenants" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Subscriptions & Tenants</h2>
                <p className="text-xs text-muted-foreground">Manage plans, suspend workspaces, and view billing status</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadTenants}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
            </div>

            {/* Plan summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatMini label="Total Tenants" value={stats.totalTenants} icon={Globe} />
              <StatMini label="Free" value={stats.freeTenants} icon={Users} color="text-muted-foreground" />
              <StatMini label="Lifetime" value={stats.lifetimeTenants} icon={Crown} color="text-primary" />
              <StatMini label="Platform" value={stats.platformTenants} icon={AppWindow} color="text-fuchsia-400" />
            </div>

            <div className="relative sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search tenants..." value={tenantsSearch} onChange={e => setTenantsSearch(e.target.value)} className="bg-secondary border-border pl-10" />
            </div>

            {tenantsLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Workspace</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTenants.map((t: any) => {
                          const exp = t.plan_expires_at ? new Date(t.plan_expires_at) : null;
                          const days = exp ? Math.ceil((exp.getTime() - Date.now()) / 86_400_000) : null;
                          const expired = exp && exp < new Date();
                          return (
                          <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{t.name}</p>
                              {t.owner_profile?.email && <p className="text-[11px] text-muted-foreground">{t.owner_profile.email}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={t.plan}
                                onChange={e => updateTenantPlan(t.id, e.target.value)}
                                className="rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground"
                              >
                                <option value="free">Free</option>
                                <option value="lifetime">Lifetime</option>
                                <option value="platform">Platform</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {!exp ? (
                                <span className="inline-flex items-center gap-1 text-primary"><InfinityIcon className="h-3 w-3" /> Lifetime</span>
                              ) : expired ? (
                                <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                              ) : (
                                <span className={days! <= 7 ? "text-yellow-500" : "text-muted-foreground"}>{days}d ({exp.toLocaleDateString()})</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {t.suspended ? (
                                <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-emerald-400 border-emerald-400/30">Active</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(t.created_at)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1 flex-wrap">
                                {t.plan !== "lifetime" && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={() => updateTenantPlan(t.id, "lifetime")}>
                                    <InfinityIcon className="h-3 w-3 mr-1" />Grant Lifetime
                                  </Button>
                                )}
                                {t.plan !== "free" && t.plan !== "platform" && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => updateTenantPlan(t.id, "free")}>
                                    Reset to Free
                                  </Button>
                                )}
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => suspendTenant(t.id, t.suspended)}
                                  className={`h-7 px-2 text-xs ${t.suspended ? "text-emerald-400" : "text-destructive"}`}
                                  title={t.suspended ? "Re-activate workspace" : "Suspend workspace"}
                                >
                                  {t.suspended ? <><UserCheck className="h-3 w-3 mr-1" />Activate</> : <><UserX className="h-3 w-3 mr-1" />Suspend</>}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                        {paginatedTenants.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No tenants found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <TablePagination currentPage={tenantsPage} totalItems={filteredTenants.length} pageSize={PAGE_SIZE} onPageChange={setTenantsPage} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </PageTransition>
      {/* Ban/Delete confirmation */}
      <AlertDialog open={!!pendingUser} onOpenChange={(o) => !o && setPendingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingUser?.action === "delete" ? "Permanently delete user?" : "Ban user account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingUser?.email}</strong>
              {pendingUser?.action === "delete"
                ? " — this will permanently remove the account, all roles, workspaces and tenant data. Cannot be undone."
                : " — the user will be immediately signed out and blocked from logging in until unbanned."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingUser) manageUser(pendingUser.action, pendingUser.id);
                setPendingUser(null);
              }}
            >
              {pendingUser?.action === "delete" ? "Delete forever" : "Ban user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
