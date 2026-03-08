import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Bell, Settings2, Save, Loader2 } from "lucide-react";

interface SettingsState {
  rate_limit_max: string;
  rate_limit_window: string;
  discord_webhook_url: string;
}

const DEFAULT_SETTINGS: SettingsState = {
  rate_limit_max: "10",
  rate_limit_window: "5",
  discord_webhook_url: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value");

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
    } catch {
      // First time — no settings yet
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(key: string, value: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("settings")
      .upsert(
        { user_id: user.id, key, value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      );

    if (error) throw error;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(settings).map(([key, value]) => saveSetting(key, value))
      );
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key: keyof SettingsState, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">System configuration</p>
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

      <div className="max-w-2xl space-y-6">
        {/* General */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">General</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">System Name</label>
              <input
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                defaultValue="Galactic"
                readOnly
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API Base URL</label>
              <input
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                value={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/validate`}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Rate Limiting</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Prevent brute-force attacks by limiting validation requests per IP address.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Max Attempts</p>
                <p className="text-xs text-muted-foreground">Maximum requests per window per IP</p>
              </div>
              <input
                type="number"
                min={1}
                max={100}
                className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                value={settings.rate_limit_max}
                onChange={(e) => updateSetting("rate_limit_max", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Window (minutes)</p>
                <p className="text-xs text-muted-foreground">Time window for counting attempts</p>
              </div>
              <input
                type="number"
                min={1}
                max={60}
                className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                value={settings.rate_limit_window}
                onChange={(e) => updateSetting("rate_limit_window", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Discord Webhook */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Discord Notifications</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Receive real-time license validation alerts in your Discord channel.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Webhook URL</label>
              <input
                type="url"
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discord_webhook_url}
                onChange={(e) => updateSetting("discord_webhook_url", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Create a webhook in Discord: Server Settings → Integrations → Webhooks → New Webhook
              </p>
            </div>
          </div>
        </div>

        {/* Anti-Sharing */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Anti-Sharing Protection</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">IP Change Threshold</p>
                <p className="text-xs text-muted-foreground">Flag license after N unique IPs</p>
              </div>
              <input
                type="number"
                className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                defaultValue={5}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Auto-Ban on Threshold</p>
                <p className="text-xs text-muted-foreground">Automatically ban flagged licenses</p>
              </div>
              <button className="relative h-6 w-11 rounded-full bg-primary transition-colors">
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-primary-foreground transition-transform translate-x-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
