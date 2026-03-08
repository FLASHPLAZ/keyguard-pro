import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { mockLicenses, mockApps } from "@/lib/mock-data";
import { License, generateLicenseKey, getLicenseStatusColor, formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Ban, RotateCcw, Clock, Copy } from "lucide-react";
import { toast } from "sonner";

export default function Licenses() {
  const [licenses, setLicenses] = useState<License[]>(mockLicenses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");
  const [keyCount, setKeyCount] = useState(1);
  const [duration, setDuration] = useState(30);

  const filtered = licenses.filter((l) => {
    const matchSearch =
      l.license_key.toLowerCase().includes(search.toLowerCase()) ||
      l.application_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const generateKeys = () => {
    if (!selectedApp) return;
    const app = mockApps.find((a) => a.id === selectedApp);
    if (!app) return;

    const newLicenses: License[] = [];
    for (let i = 0; i < keyCount; i++) {
      newLicenses.push({
        id: Date.now().toString() + i,
        license_key: generateLicenseKey(),
        application_id: selectedApp,
        application_name: app.name,
        hwid: null,
        ip: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + duration * 86400000).toISOString(),
        banned: false,
        status: "unused",
        last_used: null,
      });
    }
    setLicenses([...newLicenses, ...licenses]);
    setDialogOpen(false);
    toast.success(`Generated ${keyCount} license key(s)`);
  };

  const banKey = (id: string) => {
    setLicenses(licenses.map((l) => (l.id === id ? { ...l, banned: true, status: "banned" as const } : l)));
    toast.success("License banned");
  };

  const resetHwid = (id: string) => {
    setLicenses(licenses.map((l) => (l.id === id ? { ...l, hwid: null } : l)));
    toast.success("HWID reset");
  };

  const extendKey = (id: string) => {
    setLicenses(
      licenses.map((l) => {
        if (l.id !== id) return l;
        const newExpiry = new Date(new Date(l.expires_at).getTime() + 30 * 86400000).toISOString();
        return { ...l, expires_at: newExpiry, status: "active" as const };
      })
    );
    toast.success("License extended by 30 days");
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Licenses</h1>
          <p className="text-sm text-muted-foreground">Manage license keys for your applications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Generate Keys</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Generate License Keys</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {mockApps.filter((a) => !a.suspended).map((app) => (
                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
                  <Input type="number" min={1} max={100} value={keyCount} onChange={(e) => setKeyCount(Number(e.target.value))} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Duration (days)</label>
                  <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-secondary border-border" />
                </div>
              </div>
              <Button onClick={generateKeys} className="w-full">Generate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search keys or apps..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="unused">Unused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
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
            {filtered.map((lic) => (
              <tr key={lic.id} className="table-row-hover border-b border-border">
                <td className="px-4 py-3">
                  <button onClick={() => copyKey(lic.license_key)} className="license-key flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {lic.license_key}
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </td>
                <td className="px-4 py-3 text-foreground">{lic.application_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                    {lic.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lic.hwid || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(lic.expires_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => extendKey(lic.id)} title="Extend 30 days">
                      <Clock className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => resetHwid(lic.id)} title="Reset HWID">
                      <RotateCcw className="h-4 w-4 text-warning" />
                    </Button>
                    {!lic.banned && (
                      <Button variant="ghost" size="icon" onClick={() => banKey(lic.id)} title="Ban">
                        <Ban className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No licenses found</div>
        )}
      </div>
    </DashboardLayout>
  );
}
