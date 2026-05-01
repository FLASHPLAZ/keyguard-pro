import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Bell, Settings2, Save, Loader2, Lock, Ban, ShieldCheck, Plus, Trash2, Search, Copy, Clock, RotateCcw, ShieldBan, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TablePagination } from "@/components/TablePagination";
import { useAuth } from "@/contexts/AuthContext";
import { getLicenseStatusColor, formatDate } from "@/lib/license";
import { notifyDiscord } from "@/lib/discord-notify";

interface SettingsState {
  rate_limit_max: string;
  rate_limit_window: string;
  heartbeat_rate_limit_max: string;
  heartbeat_rate_limit_window: string;
  resethwid_rate_limit_max: string;
  resethwid_rate_limit_window: string;
  discord_webhook_url: string;
  ip_change_threshold: string;
  auto_ban_enabled: string;
  bot_api_key: string;
}

const DEFAULT_SETTINGS: SettingsState = {
  rate_limit_max: "10",
  rate_limit_window: "5",
  heartbeat_rate_limit_max: "60",
  heartbeat_rate_limit_window: "5",
  resethwid_rate_limit_max: "10",
  resethwid_rate_limit_window: "5",
  discord_webhook_url: "",
  ip_change_threshold: "5",
  auto_ban_enabled: "true",
  bot_api_key: "",
};

