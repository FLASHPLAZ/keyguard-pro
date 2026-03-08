import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, CreditCard, Trash2, Eye, EyeOff } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Resellers() {
  const { user } = useAuth();
  const [resellers, setResellers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newCredits, setNewCredits] = useState(10);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchData = async () => {
    if (!user) return;
    const [resRes, appRes] = await Promise.all([
      supabase.from("resellers").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("id, name"),
    ]);
    setResellers(resRes.data || []);
    setApps(appRes.data || []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const filtered = resellers.filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((a) => a !== appId) : [...prev, appId]
    );
  };

  const createReseller = async () => {
    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim() || !user) return;
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (selectedApps.length === 0) { toast.error("Select at least one app"); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-reseller", {
        body: {
          username: newUsername.trim(),
          email: newEmail.trim(),
          password: newPassword,
          credits: newCredits,
          allowed_apps: selectedApps,
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: `Reseller "${newUsername.trim()}" created with ${newCredits} credits`,
      });

      setNewUsername(""); setNewEmail(""); setNewPassword("");
      setNewCredits(10); setSelectedApps([]);
      setDialogOpen(false);
      toast.success(`Reseller "${newUsername}" created successfully!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create reseller");
    } finally {
      setCreating(false);
    }
  };

  const addCredits = async (id: string, current: number, username: string) => {
    await supabase.from("resellers").update({ credits: current + 10 }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Added 10 credits to reseller "${username}"` });
    toast.success("Added 10 credits");
    fetchData();
  };

  const deleteReseller = async (id: string, username: string) => {
    await supabase.from("resellers").delete().eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Reseller "${username}" deleted` });
    toast.success("Reseller deleted");
    fetchData();
  };

  const getAppNames = (allowedApps: string[] | null) => {
    if (!allowedApps || allowedApps.length === 0) return "None";
    return allowedApps.map((id) => apps.find((a) => a.id === id)?.name || "Unknown").join(", ");
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Resellers</h1>
          <p className="text-sm text-muted-foreground">Manage reseller accounts, credits, and app access</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Add Reseller</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="mb-1 block text-xs text-muted-foreground">Initial Credits</label>
                  <Input type="number" min={1} value={newCredits} onChange={(e) => setNewCredits(Number(e.target.value))} className="bg-secondary border-border" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Allowed Applications</label>
                {apps.length === 0 && <p className="text-xs text-muted-foreground">No apps available. Create an application first.</p>}
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border border-border bg-secondary/50 p-3">
                  {apps.map((app) => (
                    <label key={app.id} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/80 rounded px-2 py-1.5 transition-colors">
                      <Checkbox checked={selectedApps.includes(app.id)} onCheckedChange={() => toggleApp(app.id)} />
                      <span className="text-sm text-foreground">{app.name}</span>
                    </label>
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

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search resellers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[750px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Credits</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Generated</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Allowed Apps</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3"><span className="font-mono text-primary font-semibold">{r.credits}</span></td>
                  <td className="px-4 py-3 text-foreground">{r.total_generated}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{getAppNames(r.allowed_apps)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => addCredits(r.id, r.credits, r.username)} title="Add 10 credits" className="hover:bg-primary/10">
                        <CreditCard className="h-4 w-4 text-primary" />
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
    </DashboardLayout>
  );
}
