import { useState, useEffect } from "react";
import { ResellerLayout } from "@/components/ResellerLayout";
import { generateLicenseKey, getLicenseStatusColor, formatDate, DURATION_OPTIONS, getDurationLabel } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Search, Ban, ShieldCheck, RotateCcw, Trash2 } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyDiscord } from "@/lib/discord-notify";

export default function ResellerKeys() {
  const { user } = useAuth();
  const [reseller, setReseller] = useState<any>(null);
  const [allowedApps, setAllowedApps] = useState<any[]>([]);
  const [appCredits, setAppCredits] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");
  const [keyCount, setKeyCount] = useState(1);
  const [duration, setDuration] = useState("30");
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchData = async () => {
    if (!user) return;
    const { data: resellerData } = await supabase
      .from("resellers").select("*").eq("user_id", user.id).single();
    setReseller(resellerData);

    if (resellerData) {
      const [appsRes, licRes, creditsRes] = await Promise.all([
        resellerData.allowed_apps?.length > 0
          ? supabase.from("applications").select("id, name").in("id", resellerData.allowed_apps)
          : Promise.resolve({ data: [] }),
        supabase.from("licenses").select("*, applications(name)")
          .eq("created_by_reseller", resellerData.id)
          .order("created_at", { ascending: false }),
        supabase.from("reseller_app_credits").select("*").eq("reseller_id", resellerData.id),
      ]);
      setAllowedApps(appsRes.data || []);
      setLicenses(licRes.data || []);
      setAppCredits(creditsRes.data || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const filtered = licenses.filter((l) =>
    l.license_key.toLowerCase().includes(search.toLowerCase()) ||
    (l.applications?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getAppCredit = (appId: string) => {
    return appCredits.find(c => c.application_id === appId)?.credits || 0;
  };

  const selectedAppCredits = selectedApp ? getAppCredit(selectedApp) : 0;

  const generateKeys = async () => {
    if (!selectedApp || !reseller || !user) return;
    
    const availableCredits = getAppCredit(selectedApp);
    if (availableCredits < keyCount) {
      toast.error(`Not enough credits for this app. Available: ${availableCredits}, need: ${keyCount}.`);
      return;
    }

    setGenerating(true);
    try {
      const { data: appData } = await supabase
        .from("applications").select("user_id, name").eq("id", selectedApp).single();
      if (!appData) { toast.error("Application not found"); return; }

      const days = Number(duration);
      const inserts = Array.from({ length: keyCount }, () => ({
        license_key: generateLicenseKey(),
        application_id: selectedApp,
        user_id: appData.user_id,
        created_by_reseller: reseller.id,
        expires_at: new Date(Date.now() + days * 86400000).toISOString(),
        status: "unused",
      }));

      const { error } = await supabase.from("licenses").insert(inserts);
      if (error) throw error;

      // Deduct per-app credits
      const creditRecord = appCredits.find(c => c.application_id === selectedApp);
      if (creditRecord) {
        await supabase.from("reseller_app_credits").update({
          credits: creditRecord.credits - keyCount,
          total_generated: creditRecord.total_generated + keyCount,
        }).eq("id", creditRecord.id);
      }

      // Update reseller total
      await Promise.all([
        supabase.from("resellers").update({
          credits: (reseller.credits || 0) - keyCount,
          total_generated: reseller.total_generated + keyCount,
        }).eq("id", reseller.id),
        supabase.from("activity_logs").insert({
          user_id: user.id,
          action: `Reseller generated ${keyCount} key(s) for ${appData.name} (${getDurationLabel(days)})`,
          application_id: selectedApp,
          application_name: appData.name,
        }),
      ]);

      notifyDiscord("Reseller generated keys", { Reseller: reseller.username, Application: appData.name, Quantity: keyCount, Duration: getDurationLabel(days) });
      setDialogOpen(false);
      toast.success(`Generated ${keyCount} key(s)! Credits remaining for this app: ${availableCredits - keyCount}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate keys");
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const banKey = async (id: string, licenseKey: string) => {
    const { error } = await supabase.from("licenses").update({ banned: true, status: "banned" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (user) {
      await supabase.from("activity_logs").insert({
        user_id: user.id, action: "Reseller banned license", license_key: licenseKey,
      });
    }
    notifyDiscord("Reseller banned license", { Reseller: reseller?.username, "License Key": licenseKey });
    toast.success("License banned");
    fetchData();
  };

  const unbanKey = async (id: string, licenseKey: string) => {
    const { error } = await supabase.from("licenses").update({ banned: false, status: "active" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (user) {
      await supabase.from("activity_logs").insert({
        user_id: user.id, action: "Reseller unbanned license", license_key: licenseKey,
      });
    }
    notifyDiscord("Reseller unbanned license", { Reseller: reseller?.username, "License Key": licenseKey });
    toast.success("License unbanned");
    fetchData();
  };

  const resetHwid = async (id: string, licenseKey: string) => {
    const { error } = await supabase.from("licenses").update({ hwid: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (user) {
      await supabase.from("activity_logs").insert({
        user_id: user.id, action: "Reseller reset HWID", license_key: licenseKey,
      });
    }
    notifyDiscord("Reseller HWID reset", { Reseller: reseller?.username, "License Key": licenseKey });
    toast.success("HWID reset");
    fetchData();
  };

  const deleteKey = async (id: string, licenseKey: string) => {
    const { error } = await supabase.from("licenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (user) {
      await supabase.from("activity_logs").insert({
        user_id: user.id, action: "Reseller deleted license", license_key: licenseKey,
      });
    }
    notifyDiscord("Reseller deleted license", { Reseller: reseller?.username, "License Key": licenseKey });
    toast.success("License deleted");
    fetchData();
  };

  return (
    <ResellerLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Generate Keys</h1>
          <div className="flex flex-wrap gap-3 mt-1">
            {appCredits.map(c => {
              const appName = allowedApps.find(a => a.id === c.application_id)?.name || "?";
              return (
                <span key={c.id} className="text-xs text-muted-foreground">
                  {appName}: <span className="font-mono text-primary font-semibold">{c.credits}</span>
                </span>
              );
            })}
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!reseller || appCredits.every(c => c.credits < 1)} className="btn-glow w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Generate Keys
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Generate License Keys</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Application</label>
                <Select value={selectedApp} onValueChange={setSelectedApp}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select app" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {allowedApps.map((app) => {
                      const credits = getAppCredit(app.id);
                      return (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name} ({credits} credits)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
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
                <Input
                  type="number" min={1} max={selectedAppCredits || 1}
                  value={keyCount}
                  onChange={(e) => setKeyCount(Math.min(Number(e.target.value), selectedAppCredits || 1))}
                  className="bg-secondary border-border"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will use <span className="text-primary font-semibold">{keyCount}</span> credit(s) from this app.
                Remaining: <span className="text-primary font-semibold">{selectedAppCredits - keyCount}</span>
              </p>
              <Button onClick={generateKeys} className="w-full btn-glow" disabled={generating || selectedAppCredits < keyCount}>
                {generating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : "Generate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search keys..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[750px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">App</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">HWID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((lic, i) => (
                <tr key={lic.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <button onClick={() => copyKey(lic.license_key)} className="license-key flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <span className="truncate max-w-[180px]">{lic.license_key}</span>
                      {copiedKey === lic.license_key ? (
                        <span className="text-xs text-emerald-400 font-sans font-medium shrink-0">Copied!</span>
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-foreground">{lic.applications?.name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lic.hwid || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(lic.expires_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => resetHwid(lic.id, lic.license_key)} title="Reset HWID" className="hover:bg-warning/10">
                        <RotateCcw className="h-4 w-4 text-warning" />
                      </Button>
                      {lic.banned ? (
                        lic.banned_by_admin ? (
                          <Button variant="ghost" size="icon" disabled title="Banned by admin" className="opacity-50 cursor-not-allowed">
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => unbanKey(lic.id, lic.license_key)} title="Unban" className="hover:bg-emerald-500/10">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          </Button>
                        )
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => banKey(lic.id, lic.license_key)} title="Ban" className="hover:bg-destructive/10">
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteKey(lic.id, lic.license_key)} title="Delete" className="hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => copyKey(lic.license_key)} title="Copy" className="hover:bg-primary/10">
                        <Copy className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No keys generated yet</div>
          )}
          <TablePagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      </div>
    </ResellerLayout>
  );
}
