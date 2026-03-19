import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Eye, EyeOff, Shield, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyDiscord } from "@/lib/discord-notify";

interface ManagerPerms {
  can_create_apps: boolean;
  can_edit_apps: boolean;
  can_delete_apps: boolean;
  can_view_licenses: boolean;
  can_create_licenses: boolean;
  can_ban_licenses: boolean;
  can_reset_hwid: boolean;
}

const DEFAULT_PERMS: ManagerPerms = {
  can_create_apps: true,
  can_edit_apps: true,
  can_delete_apps: true,
  can_view_licenses: true,
  can_create_licenses: false,
  can_ban_licenses: false,
  can_reset_hwid: false,
};

export default function Managers() {
  const { user } = useAuth();
  const [managers, setManagers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [permDialogManager, setPermDialogManager] = useState<any>(null);
  const [editPerms, setEditPerms] = useState<ManagerPerms>(DEFAULT_PERMS);
  const [savingPerms, setSavingPerms] = useState(false);
  const [managerPermsMap, setManagerPermsMap] = useState<Record<string, ManagerPerms>>({});

  const fetchManagers = async () => {
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "manager");
    if (!roles || roles.length === 0) { setManagers([]); return; }
    const userIds = roles.map(r => r.user_id);
    const [{ data: profiles }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("*").in("user_id", userIds),
      supabase.from("manager_permissions").select("*").in("user_id", userIds),
    ]);
    setManagers(profiles || []);
    const permsMap: Record<string, ManagerPerms> = {};
    (perms || []).forEach((p: any) => {
      permsMap[p.user_id] = {
        can_create_apps: p.can_create_apps,
        can_edit_apps: p.can_edit_apps,
        can_delete_apps: p.can_delete_apps,
        can_view_licenses: p.can_view_licenses,
        can_create_licenses: p.can_create_licenses,
        can_ban_licenses: p.can_ban_licenses,
        can_reset_hwid: p.can_reset_hwid,
      };
    });
    setManagerPermsMap(permsMap);
  };

  useEffect(() => { fetchManagers(); }, [user]);

  const filtered = managers.filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const createManager = async () => {
    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim() || !user) return;
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-manager", {
        body: { username: newUsername.trim(), email: newEmail.trim(), password: newPassword },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Manager created",
      });

      if (data?.userId) {
        await supabase.from("manager_permissions").insert({ user_id: data.userId });
      }

      setNewUsername(""); setNewEmail(""); setNewPassword("");
      setDialogOpen(false);
      notifyDiscord("Manager created", { Username: newUsername.trim(), Email: newEmail.trim() });
      toast.success(`Manager "${newUsername}" created successfully!`);
      fetchManagers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create manager");
    } finally {
      setCreating(false);
    }
  };

  const deleteManager = async (userId: string, username: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-manager", {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: "Manager removed" });
      toast.success("Manager permanently deleted");
      notifyDiscord("Manager removed", { Username: username });
      fetchManagers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete manager");
    }
  };

  const openPermissions = (manager: any) => {
    setPermDialogManager(manager);
    setEditPerms(managerPermsMap[manager.user_id] || DEFAULT_PERMS);
  };

  const savePermissions = async () => {
    if (!permDialogManager || !user) return;
    setSavingPerms(true);
    try {
      const { data: existing } = await supabase
        .from("manager_permissions")
        .select("id")
        .eq("user_id", permDialogManager.user_id)
        .maybeSingle();

      if (existing) {
        await supabase.from("manager_permissions").update({
          ...editPerms,
          updated_at: new Date().toISOString(),
        }).eq("user_id", permDialogManager.user_id);
      } else {
        await supabase.from("manager_permissions").insert({
          user_id: permDialogManager.user_id,
          ...editPerms,
        });
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Manager permissions updated",
      });

      const permSummary = Object.entries(editPerms)
        .map(([k, v]) => `${k.replace("can_", "").replace("_", " ")}: ${v ? "✅" : "❌"}`)
        .join(", ");

      notifyDiscord("Manager permissions updated", {
        Manager: permDialogManager.username,
        "Create Apps": editPerms.can_create_apps ? "Yes" : "No",
        "Edit Apps": editPerms.can_edit_apps ? "Yes" : "No",
        "Delete Apps": editPerms.can_delete_apps ? "Yes" : "No",
        "View Licenses": editPerms.can_view_licenses ? "Yes" : "No",
        "Create Licenses": editPerms.can_create_licenses ? "Yes" : "No",
        "Ban/Unban Licenses": editPerms.can_ban_licenses ? "Yes" : "No",
        "Reset HWID": editPerms.can_reset_hwid ? "Yes" : "No",
      });

      toast.success("Permissions updated");
      setPermDialogManager(null);
      fetchManagers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  const permissionLabels: { key: keyof ManagerPerms; label: string; description: string }[] = [
    { key: "can_create_apps", label: "Create Applications", description: "Can create new applications" },
    { key: "can_edit_apps", label: "Edit Applications", description: "Can suspend, toggle kill switch, and edit app settings" },
    { key: "can_delete_apps", label: "Delete Applications", description: "Can permanently delete applications" },
    { key: "can_view_licenses", label: "View Licenses", description: "Can view all licenses (read-only)" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Managers</h1>
          <p className="text-sm text-muted-foreground">Create and manage manager accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Add Manager</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Create Manager Account</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Username</label>
                <Input placeholder="manager1" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                <Input placeholder="manager@mail.com" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-secondary border-border" />
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
              <Button onClick={createManager} className="w-full btn-glow" disabled={creating}>
                {creating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Create Manager"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissions Dialog */}
      <Dialog open={!!permDialogManager} onOpenChange={() => setPermDialogManager(null)}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Permissions — {permDialogManager?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {permissionLabels.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={editPerms[key]}
                  onCheckedChange={(checked) => setEditPerms({ ...editPerms, [key]: checked })}
                />
              </div>
            ))}
            <Button onClick={savePermissions} className="w-full btn-glow" disabled={savingPerms}>
              {savingPerms ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Save Permissions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search managers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permissions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const perms = managerPermsMap[m.user_id] || DEFAULT_PERMS;
                const activeCount = [perms.can_create_apps, perms.can_edit_apps, perms.can_delete_apps, perms.can_view_licenses].filter(Boolean).length;
                return (
                  <tr key={m.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{m.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${activeCount === 4 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                        {activeCount}/4 active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openPermissions(m)} title="Edit Permissions" className="hover:bg-primary/10">
                          <Settings2 className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteManager(m.user_id, m.username)} title="Remove Manager" className="hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No managers found</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
