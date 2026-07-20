import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  AlertTriangle, Shield, Calendar, Infinity as InfinityIcon, ShieldBan, Wrench, Copy,
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
    totalTenants: 0, freeTenants: 0, monthlyTenants: 0, lifetimeTenants: 0, platformTenants: 0,
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

  const [allApps, setAllApps] = useState<any[]>([]);
  const [appsSearch, setAppsSearch] = useState("");
  const [appsPage, setAppsPage] = useState(1);
  const [appsLoading, setAppsLoading] = useState(false);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [licensesSearch, setLicensesSearch] = useState("");
  const [licensesStatus, setLicensesStatus] = useState("all");
  const [licensesPage, setLicensesPage] = useState(1);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // ─── Recent logs ───
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [logsSearch, setLogsSearch] = useState("");
  const [blacklistIp, setBlacklistIp] = useState("");
  const [blacklistLicense, setBlacklistLicense] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("GX Auth is currently under maintenance. Please check back soon.");
  const [blacklistRows, setBlacklistRows] = useState<any[]>([]);
  const [adminBannedLicenses, setAdminBannedLicenses] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    loadOverview();
  }, [user]);

  useEffect(() => {
    if (activeTab === "users" && users.length === 0) loadUsers();
    if (activeTab === "tenants" && tenants.length === 0) loadTenants();
    if (activeTab === "all-apps" && allApps.length === 0) loadAllApps();
    if (activeTab === "all-licenses" && allLicenses.length === 0) loadAllLicenses();
    if (activeTab === "payments" && payments.length === 0) loadPayments();
    if (activeTab === "ops") {
      loadSecurityLists();
      loadMaintenanceSettings();
    }
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
      supabase.from("tenants").select("id, plan, owner_user_id"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(75),
      supabase.from("activity_logs")
        .select("created_at")
        .in("action", ["License Login", "First Login — HWID Bound"])
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true }),
    ]);

    const licenses = licensesRes.data || [];
    const activeUserIds = new Set((activeProfilesRes.data || []).map((p: any) => p.user_id));
    const tenantData = (tenantsRes.data || []).filter((t: any) => t.owner_user_id && activeUserIds.has(t.owner_user_id));
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
      monthlyTenants: tenantData.filter(t => t.plan === "monthly").length,
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
      .filter((t: any) => t.owner_user_id && profileMap.has(t.owner_user_id))
      .map((t: any) => ({ ...t, owner_profile: t.owner_user_id ? profileMap.get(t.owner_user_id) : null })));
    setTenantsLoading(false);
  }

  async function loadAllApps() {
    setAppsLoading(true);
    const [{ data: appsData, error }, { data: profiles }] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("user_id, email, username"),
    ]);
    if (error) {
      toast.error("Failed to load apps: " + error.message);
      setAppsLoading(false);
      return;
    }
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setAllApps((appsData || []).map((app: any) => ({ ...app, owner_profile: profileMap.get(app.user_id) || null })));
    setAppsLoading(false);
  }

  async function loadAllLicenses() {
    setLicensesLoading(true);
    const [{ data: licensesData, error }, { data: profiles }] = await Promise.all([
      supabase
        .from("licenses")
        .select("*, applications(name)")
        .order("created_at", { ascending: false })
        .limit(800),
      supabase.from("profiles").select("user_id, email, username"),
    ]);
    if (error) {
      toast.error("Failed to load licenses: " + error.message);
      setLicensesLoading(false);
      return;
    }
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setAllLicenses((licensesData || []).map((lic: any) => ({ ...lic, owner_profile: profileMap.get(lic.user_id) || null })));
    setLicensesLoading(false);
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    const [{ data: paymentsData, error }, { data: profiles }] = await Promise.all([
      supabase
        .from("payment_transactions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("profiles").select("user_id, email, username"),
    ]);
    if (error) {
      toast.error("Failed to load payments: " + error.message);
      setPaymentsLoading(false);
      return;
    }
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setPayments((paymentsData || []).map((payment: any) => ({ ...payment, owner_profile: profileMap.get(payment.user_id) || null })));
    setPaymentsLoading(false);
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
    const allowed = ["free", "monthly", "lifetime", "platform"] as const;
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
    const monthlyExpiry = new Date();
    monthlyExpiry.setDate(monthlyExpiry.getDate() + 30);
    const cycleMap: Record<string, string> = { free: "free", monthly: "monthly", lifetime: "lifetime", platform: "lifetime" };
    const patch: any = {
      plan,
      billing_cycle: cycleMap[plan] || "lifetime",
      plan_expires_at: plan === "monthly" ? monthlyExpiry.toISOString() : null,
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

  function viewUser(target: any) {
    setSelectedUser(target);
    toast.info("Opened admin user view. Full account login needs the impersonate-user Edge Function deployed.");
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard?.writeText(value);
    toast.success(`${label} copied`);
  }

  async function loadSecurityLists() {
    const [{ data: blacklistData }, { data: bannedData }] = await Promise.all([
      supabase.from("blacklist").select("*").order("created_at", { ascending: false }).limit(100),
      supabase
        .from("licenses")
        .select("id, license_key, status, banned, banned_by_admin, created_at, applications(name)")
        .eq("banned_by_admin", true)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setBlacklistRows(blacklistData || []);
    setAdminBannedLicenses(bannedData || []);
  }

  async function loadMaintenanceSettings() {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["maintenance_mode", "maintenance_message"]);
    const map = new Map((data || []).map((row: any) => [row.key, row.value]));
    if (map.has("maintenance_mode")) setMaintenanceEnabled(map.get("maintenance_mode") === "true");
    if (map.has("maintenance_message")) setMaintenanceMessage(map.get("maintenance_message") || maintenanceMessage);
  }

  async function addAdminIpBlacklist() {
    if (!user || !blacklistIp.trim()) return;
    const { error } = await supabase.from("blacklist").insert({
      type: "ip",
      value: blacklistIp.trim(),
      reason: "Blocked by platform admin",
      created_by: user.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("IP added to blacklist");
    notifyDiscord("Admin blacklisted IP", { IP: blacklistIp.trim() });
    setBlacklistIp("");
    loadSecurityLists();
    loadOverview();
  }

  async function addAdminLicenseBlacklist() {
    if (!user || !blacklistLicense.trim()) return;
    const { data: lic, error: lookupError } = await supabase
      .from("licenses")
      .select("id, application_id, applications(name)")
      .eq("license_key", blacklistLicense.trim())
      .maybeSingle();
    if (lookupError || !lic) {
      toast.error("License key not found");
      return;
    }
    const { error } = await supabase
      .from("licenses")
      .update({ banned: true, status: "banned", banned_by_admin: true })
      .eq("id", (lic as any).id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "Admin blacklisted license",
      license_key: blacklistLicense.trim(),
      application_id: (lic as any).application_id,
      application_name: (lic as any).applications?.name || "Unknown",
    } as any);
    toast.success("License blacklisted by admin");
    notifyDiscord("Admin blacklisted license", { Key: blacklistLicense.trim() });
    setBlacklistLicense("");
    loadSecurityLists();
    loadOverview();
  }

  async function saveMaintenanceMode() {
    if (!user) return;
    const entries = [
      ["maintenance_mode", maintenanceEnabled ? "true" : "false"],
      ["maintenance_message", maintenanceMessage],
    ];
    const { error } = await supabase.from("settings").upsert(
      entries.map(([key, value]) => ({ user_id: user.id, key, value, updated_at: new Date().toISOString() } as any)),
      { onConflict: "user_id,key" }
    );
    if (error) { toast.error(error.message); return; }
    toast.success(maintenanceEnabled ? "Maintenance mode enabled" : "Maintenance mode disabled");
    notifyDiscord("Maintenance mode updated", { Enabled: maintenanceEnabled ? "Yes" : "No" });
    localStorage.setItem("gxauth_maintenance_mode", maintenanceEnabled ? "true" : "false");
    localStorage.setItem("gxauth_maintenance_message", maintenanceMessage);
  }

  // Filtered data
  const filteredUsers = users.filter(u =>
    (u.username || "").toLowerCase().includes(usersSearch.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(usersSearch.toLowerCase())
  );
  const paginatedUsers = filteredUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE);

  const filteredTenants = tenants.filter(t =>
    (t.name || "").toLowerCase().includes(tenantsSearch.toLowerCase()) ||
    (t.owner_profile?.email || "").toLowerCase().includes(tenantsSearch.toLowerCase()) ||
    (t.owner_profile?.username || "").toLowerCase().includes(tenantsSearch.toLowerCase())
  );
  const paginatedTenants = filteredTenants.slice((tenantsPage - 1) * PAGE_SIZE, tenantsPage * PAGE_SIZE);
  const filteredApps = allApps.filter((app: any) => {
    const s = appsSearch.toLowerCase();
    return (app.name || "").toLowerCase().includes(s) ||
      (app.description || "").toLowerCase().includes(s) ||
      (app.owner_profile?.email || "").toLowerCase().includes(s) ||
      (app.owner_profile?.username || "").toLowerCase().includes(s) ||
      (app.id || "").toLowerCase().includes(s);
  });
  const paginatedApps = filteredApps.slice((appsPage - 1) * PAGE_SIZE, appsPage * PAGE_SIZE);
  const filteredLicenses = allLicenses.filter((lic: any) => {
    const s = licensesSearch.toLowerCase();
    const matchesSearch = (lic.license_key || "").toLowerCase().includes(s) ||
      (lic.owner_name || "").toLowerCase().includes(s) ||
      (lic.owner_email || "").toLowerCase().includes(s) ||
      (lic.applications?.name || "").toLowerCase().includes(s) ||
      (lic.owner_profile?.email || "").toLowerCase().includes(s) ||
      (lic.hwid || "").toLowerCase().includes(s);
    const matchesStatus = licensesStatus === "all" || lic.status === licensesStatus || (licensesStatus === "banned" && lic.banned);
    return matchesSearch && matchesStatus;
  });
  const paginatedLicenses = filteredLicenses.slice((licensesPage - 1) * PAGE_SIZE, licensesPage * PAGE_SIZE);
  const filteredPayments = payments.filter((payment: any) => {
    const s = paymentsSearch.toLowerCase();
    return (payment.order_id || "").toLowerCase().includes(s) ||
      (payment.payment_id || "").toLowerCase().includes(s) ||
      (payment.status || "").toLowerCase().includes(s) ||
      (payment.plan || "").toLowerCase().includes(s) ||
      (payment.pay_address || "").toLowerCase().includes(s) ||
      (payment.owner_profile?.email || "").toLowerCase().includes(s) ||
      (payment.owner_profile?.username || "").toLowerCase().includes(s);
  });
  const paginatedPayments = filteredPayments.slice((paymentsPage - 1) * PAGE_SIZE, paymentsPage * PAGE_SIZE);
  const confirmedPayments = payments.filter((payment: any) => ["confirmed", "finished"].includes(String(payment.status || "").toLowerCase()));
  const waitingPayments = payments.filter((payment: any) => !["confirmed", "finished", "failed", "expired", "refunded"].includes(String(payment.status || "").toLowerCase()));
  const paymentRevenue = confirmedPayments.reduce((sum: number, payment: any) => sum + Number(payment.price_amount || 0), 0);
  const filteredLogs = recentLogs.filter((log: any) => {
    const s = logsSearch.toLowerCase();
    return (log.action || "").toLowerCase().includes(s) ||
      (log.application_name || "").toLowerCase().includes(s) ||
      (log.license_key || "").toLowerCase().includes(s);
  });

  const getLogTone = (action = "") => {
    const lower = action.toLowerCase();
    if (lower.includes("delete") || lower.includes("ban") || lower.includes("suspend")) return "border-destructive/25 bg-destructive/10 text-destructive";
    if (lower.includes("created") || lower.includes("generated") || lower.includes("activated")) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
    if (lower.includes("reset") || lower.includes("updated") || lower.includes("changed")) return "border-primary/25 bg-primary/10 text-primary";
    return "border-border/70 bg-secondary/50 text-muted-foreground";
  };

  const pieData = [
    { name: "Free", value: stats.freeTenants || 0, color: "hsl(215, 15%, 45%)" },
    { name: "Monthly", value: stats.monthlyTenants || 0, color: "hsl(var(--primary))" },
    { name: "Lifetime", value: stats.lifetimeTenants || 0, color: "hsl(var(--accent))" },
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
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
              <p className="text-xs font-semibold text-emerald-300">Admin-only global view</p>
              <p className="mt-1 text-xs text-muted-foreground">Personal pages show only the signed-in owner.</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
              <p className="text-xs font-semibold text-primary">Owner cleanup active</p>
              <p className="mt-1 text-xs text-muted-foreground">Subscriptions without a real owner are hidden here.</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
              <p className="text-xs font-semibold text-foreground">Fast controls</p>
              <p className="mt-1 text-xs text-muted-foreground">Grant lifetime, suspend, search and refresh in one place.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Complete platform management — users, subscriptions, apps, licenses & analytics</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 border border-border/60 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="tenants" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />Subscriptions</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />Payments</TabsTrigger>
            <TabsTrigger value="all-apps" className="gap-1.5 text-xs"><AppWindow className="h-3.5 w-3.5" />All Apps</TabsTrigger>
            <TabsTrigger value="all-licenses" className="gap-1.5 text-xs"><Key className="h-3.5 w-3.5" />All Licenses</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" />Audit Logs</TabsTrigger>
            <TabsTrigger value="ops" className="gap-1.5 text-xs"><ShieldBan className="h-3.5 w-3.5" />Security Ops</TabsTrigger>
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
                                      <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={() => viewUser(u)}>
                                        <Eye className="h-3 w-3 mr-1" />View
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
              <StatMini label="Monthly" value={stats.monthlyTenants} icon={Calendar} color="text-primary" />
              <StatMini label="Lifetime" value={stats.lifetimeTenants} icon={Crown} color="text-primary" />
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
                                <option value="monthly">Monthly</option>
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
                                {t.plan !== "monthly" && t.plan !== "platform" && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={() => updateTenantPlan(t.id, "monthly")}>
                                    <Calendar className="h-3 w-3 mr-1" />Grant Monthly
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
          <TabsContent value="all-apps" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">All Users Apps</h2>
                <p className="text-xs text-muted-foreground">Global application inventory with owner filters</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadAllApps}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
            </div>
            <div className="relative sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search app, owner, ID..." value={appsSearch} onChange={e => setAppsSearch(e.target.value)} className="bg-secondary border-border pl-10" />
            </div>
            {appsLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Application</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">App ID</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Security</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedApps.map((app: any) => (
                          <tr key={app.id} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{app.name}</p>
                              {app.description && <p className="text-xs text-muted-foreground">{app.description}</p>}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{app.owner_profile?.email || app.user_id}</td>
                            <td className="px-4 py-3 font-mono text-xs text-primary">{String(app.id).slice(0, 12)}...</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {app.suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                                {app.kill_switch && <Badge variant="destructive" className="text-[10px]">Kill Switch</Badge>}
                                {app.signature_required && <Badge variant="secondary" className="text-[10px] text-primary">Signed</Badge>}
                                {!app.suspended && !app.kill_switch && !app.signature_required && <span className="text-xs text-muted-foreground">Standard</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(app.created_at)}</td>
                          </tr>
                        ))}
                        {paginatedApps.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No apps found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                <TablePagination currentPage={appsPage} totalItems={filteredApps.length} pageSize={PAGE_SIZE} onPageChange={setAppsPage} />
              </>
            )}
          </TabsContent>
          <TabsContent value="all-licenses" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">All Users Licenses</h2>
                <p className="text-xs text-muted-foreground">Search every license by key, owner, app, HWID, or status</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadAllLicenses}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:max-w-sm sm:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search key, owner, app, HWID..." value={licensesSearch} onChange={e => setLicensesSearch(e.target.value)} className="bg-secondary border-border pl-10" />
              </div>
              <select value={licensesStatus} onChange={(e) => setLicensesStatus(e.target.value)} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            {licensesLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">App</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">HWID / IP</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLicenses.map((lic: any) => (
                          <tr key={lic.id} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="px-4 py-3 font-mono text-xs text-primary">{lic.license_key}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{lic.applications?.name || "Unknown app"}</td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-foreground">{lic.owner_email || lic.owner_profile?.email || "No owner email"}</p>
                              {lic.owner_name && <p className="text-[11px] text-muted-foreground">{lic.owner_name}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-[10px] ${getLicenseStatusColor(lic.status)}`}>{lic.banned ? "banned" : lic.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              <p className="font-mono">{lic.hwid ? String(lic.hwid).slice(0, 14) + "..." : "No HWID"}</p>
                              <p>{lic.ip || lic.last_seen_ip || "No IP"}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{lic.expires_at ? formatDate(lic.expires_at) : "Lifetime"}</td>
                          </tr>
                        ))}
                        {paginatedLicenses.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No licenses found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                <TablePagination currentPage={licensesPage} totalItems={filteredLicenses.length} pageSize={PAGE_SIZE} onPageChange={setLicensesPage} />
              </>
            )}
          </TabsContent>
          <TabsContent value="payments" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">NOWPayments Control</h2>
                <p className="text-xs text-muted-foreground">Track Litecoin checkouts, confirmations, plan activation, and manual follow-up.</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadPayments}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <StatMini label="Total Payments" value={payments.length} icon={CreditCard} />
              <StatMini label="Confirmed" value={confirmedPayments.length} icon={CheckCircle} color="text-emerald-400" />
              <StatMini label="Waiting" value={waitingPayments.length} icon={Clock} color="text-yellow-400" />
              <StatMini label="Revenue" value={`$${paymentRevenue.toFixed(2)}`} icon={TrendingUp} color="text-primary" />
            </div>

            <Card className="border-border/60 bg-card/80">
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm">Payment Ledger</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Search by user, order, payment id, status, plan, or wallet address.</p>
                </div>
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    value={paymentsSearch}
                    onChange={(e) => setPaymentsSearch(e.target.value)}
                    className="bg-secondary border-border pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
                ) : (
                  <>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-sm">
                          <thead>
                            <tr className="border-b border-border bg-secondary/50">
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">USD / LTC</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedPayments.map((payment: any) => {
                              const status = String(payment.status || "waiting").toLowerCase();
                              const isConfirmed = ["confirmed", "finished"].includes(status);
                              return (
                                <tr key={payment.id} className="border-b border-border/50 hover:bg-secondary/30">
                                  <td className="px-4 py-3">
                                    <p className="text-xs font-medium text-foreground">{payment.owner_profile?.email || payment.user_id || "Unknown user"}</p>
                                    {payment.owner_profile?.username && <p className="text-[11px] text-muted-foreground">{payment.owner_profile.username}</p>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className="capitalize text-[10px]">{payment.plan || "unknown"}</Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-xs text-foreground">${Number(payment.price_amount || 0).toFixed(2)}</p>
                                    <p className="font-mono text-[11px] text-primary">{payment.pay_amount || "-"} {String(payment.pay_currency || "ltc").toUpperCase()}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${isConfirmed ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : status === "failed" || status === "expired" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"}`}
                                    >
                                      {status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      <button type="button" onClick={() => copyText(payment.order_id || "", "Order ID")} className="flex max-w-[280px] items-center gap-1 text-left font-mono text-[11px] text-muted-foreground hover:text-primary">
                                        <span className="truncate">{payment.order_id || "No order"}</span>
                                        <Copy className="h-3 w-3 shrink-0" />
                                      </button>
                                      {payment.payment_id && (
                                        <button type="button" onClick={() => copyText(String(payment.payment_id), "Payment ID")} className="flex max-w-[280px] items-center gap-1 text-left font-mono text-[11px] text-muted-foreground hover:text-primary">
                                          <span className="truncate">{payment.payment_id}</span>
                                          <Copy className="h-3 w-3 shrink-0" />
                                        </button>
                                      )}
                                      {payment.pay_address && (
                                        <button type="button" onClick={() => copyText(payment.pay_address, "LTC address")} className="flex max-w-[280px] items-center gap-1 text-left font-mono text-[11px] text-primary hover:text-primary-glow">
                                          <span className="truncate">{payment.pay_address}</span>
                                          <Copy className="h-3 w-3 shrink-0" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{payment.created_at ? formatDate(payment.created_at) : "-"}</td>
                                </tr>
                              );
                            })}
                            {paginatedPayments.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No payments found</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <TablePagination currentPage={paymentsPage} totalItems={filteredPayments.length} pageSize={PAGE_SIZE} onPageChange={setPaymentsPage} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="logs" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Audit Logs</h2>
                <p className="text-xs text-muted-foreground">Recent platform activity, license actions and admin events</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadOverview}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
            </div>
            <div className="relative sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search logs..." value={logsSearch} onChange={e => setLogsSearch(e.target.value)} className="bg-secondary border-border pl-10" />
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70">
              {filteredLogs.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No logs found</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredLogs.map((log: any) => (
                    <div key={log.id} className="grid gap-3 px-4 py-3 transition-colors hover:bg-secondary/30 md:grid-cols-[1fr_auto]">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${getLogTone(log.action)}`}>{log.action || "Activity"}</Badge>
                          {log.application_name && <span className="text-xs text-muted-foreground">{log.application_name}</span>}
                        </div>
                        {log.license_key && <p className="truncate font-mono text-xs text-primary">{log.license_key}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground md:text-right">{formatDate(log.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="ops" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Security Operations</h2>
              <p className="text-xs text-muted-foreground">Platform controls for admin-only blocks and maintenance mode</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><ShieldBan className="h-4 w-4 text-destructive" />Blacklist IP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={blacklistIp} onChange={(e) => setBlacklistIp(e.target.value)} placeholder="203.0.113.10" className="bg-secondary border-border" />
                  <Button onClick={addAdminIpBlacklist} className="w-full" variant="destructive">Block IP</Button>
                  <p className="text-xs text-muted-foreground">Validation already rejects blacklisted IP addresses.</p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><Key className="h-4 w-4 text-destructive" />Blacklist License</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={blacklistLicense} onChange={(e) => setBlacklistLicense(e.target.value)} placeholder="GALACTIC-..." className="bg-secondary border-border" />
                  <Button onClick={addAdminLicenseBlacklist} className="w-full" variant="destructive">Admin Ban Key</Button>
                  <p className="text-xs text-muted-foreground">Seller/user unban is blocked for admin-banned keys.</p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-primary" />
                    Maintenance Mode
                    <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${maintenanceEnabled ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${maintenanceEnabled ? "bg-yellow-300" : "bg-emerald-300"}`} />
                      {maintenanceEnabled ? "ON" : "OFF"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    value={maintenanceEnabled ? "true" : "false"}
                    onChange={(e) => setMaintenanceEnabled(e.target.value === "true")}
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                  <Textarea value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} className="min-h-[92px] bg-secondary border-border" />
                  <Button onClick={saveMaintenanceMode} className="w-full">Save Mode</Button>
                  <p className="text-xs text-muted-foreground">Public maintenance visibility is handled by the included Supabase policy migration.</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><ShieldBan className="h-4 w-4 text-destructive" />Blacklisted IP / HWID Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {blacklistRows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No blacklist entries found</p>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                      {blacklistRows.map((entry: any) => (
                        <div key={entry.id} className="grid gap-2 px-3 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                          <Badge variant="outline" className="w-fit uppercase text-[10px]">{entry.type}</Badge>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm text-foreground">{entry.value}</p>
                            <p className="truncate text-xs text-muted-foreground">{entry.reason || "No reason provided"}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><Key className="h-4 w-4 text-destructive" />Admin-Blacklisted Licenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {adminBannedLicenses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No admin-banned license keys found</p>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                      {adminBannedLicenses.map((lic: any) => (
                        <div key={lic.id} className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm text-primary">{lic.license_key}</p>
                            <p className="truncate text-xs text-muted-foreground">{lic.applications?.name || "Unknown app"}</p>
                          </div>
                          <Badge variant="destructive" className="w-fit text-[10px]">ADMIN LOCKED</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </PageTransition>
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin User View</DialogTitle>
            <DialogDescription>
              Inspect the selected account safely. Direct account login requires the secure impersonation Edge Function to be deployed.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-secondary/30 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium text-foreground">{selectedUser.username || "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{selectedUser.email || "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">User ID</span>
                <span className="max-w-[220px] truncate font-mono text-xs text-primary">{selectedUser.user_id}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={selectedUser.banned ? "destructive" : "secondary"}>{selectedUser.banned ? "Banned" : "Active"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Joined</span>
                <span className="text-foreground">{formatDate(selectedUser.created_at)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
