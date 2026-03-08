import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, PauseCircle, PlayCircle, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Applications() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchApps = async () => {
    if (!user) return;
    const { data } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    setApps(data || []);
  };

  useEffect(() => { fetchApps(); }, [user]);

  const filtered = apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const createApp = async () => {
    if (!newAppName.trim() || !user) return;
    const { error } = await supabase.from("applications").insert({
      name: newAppName.trim(),
      description: newAppDesc.trim(),
      user_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: `Application "${newAppName.trim()}" created`,
    });
    setNewAppName("");
    setNewAppDesc("");
    setDialogOpen(false);
    toast.success(`Application "${newAppName}" created`);
    fetchApps();
  };

  const toggleSuspend = async (id: string, current: boolean, name: string) => {
    await supabase.from("applications").update({ suspended: !current }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Application "${name}" ${!current ? "suspended" : "resumed"}` });
    toast.success("Application status updated");
    fetchApps();
  };

  const toggleKillSwitch = async (id: string, current: boolean, name: string) => {
    await supabase.from("applications").update({ kill_switch: !current }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Kill switch ${!current ? "enabled" : "disabled"} for "${name}"` });
    toast.success("Kill switch toggled");
    fetchApps();
  };

  const deleteApp = async (id: string, name: string) => {
    await supabase.from("applications").delete().eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Application "${name}" deleted` });
    toast.success("Application deleted");
    fetchApps();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">Manage your software applications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-glow w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Create App</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Create Application</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Application name" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} className="bg-secondary border-border" />
              <Input placeholder="Description" value={newAppDesc} onChange={(e) => setNewAppDesc(e.target.value)} className="bg-secondary border-border" />
              <Button onClick={createApp} className="w-full btn-glow">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[550px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => (
                <tr key={app.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {app.kill_switch ? (
                      <span className="badge-banned inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">KILLED</span>
                    ) : app.suspended ? (
                      <span className="badge-suspended inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">Suspended</span>
                    ) : (
                      <span className="badge-active inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(app.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleSuspend(app.id, app.suspended, app.name)} title={app.suspended ? "Resume" : "Suspend"} className="hover:bg-warning/10">
                        {app.suspended ? <PlayCircle className="h-4 w-4 text-emerald-400" /> : <PauseCircle className="h-4 w-4 text-warning" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleKillSwitch(app.id, app.kill_switch, app.name)} title="Kill Switch" className="hover:bg-destructive/10">
                        <Power className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteApp(app.id, app.name)} title="Delete" className="hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No applications found</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
