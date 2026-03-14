import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyDiscord } from "@/lib/discord-notify";

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

  const fetchManagers = async () => {
    if (!user) return;
    // Get all manager user_ids from user_roles, then fetch profiles
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "manager");
    if (!roles || roles.length === 0) { setManagers([]); return; }
    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
    setManagers(profiles || []);
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
        body: {
          username: newUsername.trim(),
          email: newEmail.trim(),
          password: newPassword,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: `Manager "${newUsername.trim()}" created`,
      });

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
    // Delete user_roles entry (profile will remain)
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "manager");
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Manager "${username}" removed` });
    toast.success("Manager removed");
    notifyDiscord("Manager removed", { Username: username });
    fetchManagers();
  };

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

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search managers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[500px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{m.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(m.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteManager(m.user_id, m.username)} title="Remove Manager" className="hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
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
