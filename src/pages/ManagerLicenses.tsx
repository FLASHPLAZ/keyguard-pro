import { useState, useEffect } from "react";
import { ManagerLayout } from "@/components/ManagerLayout";
import { generateLicenseKey, getLicenseStatusColor, formatDate, DURATION_OPTIONS } from "@/lib/license";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Copy, Plus, Ban, ShieldCheck, RotateCcw, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerPermissions } from "@/hooks/useManagerPermissions";
import { notifyDiscord } from "@/lib/discord-notify";

export default function ManagerLicenses() {
  const { user } = useAuth();
  const { permissions } = useManagerPermissions();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");
  const [keyCount, setKeyCount] = useState(1);
  const [duration, setDuration] = useState("30");
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");

  const fetchData = async () => {
    if (!user) return;
    const [licRes, appRes] = await Promise.all([
      supabase.from("licenses").select("*, applications(name)").order("created_at", { ascending: false }),
      supabase.from("applications").select("*").eq("suspended", false),
    ]);
    setLicenses(licRes.data || []);
    setApps(appRes.data || []);
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

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  };

  const createLicenses = async () => {
    if (!selectedApp || !user) return;
    const appName = apps.find(a => a.id === selectedApp)?.name || "Unknown";
    const durationDays = parseInt(duration);
    const keys: string[] = [];

    for (let i = 0; i < keyCount; i++) {
      const key = generateLicenseKey();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      keys.push(key);

      await supabase.from("licenses").insert({
        license_key: key,
        application_id: selectedApp,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        status: "unused",
        owner_name: ownerName.trim() || null,
      });
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: `Manager created ${keyCount} license(s)`,
      application_id: selectedApp,
      application_name: appName,
    });

    notifyDiscord("Manager created licenses", {
      App: appName,
      Count: keyCount,
      Duration: `${durationDays} days`,
      Owner: ownerName.trim() || "N/A",
      "Created by": user.email || "Manager",
    });

    toast.success(`${keyCount} license key(s) created!`);
    setDialogOpen(false);
    setSelectedApp("");
    setKeyCount(1);
    setOwnerName("");
    fetchData();
  };

  const banLicense = async (lic: any) => {
    await supabase.from("licenses").update({ banned: true, status: "banned" }).eq("id", lic.id);
    const appName = lic.applications?.name || "Unknown";
    await supabase.from("activity_logs").insert({
      user_id: user!.id,
      action: "Manager banned license",
      license_key: lic.license_key,
      application_id: lic.application_id,
      application_name: appName,
      hwid: lic.hwid,
      ip: lic.ip,
    });
    notifyDiscord("Manager banned license", { Key: lic.license_key, App: appName, HWID: lic.hwid, IP: lic.ip });
    toast.success("License banned");
    fetchData();
  };

  const unbanLicense = async (lic: any) => {
    const newStatus = lic.hwid ? "active" : "unused";
    await supabase.from("licenses").update({ banned: false, status: newStatus }).eq("id", lic.id);
    const appName = lic.applications?.name || "Unknown";
    await supabase.from("activity_logs").insert({
      user_id: user!.id,
      action: "Manager unbanned license",
      license_key: lic.license_key,
      application_id: lic.application_id,
      application_name: appName,
    });
    notifyDiscord("Manager unbanned license", { Key: lic.license_key, App: appName });
    toast.success("License unbanned");
    fetchData();
  };

  const resetHwid = async (lic: any) => {
    const previousHwid = lic.hwid;
    await supabase.from("licenses").update({ hwid: null, ip: null, status: "unused" }).eq("id", lic.id);
    const appName = lic.applications?.name || "Unknown";
    await supabase.from("activity_logs").insert({
      user_id: user!.id,
      action: "Manager reset HWID",
      license_key: lic.license_key,
      application_id: lic.application_id,
      application_name: appName,
      hwid: previousHwid,
      ip: lic.ip,
    });
    notifyDiscord("Manager reset HWID", { Key: lic.license_key, App: appName, "Previous HWID": previousHwid });
    toast.success("HWID reset");
    fetchData();
  };

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

  return (
    <ManagerLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Licenses</h1>
          <p className="text-sm text-muted-foreground">Manage license keys</p>
        </div>
        {permissions.can_create_licenses && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-glow w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Create License</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
              <DialogHeader><DialogTitle>Create License Keys</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Application</label>
                  <Select value={selectedApp} onValueChange={setSelectedApp}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select app" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {apps.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {DURATION_OPTIONS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Number of Keys</label>
                  <Input type="number" min={1} max={50} value={keyCount} onChange={e => setKeyCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Buyer / Owner Name <span className="text-muted-foreground/60">(optional)</span></label>
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. John, Discord#1234..." className="bg-secondary border-border" />
                </div>
                <Button onClick={createLicenses} className="w-full btn-glow" disabled={!selectedApp}>Create Keys</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search keys or apps..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="bg-secondary border-border pl-10" />
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

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[700px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Application</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tags</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">HWID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((lic, i) => (
                <tr key={lic.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3 license-key text-xs">{lic.license_key}</td>
                  <td className="px-4 py-3 text-foreground text-xs">{lic.applications?.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{lic.owner_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>{lic.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {(lic.tags || []).slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">{tag}</Badge>
                      ))}
                      {(lic.tags || []).length > 3 && <span className="text-[10px] text-muted-foreground">+{lic.tags.length - 3}</span>}
                      {lic.notes && <span className="text-[10px]" title={lic.notes}>📝</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[100px]" title={lic.hwid || ""}>{lic.hwid ? lic.hwid.slice(0, 12) + "…" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(lic.expires_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyKey(lic.license_key)} className="hover:bg-primary/10 h-8 w-8" title="Copy key">
                        <Copy className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDetails(lic)} className="hover:bg-accent/10 h-8 w-8" title="Notes & Tags">
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      {permissions.can_ban_licenses && (
                        lic.status === "banned" ? (
                          <Button variant="ghost" size="icon" onClick={() => unbanLicense(lic)} className="hover:bg-emerald-500/10 h-8 w-8" title="Unban">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => banLicense(lic)} className="hover:bg-destructive/10 h-8 w-8" title="Ban">
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )
                      )}
                      {permissions.can_reset_hwid && lic.hwid && (
                        <Button variant="ghost" size="icon" onClick={() => resetHwid(lic)} className="hover:bg-amber-500/10 h-8 w-8" title="Reset HWID">
                          <RotateCcw className="h-4 w-4 text-amber-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No licenses found</div>
          )}
        </div>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4">
          <TablePagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      )}

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
    </ManagerLayout>
  );
}