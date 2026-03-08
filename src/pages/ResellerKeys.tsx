import { useState, useEffect } from "react";
import { ResellerLayout } from "@/components/ResellerLayout";
import { generateLicenseKey, getLicenseStatusColor, formatDate } from "@/lib/license";
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
  const [duration, setDuration] = useState(30);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    const { data: resellerData } = await supabase
      .from("resellers")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setReseller(resellerData);

    if (resellerData) {
      if (resellerData.allowed_apps?.length > 0) {
        const { data: appsData } = await supabase
          .from("applications")
          .select("id, name")
          .in("id", resellerData.allowed_apps);
        setAllowedApps(appsData || []);
      }

      const { data: licData } = await supabase
        .from("licenses")
        .select("*, applications(name)")
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
      // Find the admin who owns this app to set as license user_id
      const { data: appData } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", selectedApp)
        .single();

      if (!appData) { toast.error("Application not found"); return; }

      const inserts = Array.from({ length: keyCount }, () => ({
        license_key: generateLicenseKey(),
        application_id: selectedApp,
        user_id: appData.user_id,
        created_by_reseller: reseller.id,
        expires_at: new Date(Date.now() + duration * 86400000).toISOString(),
        status: "unused",
      }));

      const { error } = await supabase.from("licenses").insert(inserts);
      if (error) throw error;

      // Deduct credits and increment total_generated
      await supabase.from("resellers").update({
        credits: reseller.credits - keyCount,
        total_generated: reseller.total_generated + keyCount,
      }).eq("id", reseller.id);

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generate Keys</h1>
          <p className="text-sm text-muted-foreground">
            Credits: <span className="font-mono text-primary font-semibold">{reseller?.credits || 0}</span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!reseller || reseller.credits < 1}>
              <Plus className="mr-2 h-4 w-4" /> Generate Keys
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={reseller?.credits || 1}
                    value={keyCount}
                    onChange={(e) => setKeyCount(Math.min(Number(e.target.value), reseller?.credits || 1))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Duration (days)</label>
                  <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-secondary border-border" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This will use <span className="text-primary font-semibold">{keyCount}</span> credit(s).
                Remaining: <span className="text-primary font-semibold">{(reseller?.credits || 0) - keyCount}</span>
              </p>
              <Button onClick={generateKeys} className="w-full" disabled={generating}>
                {generating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search keys..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
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
            {filtered.map((lic) => (
              <tr key={lic.id} className="table-row-hover border-b border-border">
                <td className="px-4 py-3">
                  <span className="license-key">{lic.license_key}</span>
                </td>
                <td className="px-4 py-3 text-foreground">{lic.applications?.name || "Unknown"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                    {lic.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(lic.expires_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => copyKey(lic.license_key)}>
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
    </ResellerLayout>
  );
}
