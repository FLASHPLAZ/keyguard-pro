import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { mockApps } from "@/lib/mock-data";
import { Application } from "@/lib/license";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, PauseCircle, PlayCircle, Power, Search } from "lucide-react";
import { toast } from "sonner";

export default function Applications() {
  const [apps, setApps] = useState<Application[]>(mockApps);
  const [search, setSearch] = useState("");
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = apps.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const createApp = () => {
    if (!newAppName.trim()) return;
    const app: Application = {
      id: Date.now().toString(),
      name: newAppName.trim(),
      description: newAppDesc.trim(),
      suspended: false,
      kill_switch: false,
      created_at: new Date().toISOString(),
      total_licenses: 0,
      active_licenses: 0,
    };
    setApps([app, ...apps]);
    setNewAppName("");
    setNewAppDesc("");
    setDialogOpen(false);
    toast.success(`Application "${app.name}" created`);
  };

  const toggleSuspend = (id: string) => {
    setApps(apps.map((a) => (a.id === id ? { ...a, suspended: !a.suspended } : a)));
    toast.success("Application status updated");
  };

  const toggleKillSwitch = (id: string) => {
    setApps(apps.map((a) => (a.id === id ? { ...a, kill_switch: !a.kill_switch } : a)));
    toast.success("Kill switch toggled");
  };

  const deleteApp = (id: string) => {
    setApps(apps.filter((a) => a.id !== id));
    toast.success("Application deleted");
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">Manage your software applications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create App
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Application</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Application name"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                className="bg-secondary border-border"
              />
              <Input
                placeholder="Description"
                value={newAppDesc}
                onChange={(e) => setNewAppDesc(e.target.value)}
                className="bg-secondary border-border"
              />
              <Button onClick={createApp} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary border-border pl-10"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Licenses</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => (
              <tr key={app.id} className="table-row-hover border-b border-border">
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
                <td className="px-4 py-3 text-foreground">{app.total_licenses}</td>
                <td className="px-4 py-3 text-foreground">{app.active_licenses}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(app.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleSuspend(app.id)} title={app.suspended ? "Resume" : "Suspend"}>
                      {app.suspended ? <PlayCircle className="h-4 w-4 text-emerald-400" /> : <PauseCircle className="h-4 w-4 text-warning" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleKillSwitch(app.id)} title="Kill Switch">
                      <Power className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteApp(app.id)} title="Delete">
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
    </DashboardLayout>
  );
}