interface BlacklistEntry {
  id: string;
  type: string;
  value: string;
  license_key: string | null;
  reason: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Blacklist state
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blType, setBlType] = useState<string>("ip");
  const [blValue, setBlValue] = useState("");
  const [blLicenseKey, setBlLicenseKey] = useState("");
  const [blReason, setBlReason] = useState("");
  const [blDialogOpen, setBlDialogOpen] = useState(false);

  // Reseller keys state
  const [resellerKeys, setResellerKeys] = useState<any[]>([]);
  const [rkSearch, setRkSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [rkPage, setRkPage] = useState(1);
  const RK_PAGE_SIZE = 15;

  useEffect(() => {
    loadSettings();
    loadBlacklist();
    loadResellerKeys();
  }, [user]);

  async function loadSettings() {
    try {
      const { data, error } = await supabase.from("settings").select("key, value");
      if (error) throw error;
      if (data) {
        const loaded = { ...DEFAULT_SETTINGS };
        data.forEach((row: any) => {
          if (row.key in loaded) {
            (loaded as any)[row.key] = row.value;
          }
        });
        setSettings(loaded);
      }
    } catch { /* First time */ }
    finally { setLoading(false); }
  }

  async function loadBlacklist() {
    const { data } = await supabase.from("blacklist").select("*").order("created_at", { ascending: false });
    setBlacklist(data || []);
  }

  async function loadResellerKeys() {
    if (!user) return;
    const { data } = await supabase
      .from("licenses")
      .select("*, applications(name), resellers(username)")
      .not("created_by_reseller", "is", null)
      .order("created_at", { ascending: false });
    setResellerKeys(data || []);
  }

  async function saveSetting(key: string, value: string) {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { error } = await supabase
      .from("settings")
      .upsert(
        { user_id: u.id, key, value, updated_at: new Date().toISOString() } as any,
        { onConflict: "user_id,key" }
      );
    if (error) throw error;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(Object.entries(settings).map(([key, value]) => saveSetting(key, value)));
      toast.success("Settings saved successfully");
      notifyDiscord("Settings updated", { "Rate Limit": settings.rate_limit_max, "Window": settings.rate_limit_window + "m", "IP Threshold": settings.ip_change_threshold, "Auto-Ban": settings.auto_ban_enabled });
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  }

  function updateSetting(key: keyof SettingsState, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function addBlacklistEntry() {
    if (!blValue.trim() || !user) return;
    const { error } = await supabase.from("blacklist").insert({
      type: blType,
      value: blValue.trim(),
      license_key: blLicenseKey.trim() || null,
      reason: blReason.trim() || null,
      created_by: user.id,
    } as any);
    if (error) {
      if (error.code === "23505") toast.error("This entry already exists in the blacklist");
      else toast.error(error.message);
      return;
    }
    toast.success(`${blType.toUpperCase()} blacklisted`);
    notifyDiscord("IP/HWID blacklisted", { Type: blType.toUpperCase(), Value: blValue.trim(), Key: blLicenseKey.trim() || null, Reason: blReason.trim() || null });
    setBlValue(""); setBlLicenseKey(""); setBlReason("");
    setBlDialogOpen(false);
    loadBlacklist();
  }

  async function removeBlacklistEntry(id: string) {
    const entry = blacklist.find(b => b.id === id);
    await supabase.from("blacklist").delete().eq("id", id);
    toast.success("Removed from blacklist");
    notifyDiscord("Blacklist entry removed", { Type: entry?.type?.toUpperCase() || "Unknown", Value: entry?.value || "Unknown", Key: entry?.license_key || "N/A" });
    loadBlacklist();
  }

  async function adminBanKey(id: string, licenseKey: string) {
    const lic = resellerKeys.find((l: any) => l.id === id);
    const appName = lic?.applications?.name || "Unknown";
    const resellerName = lic?.resellers?.username || "Unknown";
    await supabase.from("licenses").update({ banned: true, status: "banned", banned_by_admin: true }).eq("id", id);
    if (user) {
      await supabase.from("activity_logs").insert({
        user_id: user.id, action: "Admin banned license", license_key: licenseKey, application_name: appName,
      } as any);
    }
    toast.success("License banned by admin (reseller cannot unban)");
    notifyDiscord("Admin banned license", { Key: licenseKey, App: appName, Reseller: resellerName, HWID: lic?.hwid || "N/A", IP: lic?.ip || "N/A" });
    loadResellerKeys();
  }

  async function adminUnbanKey(id: string, licenseKey: string) {
    const lic = resellerKeys.find((l: any) => l.id === id);
    const appName = lic?.applications?.name || "Unknown";
    const resellerName = lic?.resellers?.username || "Unknown";
    await supabase.from("licenses").update({ banned: false, status: "active", banned_by_admin: false }).eq("id", id);
    if (user) {
      await supabase.from("activity_logs").insert({
        user_id: user.id, action: "Admin unbanned license", license_key: licenseKey, application_name: appName,
      } as any);
    }
    toast.success("License unbanned");
    notifyDiscord("Admin unbanned license", { Key: licenseKey, App: appName, Reseller: resellerName });
    loadResellerKeys();
  }

  async function blacklistFromKey(licenseKey: string, ip: string | null, hwid: string | null) {
    if (!user) return;
    const entries = [];
    if (ip) entries.push({ type: "ip", value: ip, license_key: licenseKey, reason: `Blacklisted from key ${licenseKey}`, created_by: user.id });
    if (hwid) entries.push({ type: "hwid", value: hwid, license_key: licenseKey, reason: `Blacklisted from key ${licenseKey}`, created_by: user.id });
    if (entries.length === 0) { toast.error("No IP or HWID to blacklist"); return; }
    for (const entry of entries) {
      await supabase.from("blacklist").upsert(entry, { onConflict: "type,value" } as any);
    }
    toast.success("IP/HWID blacklisted from this key");
    notifyDiscord("IP/HWID blacklisted", { Key: licenseKey, IP: ip || "N/A", HWID: hwid || "N/A" });
    loadBlacklist();
  }

  const filteredRk = resellerKeys.filter((l) =>
    l.license_key.toLowerCase().includes(rkSearch.toLowerCase()) ||
    (l.applications?.name || "").toLowerCase().includes(rkSearch.toLowerCase()) ||
    (l.resellers?.username || "").toLowerCase().includes(rkSearch.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const autoBanEnabled = settings.auto_ban_enabled === "true";

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Copied");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">System configuration & security</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {/* Row: General + Rate Limiting */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">General</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">System Name</label>
                <input className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" defaultValue="Galactic Boosts" readOnly />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">API Base URL</label>
                <input className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value="https://license.galacticboosts.online/api/validate" readOnly />
              </div>
            </div>
          </div>

          {/* Rate Limiting */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Rate Limiting</h3>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Prevent brute-force attacks by limiting requests per IP per endpoint.</p>
            
            {/* Validate endpoint */}
            <p className="text-xs font-semibold text-primary mb-2">Validate Endpoint</p>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Max Attempts</p>
                  <p className="text-xs text-muted-foreground">Per window per IP</p>
                </div>
                <input type="number" min={1} max={100}
                  className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value={settings.rate_limit_max} onChange={(e) => updateSetting("rate_limit_max", e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Window (min)</p>
                </div>
                <input type="number" min={1} max={60}
                  className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value={settings.rate_limit_window} onChange={(e) => updateSetting("rate_limit_window", e.target.value)} />
              </div>
            </div>

            {/* Heartbeat endpoint */}
            <p className="text-xs font-semibold text-primary mb-2">Heartbeat Endpoint</p>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Max Attempts</p>
                  <p className="text-xs text-muted-foreground">Per window per IP</p>
                </div>
                <input type="number" min={1} max={200}
                  className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value={settings.heartbeat_rate_limit_max} onChange={(e) => updateSetting("heartbeat_rate_limit_max", e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Window (min)</p>
                </div>
                <input type="number" min={1} max={60}
                  className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value={settings.heartbeat_rate_limit_window} onChange={(e) => updateSetting("heartbeat_rate_limit_window", e.target.value)} />
              </div>
            </div>

            {/* Reset HWID endpoint */}
            <p className="text-xs font-semibold text-primary mb-2">Reset HWID Endpoint</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Max Attempts</p>
                  <p className="text-xs text-muted-foreground">Per window per IP</p>
                </div>
                <input type="number" min={1} max={100}
                  className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value={settings.resethwid_rate_limit_max} onChange={(e) => updateSetting("resethwid_rate_limit_max", e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Window (min)</p>
                </div>
                <input type="number" min={1} max={60}
                  className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value={settings.resethwid_rate_limit_window} onChange={(e) => updateSetting("resethwid_rate_limit_window", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Row: Discord + Anti-Sharing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Discord Webhook */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Discord Notifications</h3>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Receive real-time license validation alerts in your Discord channel.</p>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Webhook URL</label>
              <input type="url"
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discord_webhook_url} onChange={(e) => updateSetting("discord_webhook_url", e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Create a webhook in Discord: Server Settings → Integrations → Webhooks → New Webhook</p>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs text-muted-foreground">Bot API Key</label>
              <div className="flex gap-2">
                <input type="text"
                  className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  placeholder="Generate or paste an API key for your Discord bot"
                  value={settings.bot_api_key} onChange={(e) => updateSetting("bot_api_key", e.target.value)} />
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => {
                  const key = "gk_" + crypto.randomUUID().replace(/-/g, "");
                  updateSetting("bot_api_key", key);
                  toast.success("API key generated — click Save to apply");
                }}>
                  <Key className="h-3.5 w-3.5" /> Generate
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Used by your Discord bot to authenticate with the reset-hwid endpoint (send as <code className="text-foreground bg-secondary/50 px-1 rounded">X-API-Key</code> header)</p>
            </div>
          </div>

          {/* Anti-Sharing */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Anti-Sharing Protection</h3>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Detect and auto-ban licenses used from too many different IPs.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">IP Change Threshold</p>
                  <p className="text-xs text-muted-foreground">Auto-ban after N unique IPs</p>
                </div>
                <input type="number" min={2} max={50}
                  className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  value={settings.ip_change_threshold} onChange={(e) => updateSetting("ip_change_threshold", e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Auto-Ban on Threshold</p>
                  <p className="text-xs text-muted-foreground">Automatically ban licenses exceeding the IP threshold</p>
                </div>
                <button onClick={() => updateSetting("auto_ban_enabled", autoBanEnabled ? "false" : "true")}
                  className={`relative h-6 w-11 rounded-full transition-colors ${autoBanEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-primary-foreground transition-transform ${autoBanEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* IP/HWID Blacklist */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldBan className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">IP / HWID Blacklist</h3>
            </div>
            <Dialog open={blDialogOpen} onOpenChange={setBlDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
                <DialogHeader><DialogTitle>Add to Blacklist</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select value={blType} onValueChange={setBlType}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="hwid">HWID</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder={blType === "ip" ? "e.g. 192.168.1.1" : "e.g. abc123def456"} value={blValue} onChange={(e) => setBlValue(e.target.value)} className="bg-secondary border-border" />
                  <Input placeholder="Associated license key (optional)" value={blLicenseKey} onChange={(e) => setBlLicenseKey(e.target.value)} className="bg-secondary border-border" />
                  <Input placeholder="Reason (optional)" value={blReason} onChange={(e) => setBlReason(e.target.value)} className="bg-secondary border-border" />
                  <Button onClick={addBlacklistEntry} className="w-full">Blacklist</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Block specific IPs or HWIDs from validating any license. Blocked requests get a 403 response.
          </p>

          {blacklist.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No blacklisted entries</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Value</th>
                    <th className="pb-2 pr-4 font-medium">License Key</th>
                    <th className="pb-2 pr-4 font-medium">Reason</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blacklist.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${entry.type === "ip" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning"}`}>
                          {entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">{entry.value}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{entry.license_key || "—"}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{entry.reason || "—"}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{formatDate(entry.created_at)}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeBlacklistEntry(entry.id)} title="Remove" className="hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reseller Generated Keys */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Reseller Generated Keys</h3>
            </div>
            <p className="text-xs text-muted-foreground">{filteredRk.length} keys</p>
          </div>

          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search keys, apps, resellers..." value={rkSearch} onChange={(e) => { setRkSearch(e.target.value); setRkPage(1); }} className="bg-secondary border-border pl-10" />
            </div>
          </div>

          <div className="table-responsive">
            <div className="overflow-hidden min-w-[800px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">License Key</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Reseller</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">App</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Status</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">IP</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">HWID</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Expires</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRk.slice((rkPage - 1) * RK_PAGE_SIZE, rkPage * RK_PAGE_SIZE).map((lic, i) => (
                    <tr key={lic.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors" style={{ animationDelay: `${i * 20}ms` }}>
                      <td className="px-3 py-2.5">
                        <button onClick={() => copyKey(lic.license_key)} className="font-mono text-xs text-foreground flex items-center gap-1.5 hover:opacity-80">
                          <span className="truncate max-w-[150px]">{lic.license_key}</span>
                          {copiedKey === lic.license_key ? (
                            <span className="text-[10px] text-emerald-400 font-sans shrink-0">Copied!</span>
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground">{lic.resellers?.username || "Unknown"}</td>
                      <td className="px-3 py-2.5 text-xs text-foreground">{lic.applications?.name || "Unknown"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getLicenseStatusColor(lic.status)}`}>
                          {lic.status}{lic.banned_by_admin && " (admin)"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{lic.ip || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{lic.hwid || "—"}</td>
                      <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{formatDate(lic.expires_at)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          {lic.banned ? (
                            <Button variant="ghost" size="icon" onClick={() => adminUnbanKey(lic.id, lic.license_key)} title="Unban" className="h-7 w-7 hover:bg-emerald-500/10">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => adminBanKey(lic.id, lic.license_key)} title="Ban (reseller can't unban)" className="h-7 w-7 hover:bg-destructive/10">
                              <Ban className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => blacklistFromKey(lic.license_key, lic.ip, lic.hwid)} title="Blacklist IP/HWID" className="h-7 w-7 hover:bg-destructive/10">
                            <ShieldBan className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRk.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No reseller-generated keys found</div>
              )}
              <TablePagination currentPage={rkPage} totalItems={filteredRk.length} pageSize={RK_PAGE_SIZE} onPageChange={setRkPage} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
