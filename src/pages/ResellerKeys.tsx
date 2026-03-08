import { useState, useEffect } from "react";
import { ResellerLayout } from "@/components/ResellerLayout";
import { generateLicenseKey, getLicenseStatusColor, formatDate, DURATION_OPTIONS, getDurationLabel } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ResellerKeys() {
  const { user } = useAuth();
  const [reseller, setReseller] = useState<any>(null);
  const [allowedApps, setAllowedApps] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");
  const [keyCount, setKeyCount] = useState(1);
  const [duration, setDuration] = useState("30");
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const { data: resellerData } = await supabase
      .from("resellers").select("*").eq("user_id", user.id).single();
    setReseller(resellerData);

    if (resellerData) {
      if (resellerData.allowed_apps?.length > 0) {
        const { data: appsData } = await supabase
          .from("applications").select("id, name").in("id", resellerData.allowed_apps);
        setAllowedApps(appsData || []);
      }
      const { data: licData } = await supabase
        .from("licenses").select("*, applications(name)")
        .eq("created_by_reseller", resellerData.id)
        .order("created_at", { ascending: false });
      setLicenses(licData || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const filtered = licenses.filter((l) =>
    l.license_key.toLowerCase().includes(search.toLowerCase()) ||
    (l.applications?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const generateKeys = async () => {
    if (!selectedApp || !reseller || !user) return;
    if (reseller.credits < keyCount) {
      toast.error(`Not enough credits. You have ${reseller.credits}, need ${keyCount}.`);
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

      await Promise.all([
        supabase.from("resellers").update({
          credits: reseller.credits - keyCount,
          total_generated: reseller.total_generated + keyCount,
        }).eq("id", reseller.id),
        supabase.from("activity_logs").insert({
          user_id: user.id,
          action: `Reseller generated ${keyCount} key(s) (${getDurationLabel(days)})`,
          application_id: selectedApp,
          application_name: appData.name,
        }),
      ]);

      setDialogOpen(false);
      toast.success(`Generated ${keyCount} key(s)! Credits remaining: ${reseller.credits - keyCount}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate keys");
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  };

  return (
    <ResellerLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Generate Keys</h1>
          <p className="text-sm text-muted-foreground">
            Credits: <span className="font-mono text-primary font-semibold">{reseller?.credits || 0}</span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!reseller || reseller.credits < 1} className="btn-glow w-full sm:w-auto">
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
                    {allowedApps.map((app) => (
                      <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                    ))}
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
                  type="number" min={1} max={reseller?.credits || 1}
                  value={keyCount}
                  onChange={(e) => setKeyCount(Math.min(Number(e.target.value), reseller?.credits || 1))}
                  className="bg-secondary border-border"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will use <span className="text-primary font-semibold">{keyCount}</span> credit(s).
                Remaining: <span className="text-primary font-semibold">{(reseller?.credits || 0) - keyCount}</span>
              </p>
              <Button onClick={generateKeys} className="w-full btn-glow" disabled={generating}>
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
          <Input placeholder="Search keys..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="table-responsive">
        <div className="rounded-lg border border-border overflow-hidden min-w-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">App</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Copy</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lic, i) => (
                <tr key={lic.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3"><span className="license-key">{lic.license_key}</span></td>
                  <td className="px-4 py-3 text-foreground">{lic.applications?.name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(lic.expires_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => copyKey(lic.license_key)} className="hover:bg-primary/10">
                      <Copy className="h-4 w-4 text-primary" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No keys generated yet</div>
          )}
        </div>
      </div>
    </ResellerLayout>
  );
}
