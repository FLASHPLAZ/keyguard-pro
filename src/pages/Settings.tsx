import { DashboardLayout } from "@/components/DashboardLayout";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up">
          <h3 className="mb-4 text-sm font-semibold text-foreground">General</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">System Name</label>
              <input className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" defaultValue="KeyVault" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">API Base URL</label>
              <input className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" defaultValue="https://api.keyvault.io" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Anti-Sharing Protection</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">IP Change Threshold</p>
                <p className="text-xs text-muted-foreground">Flag license after N unique IPs</p>
              </div>
              <input type="number" className="w-20 rounded-md border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" defaultValue={5} />
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
