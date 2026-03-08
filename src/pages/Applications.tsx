import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, PauseCircle, PlayCircle, Power, Search, Copy, Eye, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyDiscord } from "@/lib/discord-notify";

export default function Applications() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailApp, setDetailApp] = useState<any>(null);
  const [regenerateAppId, setRegenerateAppId] = useState<string | null>(null);

  const fetchApps = async () => {
    if (!user) return;
    const { data } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    setApps(data || []);
  };

  useEffect(() => { fetchApps(); }, [user]);

  const filtered = apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const createApp = async () => {
    if (!newAppName.trim() || !user) return;
    const { data, error } = await supabase.from("applications").insert({
      name: newAppName.trim(),
      description: newAppDesc.trim(),
      user_id: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: `Application "${newAppName.trim()}" created`,
    });
    setNewAppName("");
    setNewAppDesc("");
    setDialogOpen(false);
    toast.success(`Application "${newAppName}" created`);
    if (data) setDetailApp(data);
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

  const toggleSignatureRequired = async (id: string, current: boolean) => {
    await supabase.from("applications").update({ signature_required: !current }).eq("id", id);
    toast.success(`Request signing ${!current ? "enabled" : "disabled"}`);
    fetchApps();
    if (detailApp?.id === id) setDetailApp({ ...detailApp, signature_required: !current });
  };

  const regenerateSecret = async (id: string) => {
    // Generate a new 64-char hex secret client-side
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const newSecret = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    await supabase.from("applications").update({ signing_secret: newSecret }).eq("id", id);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, action: `Signing secret regenerated for app ${id}` });
    toast.success("Signing secret regenerated");
    setRegenerateAppId(null);
    fetchApps();
    if (detailApp?.id === id) setDetailApp({ ...detailApp, signing_secret: newSecret });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const validateEndpoint = `${supabaseUrl}/functions/v1/validate`;

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

      {/* App Details Dialog */}
      <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {detailApp && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Application Name</label>
                <p className="text-sm font-semibold text-foreground">{detailApp.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Application ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded bg-secondary px-3 py-2 text-xs font-mono text-primary break-all">{detailApp.id}</code>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(detailApp.id, "App ID")} className="hover:bg-primary/10 shrink-0">
                    <Copy className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Validation API Endpoint</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded bg-secondary px-3 py-2 text-xs font-mono text-primary break-all">{validateEndpoint}</code>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(validateEndpoint, "Endpoint")} className="hover:bg-primary/10 shrink-0">
                    <Copy className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>

              {/* Request Signing Section */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <label className="text-sm font-semibold text-foreground">Request Signing (HMAC)</label>
                  </div>
                  <Switch
                    checked={detailApp.signature_required || false}
                    onCheckedChange={() => toggleSignatureRequired(detailApp.id, detailApp.signature_required)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, all validation requests must include a valid HMAC-SHA256 signature. Unsigned requests will be rejected.
                </p>

                {detailApp.signing_secret && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Signing Secret</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 rounded bg-secondary px-3 py-2 text-xs font-mono text-primary break-all select-all">
                        {detailApp.signing_secret}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(detailApp.signing_secret, "Signing secret")} className="hover:bg-primary/10 shrink-0">
                        <Copy className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRegenerateAppId(detailApp.id)}
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Regenerate Secret
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Example Request (POST)</label>
                <div className="relative mt-1">
                  <pre className="rounded bg-secondary px-3 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">{`{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "application_id": "${detailApp.id}",
  "hwid": "MACHINE_HARDWARE_ID"
}`}</pre>
                  <Button
                    variant="ghost" size="icon"
                    className="absolute top-1 right-1 hover:bg-primary/10"
                    onClick={() => copyToClipboard(JSON.stringify({
                      license_key: "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
                      application_id: detailApp.id,
                      hwid: "MACHINE_HARDWARE_ID"
                    }, null, 2), "Example payload")}
                  >
                    <Copy className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Created</label>
                <p className="text-sm text-muted-foreground">{formatDate(detailApp.created_at)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Regenerate Secret Confirmation */}
      <AlertDialog open={!!regenerateAppId} onOpenChange={() => setRegenerateAppId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Signing Secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current signing secret. All clients using the old secret will fail signature verification until updated with the new secret.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenerateAppId && regenerateSecret(regenerateAppId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">App ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Signing</th>
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
                    <button onClick={() => copyToClipboard(app.id, "App ID")} className="font-mono text-xs text-primary hover:opacity-80 transition-opacity flex items-center gap-1 max-w-[140px] truncate" title={app.id}>
                      {app.id.slice(0, 8)}…
                      <Copy className="h-3 w-3 shrink-0" />
                    </button>
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
                  <td className="px-4 py-3">
                    {app.signature_required ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <ShieldCheck className="h-3 w-3" /> On
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Off</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(app.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailApp(app)} title="View Details" className="hover:bg-primary/10">
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
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
