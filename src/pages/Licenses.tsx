import { useState, useEffect } from "react";
import { RoleLayout } from "@/components/RoleLayout";
import { PageTransition } from "@/components/PageTransition";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { generateLicenseKey, getLicenseStatusColor, formatDate, DURATION_OPTIONS, getDurationLabel } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Ban, ShieldCheck, RotateCcw, Clock, Copy, Trash2, CheckSquare, X, StickyNote, Tag, Download } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyDiscord } from "@/lib/discord-notify";
import { usePlanLimits } from "@/hooks/usePlanLimits";

export default function Licenses() {
  const { user } = useAuth();
  const { canCreate, getUsage, getLimit, refresh: refreshLimits } = usePlanLimits();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");
  const [keyCount, setKeyCount] = useState(1);
  const [duration, setDuration] = useState("30");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const [licRes, appRes] = await Promise.all([
      supabase.from("licenses").select("*, applications(name), resellers(username)").order("created_at", { ascending: false }),
      supabase.from("applications").select("*").eq("suspended", false),
    ]);
    setLicenses(licRes.data || []);
    setApps(appRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const filtered = licenses.filter((l) => {
    const s = search.toLowerCase();
    const matchSearch = l.license_key.toLowerCase().includes(s) ||
      (l.applications?.name || "").toLowerCase().includes(s) ||
      (l.notes || "").toLowerCase().includes(s) ||
      (l.owner_name || "").toLowerCase().includes(s) ||
      (l.tags || []).some((t: string) => t.toLowerCase().includes(s));
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (paged.every(l => selectedIds.has(l.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paged.forEach(l => next.delete(l.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paged.forEach(l => next.add(l.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedLicenses = licenses.filter(l => selectedIds.has(l.id));

  // Bulk actions
  const bulkBan = async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const keys = selectedLicenses.map(l => l.license_key).join(", ");
    await supabase.from("licenses").update({ banned: true, status: "banned", banned_by_admin: true }).in("id", ids);
    await supabase.from("activity_logs").insert({ user_id: user.id, action: `Bulk banned ${ids.length} license(s)` } as any);
    toast.success(`Banned ${ids.length} license(s)`);
    notifyDiscord("License banned", { Action: "Bulk ban", Count: ids.length, Keys: keys.slice(0, 200) });
    clearSelection();
    fetchData();
  };

  const bulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const keys = selectedLicenses.map(l => l.license_key).join(", ");
    await supabase.from("licenses").delete().in("id", ids);
    await supabase.from("activity_logs").insert({ user_id: user.id, action: `Bulk deleted ${ids.length} license(s)` } as any);
    toast.success(`Deleted ${ids.length} license(s)`);
    notifyDiscord("License deleted", { Action: "Bulk delete", Count: ids.length, Keys: keys.slice(0, 200) });
    clearSelection();
    fetchData();
  };

  const bulkExtend = async () => {
    if (!user || selectedIds.size === 0) return;
    const toUpdate = selectedLicenses;
    const keys = toUpdate.map(l => l.license_key).join(", ");
    for (const lic of toUpdate) {
      const newExpiry = new Date(new Date(lic.expires_at).getTime() + 30 * 86400000).toISOString();
      await supabase.from("licenses").update({ expires_at: newExpiry, status: "active" }).eq("id", lic.id);
    }
    await supabase.from("activity_logs").insert({ user_id: user.id, action: `Bulk extended ${toUpdate.length} license(s) +30 days` } as any);
    toast.success(`Extended ${toUpdate.length} license(s) by 30 days`);
    notifyDiscord("License extended", { Action: "Bulk extend", Count: toUpdate.length, Added: "+30 days", Keys: keys.slice(0, 200) });
    clearSelection();
    fetchData();
  };

  const bulkUnban = async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const toUnban = selectedLicenses.filter(l => l.banned);
    if (toUnban.length === 0) { toast.error("No banned licenses selected"); return; }
    for (const lic of toUnban) {
      const restoredStatus = lic.hwid ? "active" : "unused";
      await supabase.from("licenses").update({ banned: false, status: restoredStatus, banned_by_admin: false }).eq("id", lic.id);
    }
    await supabase.from("activity_logs").insert({ user_id: user.id, action: `Bulk unbanned ${toUnban.length} license(s)` } as any);
    toast.success(`Unbanned ${toUnban.length} license(s)`);
    notifyDiscord("License unbanned", { Action: "Bulk unban", Count: toUnban.length });
    clearSelection();
    fetchData();
  };

  const bulkResetHwid = async () => {
    if (!user || selectedIds.size === 0) return;
    const toReset = selectedLicenses.filter(l => l.hwid);
    if (toReset.length === 0) { toast.error("No licenses with HWID selected"); return; }
    for (const lic of toReset) {
      await supabase.from("licenses").update({ hwid: null, ip: null, status: "unused" }).eq("id", lic.id);
    }
    await supabase.from("activity_logs").insert({ user_id: user.id, action: `Bulk reset HWID for ${toReset.length} license(s)` } as any);
    toast.success(`Reset HWID for ${toReset.length} license(s)`);
    notifyDiscord("HWID reset", { Action: "Bulk reset", Count: toReset.length });
    clearSelection();
    fetchData();
  };

  const exportCsv = () => {
    const headers = ["License Key", "Application", "Owner", "Status", "HWID", "IP", "Device", "Expires", "Created", "Notes", "Tags"];
    const rows = filtered.map(l => [
      l.license_key,
      l.applications?.name || "",
      l.owner_name || "",
      l.status,
      l.hwid || "",
      l.ip || "",
      l.device_name || "",
      l.expires_at,
      l.created_at,
      (l.notes || "").replace(/"/g, '""'),
      (l.tags || []).join("; "),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `licenses_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} licenses`);
  };

  const generateKeys = async () => {
    if (!selectedApp || !user) return;
    if (generating) return;
    if (!canCreate("keys")) {
      toast.error(`Plan limit reached (${getUsage("keys")}/${getLimit("keys")} keys). Upgrade your plan.`);
      return;
    }
    setGenerating(true);
    const days = Number(duration);
    const inserts = Array.from({ length: keyCount }, () => ({
      license_key: generateLicenseKey(),
      application_id: selectedApp,
      user_id: user.id,
      expires_at: new Date(Date.now() + days * 86400000).toISOString(),
      status: "unused",
      owner_name: ownerName.trim() || null,
      owner_email: ownerEmail.trim() || null,
    }));
    const { error } = await supabase.from("licenses").insert(inserts as any);
    if (error) { toast.error(error.message); setGenerating(false); return; }

    const appName = apps.find(a => a.id === selectedApp)?.name || "Unknown";
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "License keys generated",
      application_id: selectedApp,
      application_name: appName,
    } as any);

    setDialogOpen(false);
    setOwnerName("");
    setOwnerEmail("");
    refreshLimits();
    toast.success(`Generated ${keyCount} license key(s)`);
    notifyDiscord("License keys generated", { App: appName, "App ID": selectedApp, Quantity: keyCount, Duration: getDurationLabel(Number(duration)), Owner: ownerName.trim() || "N/A" });
    fetchData();
    setGenerating(false);
  };

  const banKey = async (id: string, licenseKey: string) => {
    const lic = licenses.find(l => l.id === id);
    const appName = lic?.applications?.name || "Unknown";
    await supabase.from("licenses").update({ banned: true, status: "banned", banned_by_admin: true }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: "License banned", license_key: licenseKey, application_id: lic?.application_id, application_name: appName } as any);
    toast.success("License banned");
    notifyDiscord("License banned", { Key: licenseKey, App: appName, HWID: lic?.hwid || "N/A", IP: lic?.ip || "N/A" });
    fetchData();
  };

  const unbanKey = async (id: string, licenseKey: string, hwid: string | null) => {
    const lic = licenses.find(l => l.id === id);
    const appName = lic?.applications?.name || "Unknown";
    const restoredStatus = hwid ? "active" : "unused";
    await supabase.from("licenses").update({ banned: false, status: restoredStatus, banned_by_admin: false }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: "License unbanned", license_key: licenseKey, application_id: lic?.application_id, application_name: appName } as any);
    toast.success("License unbanned");
    notifyDiscord("License unbanned", { Key: licenseKey, App: appName, HWID: hwid || "N/A" });
    fetchData();
  };

  const resetHwid = async (id: string, licenseKey: string) => {
    const lic = licenses.find(l => l.id === id);
    const appName = lic?.applications?.name || "Unknown";
    await supabase.from("licenses").update({ hwid: null }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: "HWID reset", license_key: licenseKey, application_id: lic?.application_id, application_name: appName } as any);
    toast.success("HWID reset");
    notifyDiscord("HWID reset", { Key: licenseKey, App: appName, "Old HWID": lic?.hwid || "N/A" });
    fetchData();
  };

  const extendKey = async (id: string, currentExpiry: string, licenseKey: string) => {
    const lic = licenses.find(l => l.id === id);
    const appName = lic?.applications?.name || "Unknown";
    const newExpiry = new Date(new Date(currentExpiry).getTime() + 30 * 86400000).toISOString();
    await supabase.from("licenses").update({ expires_at: newExpiry, status: "active" }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: "License extended", license_key: licenseKey, application_id: lic?.application_id, application_name: appName } as any);
    toast.success("License extended by 30 days");
    notifyDiscord("License extended", { Key: licenseKey, App: appName, Added: "+30 days", "New Expiry": formatDate(newExpiry) });
    fetchData();
  };

  const deleteKey = async (id: string, licenseKey: string) => {
    const lic = licenses.find(l => l.id === id);
    const appName = lic?.applications?.name || "Unknown";
    const { error } = await supabase.from("licenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: "License deleted", license_key: licenseKey, application_id: lic?.application_id, application_name: appName } as any);
    toast.success("License deleted");
    notifyDiscord("License deleted", { Key: licenseKey, App: appName });
    fetchData();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const [editOwnerName, setEditOwnerName] = useState("");

  const openDetails = (lic: any) => {
    setEditingLicense(lic);
    setEditNotes(lic.notes || "");
    setEditTags((lic.tags || []).join(", "));
    setEditOwnerName(lic.owner_name || "");
    setDetailsDialogOpen(true);
  };

  const saveDetails = async () => {
    if (!editingLicense) return;
    const tagsArray = editTags.split(",").map(t => t.trim()).filter(Boolean);
    await supabase.from("licenses").update({ notes: editNotes || null, tags: tagsArray, owner_name: editOwnerName.trim() || null }).eq("id", editingLicense.id);
    toast.success("License details saved");
    setDetailsDialogOpen(false);
    fetchData();
  };

  const ActionButtons = ({ lic }: { lic: any }) => (
    <div className="flex items-center gap-1 flex-wrap">
      <Button variant="ghost" size="icon" onClick={() => copyKey(lic.license_key)} title="Copy key" className="hover:bg-primary/10 h-8 w-8">
        <Copy className="h-4 w-4 text-primary" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => extendKey(lic.id, lic.expires_at, lic.license_key)} title="Extend 30 days" className="hover:bg-primary/10 h-8 w-8">
        <Clock className="h-4 w-4 text-primary" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => resetHwid(lic.id, lic.license_key)} title="Reset HWID" className="hover:bg-warning/10 h-8 w-8">
        <RotateCcw className="h-4 w-4 text-warning" />
      </Button>
      {lic.banned ? (
        <Button variant="ghost" size="icon" onClick={() => unbanKey(lic.id, lic.license_key, lic.hwid)} title="Unban" className="hover:bg-emerald-500/10 h-8 w-8">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => banKey(lic.id, lic.license_key)} title="Ban" className="hover:bg-destructive/10 h-8 w-8">
          <Ban className="h-4 w-4 text-destructive" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={() => openDetails(lic)} title="Notes & Tags" className="hover:bg-accent/10 h-8 w-8">
        <StickyNote className="h-4 w-4 text-accent-foreground" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => deleteKey(lic.id, lic.license_key)} title="Delete" className="hover:bg-destructive/10 h-8 w-8">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );

  const BulkBar = () => {
    if (selectedIds.size === 0) return null;
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 animate-fade-in">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <Button size="sm" variant="outline" onClick={bulkExtend} className="h-8 text-xs">
            <Clock className="h-3 w-3 mr-1" /> Extend +30d
          </Button>
          <Button size="sm" variant="outline" onClick={bulkUnban} className="h-8 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
            <ShieldCheck className="h-3 w-3 mr-1" /> Unban
          </Button>
          <Button size="sm" variant="outline" onClick={bulkResetHwid} className="h-8 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
            <RotateCcw className="h-3 w-3 mr-1" /> Reset HWID
          </Button>
          <Button size="sm" variant="outline" onClick={bulkBan} className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
            <Ban className="h-3 w-3 mr-1" /> Ban
          </Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="h-8 text-xs">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <RoleLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Licenses</h1>
          <p className="text-sm text-muted-foreground">Manage license keys — {filtered.length} total</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportCsv} className="flex-1 sm:flex-none h-9 text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Generate Keys</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Generate License Keys</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select application" /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
                <Input type="number" min={1} max={100} value={keyCount} onChange={(e) => setKeyCount(Number(e.target.value))} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Buyer / Owner Name <span className="text-muted-foreground/60">(optional)</span></label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. John, Discord#1234..." className="bg-secondary border-border" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Buyer Email <span className="text-muted-foreground/60">(optional — required if buyer will use download portal)</span></label>
                <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="buyer@example.com" className="bg-secondary border-border" />
              </div>
              <Button onClick={generateKeys} disabled={generating} className="w-full btn-glow">{generating ? "Generating..." : "Generate"}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search keys, apps, owners..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="bg-secondary border-border pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="unused">Unused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkBar />

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {paged.map((lic, i) => (
          <div key={lic.id} className={`rounded-lg border bg-card p-4 animate-fade-in ${selectedIds.has(lic.id) ? 'border-primary/50 bg-primary/5' : 'border-border'}`} style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-start gap-3 mb-3">
              <Checkbox
                checked={selectedIds.has(lic.id)}
                onCheckedChange={() => toggleSelect(lic.id)}
                className="mt-1"
              />
              <button onClick={() => copyKey(lic.license_key)} className="license-key flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left min-w-0">
                <span className="truncate text-sm">{lic.license_key}</span>
                {copiedKey === lic.license_key ? (
                  <span className="text-xs text-emerald-400 font-sans font-medium shrink-0">Copied!</span>
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <span className="text-muted-foreground">App: </span>
                <span className="text-foreground">{lic.applications?.name || "Unknown"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${getLicenseStatusColor(lic.status)}`}>
                  {lic.status}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Used: </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${lic.hwid ? 'badge-active' : 'badge-suspended'}`}>
                  {lic.hwid ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Owner: </span>
                <span className="text-foreground">{lic.owner_name || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Reseller: </span>
                <span className="text-foreground">{lic.resellers?.username || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">HWID: </span>
                <span className="font-mono text-muted-foreground">{lic.hwid || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Expires: </span>
                <span className="text-muted-foreground">{formatDate(lic.expires_at)}</span>
              </div>
              {(lic.tags?.length > 0 || lic.notes) && (
                <div className="col-span-2 flex flex-wrap gap-1 mt-1">
                  {lic.notes && <span className="text-xs text-muted-foreground italic truncate max-w-full">📝 {lic.notes.slice(0, 50)}</span>}
                  {(lic.tags || []).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            <ActionButtons lic={lic} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No licenses found</div>
        )}
        <TablePagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-3 py-3 text-left">
                  <Checkbox
                    checked={paged.length > 0 && paged.every(l => selectedIds.has(l.id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Application</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tags</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">HWID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reseller</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((lic, i) => (
                <tr key={lic.id} className={`table-row-hover border-b border-border animate-fade-in ${selectedIds.has(lic.id) ? 'bg-primary/5' : ''}`} style={{ animationDelay: `${i * 20}ms` }}>
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={selectedIds.has(lic.id)}
                      onCheckedChange={() => toggleSelect(lic.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => copyKey(lic.license_key)} className="license-key flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                      <span className="text-xs">{lic.license_key}</span>
                      {copiedKey === lic.license_key ? (
                        <span className="text-xs text-emerald-400 font-sans font-medium">✓</span>
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-foreground text-xs">{lic.applications?.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{lic.owner_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {(lic.tags || []).slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">{tag}</Badge>
                      ))}
                      {(lic.tags || []).length > 3 && <span className="text-[10px] text-muted-foreground">+{lic.tags.length - 3}</span>}
                      {lic.notes && <span className="text-[10px] text-muted-foreground" title={lic.notes}>📝</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[100px]" title={lic.hwid || ""}>
                    {lic.hwid ? lic.hwid.slice(0, 12) + "…" : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">{lic.resellers?.username || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(lic.expires_at)}</td>
                  <td className="px-4 py-3">
                    <ActionButtons lic={lic} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No licenses found</div>
          )}
        </div>
        <div className="mt-4">
          <TablePagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Notes & Tags Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> License Details</DialogTitle></DialogHeader>
          {editingLicense && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">License Key</label>
                <p className="font-mono text-xs text-foreground break-all">{editingLicense.license_key}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Buyer / Owner Name</label>
                <Input
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  placeholder="e.g. John, Discord#1234..."
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this license..."
                  className="bg-secondary border-border min-h-[80px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Tags (comma separated)</label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="vip, premium, test..."
                  className="bg-secondary border-border"
                />
                {editTags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editTags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs border-primary/30 text-primary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={saveDetails} className="w-full btn-glow">Save Details</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
