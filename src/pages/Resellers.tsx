import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Trash2, Eye, EyeOff, Pencil, Minus } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyDiscord } from "@/lib/discord-notify";

export default function Resellers() {
  const { user } = useAuth();
  const [resellers, setResellers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [appCreditsMap, setAppCreditsMap] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<any>(null);
  const [editAppCredits, setEditAppCredits] = useState<Record<string, number>>({});
  const [editSelectedApps, setEditSelectedApps] = useState<string[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newAppCredits, setNewAppCredits] = useState<Record<string, number>>({});
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchData = async () => {
    if (!user) return;
    const [resRes, appRes, creditsRes] = await Promise.all([
      supabase.from("resellers").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("id, name"),
      supabase.from("reseller_app_credits").select("*"),
    ]);
    setResellers(resRes.data || []);
    setApps(appRes.data || []);

    // Group credits by reseller_id
    const creditsGrouped: Record<string, any[]> = {};
    (creditsRes.data || []).forEach((c: any) => {
      if (!creditsGrouped[c.reseller_id]) creditsGrouped[c.reseller_id] = [];
      creditsGrouped[c.reseller_id].push(c);
    });
    setAppCreditsMap(creditsGrouped);
  };

  useEffect(() => { fetchData(); }, [user]);

  const filtered = resellers.filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) => {
      if (prev.includes(appId)) {
        const updated = { ...newAppCredits };
        delete updated[appId];
        setNewAppCredits(updated);
        return prev.filter((a) => a !== appId);
      } else {
        setNewAppCredits({ ...newAppCredits, [appId]: 10 });
        return [...prev, appId];
      }
    });
  };

  const toggleEditApp = (appId: string) => {
    setEditSelectedApps((prev) => {
      if (prev.includes(appId)) {
        const updated = { ...editAppCredits };
        delete updated[appId];
        setEditAppCredits(updated);
        return prev.filter((a) => a !== appId);
      } else {
        setEditAppCredits({ ...editAppCredits, [appId]: 0 });
        return [...prev, appId];
      }
    });
  };

  const openEditDialog = (reseller: any) => {
    setEditingReseller(reseller);
    const currentApps = reseller.allowed_apps || [];
    setEditSelectedApps(currentApps);
    
    // Load per-app credits
    const credits: Record<string, number> = {};
    const resellerCredits = appCreditsMap[reseller.id] || [];
    currentApps.forEach((appId: string) => {
      const found = resellerCredits.find((c: any) => c.application_id === appId);
      credits[appId] = found?.credits || 0;
    });
    setEditAppCredits(credits);
    setEditDialogOpen(true);
  };

  const saveReseller = async () => {
    if (!editingReseller || !user) return;
    setSaving(true);
    try {
      // Update allowed_apps on reseller
      const { error } = await supabase.from("resellers").update({
        allowed_apps: editSelectedApps,
      }).eq("id", editingReseller.id);
      if (error) throw error;

      // Upsert per-app credits
      for (const appId of editSelectedApps) {
        const credits = editAppCredits[appId] || 0;
        await supabase.from("reseller_app_credits").upsert({
          reseller_id: editingReseller.id,
          application_id: appId,
          credits,
        }, { onConflict: "reseller_id,application_id" });
      }

      // Delete credits for removed apps
      const removedApps = (editingReseller.allowed_apps || []).filter(
        (id: string) => !editSelectedApps.includes(id)
      );
      if (removedApps.length > 0) {
        await supabase.from("reseller_app_credits")
          .delete()
          .eq("reseller_id", editingReseller.id)
          .in("application_id", removedApps);
      }

      // Calculate total credits for backward compat
      const totalCredits = editSelectedApps.reduce((sum, id) => sum + (editAppCredits[id] || 0), 0);
      await supabase.from("resellers").update({ credits: totalCredits }).eq("id", editingReseller.id);

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: `Updated reseller "${editingReseller.username}" — ${editSelectedApps.length} apps configured`,
      });

      setEditDialogOpen(false);
      toast.success(`Reseller "${editingReseller.username}" updated`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update reseller");
    } finally {
      setSaving(false);
    }
  };

  const createReseller = async () => {
    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim() || !user) return;
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (selectedApps.length === 0) { toast.error("Select at least one app"); return; }

    const totalCredits = selectedApps.reduce((sum, id) => sum + (newAppCredits[id] || 0), 0);

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-reseller", {
        body: {
          username: newUsername.trim(),
          email: newEmail.trim(),
          password: newPassword,
          credits: totalCredits,
          allowed_apps: selectedApps,
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      // Get the created reseller to insert per-app credits
      const { data: newReseller } = await supabase.from("resellers")
        .select("id").eq("email", newEmail.trim()).single();

      if (newReseller) {
        const creditInserts = selectedApps.map(appId => ({
          reseller_id: newReseller.id,
          application_id: appId,
          credits: newAppCredits[appId] || 0,
        }));
        await supabase.from("reseller_app_credits").insert(creditInserts);
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: `Reseller "${newUsername.trim()}" created with per-app credits`,
      });

      setNewUsername(""); setNewEmail(""); setNewPassword("");
      setNewAppCredits({}); setSelectedApps([]);
      setDialogOpen(false);
      toast.success(`Reseller "${newUsername}" created successfully!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create reseller");
    } finally {
      setCreating(false);
    }
  };

  const deleteReseller = async (id: string, username: string) => {
    await supabase.from("resellers").delete().eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Reseller "${username}" deleted` });
    toast.success("Reseller deleted");
    fetchData();
  };

  const getAppCreditsDisplay = (resellerId: string) => {
    const credits = appCreditsMap[resellerId] || [];
    if (credits.length === 0) return "No credits";
    return credits.map(c => {
      const appName = apps.find(a => a.id === c.application_id)?.name || "Unknown";
      return `${appName}: ${c.credits}`;
    }).join(", ");
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Resellers</h1>
          <p className="text-sm text-muted-foreground">Manage reseller accounts with per-app credits</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Add Reseller</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Reseller Account</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Username</label>
                  <Input placeholder="reseller1" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                  <Input placeholder="reseller@mail.com" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Password</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-secondary border-border pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Applications & Credits Per App</label>
                {apps.length === 0 && <p className="text-xs text-muted-foreground">No apps available. Create an application first.</p>}
                <div className="space-y-2 max-h-52 overflow-y-auto rounded-md border border-border bg-secondary/50 p-3">
                  {apps.map((app) => (
                    <div key={app.id} className="space-y-1">
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-secondary/80 rounded px-2 py-1.5 transition-colors">
                        <Checkbox checked={selectedApps.includes(app.id)} onCheckedChange={() => toggleApp(app.id)} />
                        <span className="text-sm text-foreground">{app.name}</span>
                      </label>
                      {selectedApps.includes(app.id) && (
                        <div className="ml-8 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">Credits:</span>
                          <Input
                            type="number" min={0}
                            value={newAppCredits[app.id] || 0}
                            onChange={(e) => setNewAppCredits({ ...newAppCredits, [app.id]: Number(e.target.value) })}
                            className="bg-secondary border-border h-7 text-xs w-24"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={createReseller} className="w-full btn-glow" disabled={creating}>
                {creating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Create Reseller"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Reseller Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Reseller — {editingReseller?.username}</DialogTitle></DialogHeader>
          {editingReseller && (
            <div className="space-y-4 pt-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Applications & Credits</label>
                <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border border-border bg-secondary/50 p-3">
                  {apps.map((app) => (
                    <div key={app.id} className="space-y-1">
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-secondary/80 rounded px-2 py-1.5 transition-colors">
                        <Checkbox checked={editSelectedApps.includes(app.id)} onCheckedChange={() => toggleEditApp(app.id)} />
                        <span className="text-sm text-foreground">{app.name}</span>
                      </label>
                      {editSelectedApps.includes(app.id) && (
                        <div className="ml-8 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">Credits:</span>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setEditAppCredits({ ...editAppCredits, [app.id]: Math.max(0, (editAppCredits[app.id] || 0) - 10) })}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number" min={0}
                              value={editAppCredits[app.id] || 0}
                              onChange={(e) => setEditAppCredits({ ...editAppCredits, [app.id]: Number(e.target.value) })}
                              className="bg-secondary border-border h-7 text-xs w-20 text-center"
                            />
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setEditAppCredits({ ...editAppCredits, [app.id]: (editAppCredits[app.id] || 0) + 10 })}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {apps.length === 0 && <p className="text-xs text-muted-foreground">No apps available.</p>}
              </div>

              <div className="rounded-md bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Total credits: <span className="font-mono text-primary font-semibold">
                    {editSelectedApps.reduce((sum, id) => sum + (editAppCredits[id] || 0), 0)}
                  </span>
                </p>
              </div>

              <Button onClick={saveReseller} className="w-full btn-glow" disabled={saving}>
                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search resellers..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-3">
        {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((r, i) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">{r.username}</span>
              <span className="text-xs text-muted-foreground">Gen: {r.total_generated}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{r.email}</p>
            <div className="space-y-1 mb-3">
              {(appCreditsMap[r.id] || []).map((c: any) => (
                <div key={c.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{apps.find(a => a.id === c.application_id)?.name || "Unknown"}</span>
                  <span className="font-mono text-primary font-semibold">{c.credits} credits</span>
                </div>
              ))}
              {!(appCreditsMap[r.id]?.length) && <p className="text-xs text-muted-foreground">No per-app credits</p>}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{formatDate(r.created_at)}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openEditDialog(r)} className="flex-1">
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => deleteReseller(r.id, r.username)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No resellers found</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[750px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">App Credits</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Generated</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((r, i) => (
                <tr key={r.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {(appCreditsMap[r.id] || []).map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">{apps.find(a => a.id === c.application_id)?.name || "?"}</span>
                          <span className="font-mono text-primary font-semibold">{c.credits}</span>
                        </div>
                      ))}
                      {!(appCreditsMap[r.id]?.length) && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.total_generated}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(r)} title="Edit reseller" className="hover:bg-primary/10">
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteReseller(r.id, r.username)} title="Delete" className="hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No resellers found</div>
          )}
        </div>
      </div>

      <TablePagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
    </DashboardLayout>
  );
}
