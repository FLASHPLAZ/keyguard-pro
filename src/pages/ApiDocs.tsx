import { DashboardLayout } from "@/components/DashboardLayout";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { languages } from "@/data/api-code-snippets";

const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

const endpoints = [
  {
    method: "POST",
    path: "/validate",
    description: "Validate a license key from your software client (no auth required)",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "hwid": "machine-hardware-id"
}`,
    response: `{
  "valid": true,
  "expires": "2026-04-08T00:00:00Z",
  "hwid": "abc123def456",
  "app": "MyApp"
}`,
    errors: `// 400 - Missing license_key
// 404 - License not found
// 403 - Banned / Expired / HWID mismatch / App disabled`,
  },
];

export default function ApiDocs() {
  const [activeLang, setActiveLang] = useState("python");

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
        <p className="text-sm text-muted-foreground">Integrate Galactic Boosts into your software applications</p>
      </div>

      {/* Base URL */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Base URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-secondary/50 px-3 py-2 font-mono text-sm text-foreground">{API_BASE}</code>
          <button
            onClick={() => copyCode(API_BASE)}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>

      {/* Endpoints */}
      <div className="mb-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Endpoints</h2>
        {endpoints.map((ep) => (
          <div key={ep.path} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {ep.method}
              </span>
              <span className="font-mono text-sm text-foreground">{ep.path}</span>
              <span className="text-xs text-muted-foreground">— {ep.description}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request Body</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.request}</pre>
              </div>
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Success Response (200)</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.response}</pre>
                {ep.errors && (
                  <>
                    <p className="mt-3 mb-2 text-xs font-medium text-muted-foreground">Error Codes</p>
                    <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-muted-foreground overflow-x-auto">{ep.errors}</pre>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mb-10 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">How HWID Binding Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Your app sends the license key + a hardware ID (HWID) to the <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> endpoint.</li>
          <li>On <strong className="text-foreground">first validation</strong>, the HWID is bound to that license permanently.</li>
          <li>Subsequent validations from a <strong className="text-foreground">different HWID</strong> are rejected (403).</li>
          <li>Admins can <strong className="text-foreground">reset HWID</strong> from the dashboard to allow re-binding.</li>
        </ol>
      </div>

      {/* Code Examples */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Client Integration Examples</h2>
        <Tabs value={activeLang} onValueChange={setActiveLang}>
          <div className="flex items-center justify-between mb-3">
            <TabsList className="flex-wrap h-auto">
              {languages.map((lang) => (
                <TabsTrigger key={lang.id} value={lang.id}>{lang.label}</TabsTrigger>
              ))}
            </TabsList>
            <button
              onClick={() => {
                const lang = languages.find((l) => l.id === activeLang);
                if (lang) copyCode(lang.code);
              }}
              className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          {languages.map((lang) => (
            <TabsContent key={lang.id} value={lang.id}>
              <pre className="rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
                {lang.code}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Quick Start */}
      <div className="mt-10 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Start Guide</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Create an <strong className="text-foreground">Application</strong> in the dashboard.</li>
          <li>Generate <strong className="text-foreground">License Keys</strong> for that application.</li>
          <li>Copy a code example above into your bot/software project.</li>
          <li>Call <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> on startup to check the license.</li>
          <li>If valid → run your app. If invalid → exit with an error message.</li>
          <li>Build your project as an <strong className="text-foreground">.exe</strong> (PyInstaller, .NET publish, pkg, etc.).</li>
        </ol>
      </div>
    </DashboardLayout>
  );
}
