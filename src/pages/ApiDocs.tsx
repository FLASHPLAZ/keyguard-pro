import { RoleLayout } from "@/components/RoleLayout";
import { Copy, CheckCircle, AlertTriangle, Shield, Zap, BookOpen, Server, Code2, Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { languages } from "@/data/api-code-snippets";

const API_BASE = "https://license.galacticboosts.online/api";

const endpoints = [
  {
    method: "POST",
    path: "/validate",
    auth: "None (public)",
    description: "Validate a license key from your software client. This is the primary endpoint your app calls on startup.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "hwid": "machine-hardware-id",
  "device_name": "DESKTOP-ABC123",
  "application_id": "your-app-uuid"
}`,
    response: `{
  "valid": true,
  "expires": "2026-04-08T00:00:00Z",
  "expires_readable": "Apr 8, 2026 (31 days left)",
  "hwid": "abc123def456",
  "app": "MyApp",
  "country": "United States",
  "device_name": "DESKTOP-ABC123"
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to validate (max 50 chars)" },
      { name: "hwid", type: "string", required: false, desc: "Hardware ID for binding (max 100 chars). If omitted, no HWID binding occurs." },
      { name: "device_name", type: "string", required: false, desc: "Device hostname (max 100 chars). Logged for tracking and shown in Discord alerts." },
      { name: "application_id", type: "string", required: false, desc: "Application UUID. If provided, verifies the license belongs to this app. Prevents cross-app key abuse." },
    ],
    headers: [
      { name: "X-Signature", required: "If signing enabled", desc: "HMAC-SHA256 hex signature of timestamp.body using app signing secret" },
      { name: "X-Timestamp", required: "If signing enabled", desc: "Unix timestamp (seconds). Must be within 60 seconds of server time." },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed license_key field" },
      { code: 400, message: "Invalid hwid", desc: "HWID exceeds 100 characters" },
      { code: 404, message: "License not found", desc: "No license matches the provided key" },
      { code: 403, message: "License is banned", desc: "License has been banned by admin or auto-ban" },
      { code: 403, message: "License does not belong to this application", desc: "application_id was provided but doesn't match the license's app" },
      { code: 403, message: "Application is disabled", desc: "App is suspended or kill-switch is active" },
      { code: 403, message: "License expired", desc: "License expiration date has passed" },
      { code: 403, message: "HWID mismatch", desc: "Key is already bound to a different HWID" },
      { code: 403, message: "License banned for sharing", desc: "Too many unique IPs detected (anti-sharing)" },
      { code: 403, message: "Signature required", desc: "App requires request signing but no X-Signature/X-Timestamp headers sent" },
      { code: 403, message: "Request expired", desc: "X-Timestamp is older than 60 seconds (replay protection)" },
      { code: 403, message: "Invalid signature", desc: "HMAC signature doesn't match — possible payload tampering" },
      { code: 429, message: "Too many requests", desc: "Rate limit exceeded. Retry after window expires." },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/check-license",
    auth: "None (public)",
    description: "Lightweight read-only license lookup for client portal websites. Returns license validity, application name, expiry, and owner — without HWID binding, IP tracking, or activity logging.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"
}`,
    response: `{
  "valid": true,
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "application": "My Bot Name",
  "status": "active",
  "expires_at": "2026-12-31T00:00:00Z",
  "expires_readable": "Dec 31, 2026 (265 days left)",
  "owner_name": "John Doe",
  "is_used": true,
  "is_banned": false
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to check (max 50 chars)" },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed license_key field" },
      { code: 404, message: "License not found", desc: "No license matches the provided key" },
      { code: 403, message: "License is banned", desc: "License has been banned" },
      { code: 403, message: "Application is disabled", desc: "App is suspended or kill-switch is active" },
      { code: 410, message: "License expired", desc: "License expiration date has passed" },
      { code: 429, message: "Too many requests", desc: "Rate limit exceeded" },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/create-reseller",
    auth: "Bearer token (admin only)",
    description: "Create a new reseller account. Requires admin authentication via Authorization header.",
    request: `{
  "username": "reseller_name",
  "email": "reseller@example.com",
  "password": "securePassword123",
  "credits": 50,
  "allowed_apps": ["app-uuid-1", "app-uuid-2"]
}`,
    response: `{
  "success": true,
  "reseller_id": "uuid",
  "message": "Reseller \\"reseller_name\\" created"
}`,
    fields: [
      { name: "username", type: "string", required: true, desc: "Display name for the reseller" },
      { name: "email", type: "string", required: true, desc: "Reseller login email" },
      { name: "password", type: "string", required: true, desc: "Reseller login password" },
      { name: "credits", type: "number", required: false, desc: "Initial credits (default: 10)" },
      { name: "allowed_apps", type: "string[]", required: false, desc: "Array of application UUIDs the reseller can generate keys for" },
    ],
    errors: [
      { code: 401, message: "Unauthorized", desc: "Missing or invalid Authorization header" },
      { code: 403, message: "Admin access required", desc: "Caller does not have admin role" },
      { code: 400, message: "Missing required fields", desc: "username, email, or password is missing" },
      { code: 400, message: "(varies)", desc: "Auth user creation failed (e.g. email already exists)" },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/heartbeat",
    auth: "None (public)",
    description: "Lightweight status check for running clients. Call every 30-60 seconds to detect bans, suspensions, or kill switch instantly. Logs activity with country tracking.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "application_id": "your-app-uuid"
}`,
    response: `{
  "active": true,
  "app": "MyApp",
  "country": "United States"
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to check (max 50 chars)" },
      { name: "application_id", type: "string", required: false, desc: "Application UUID. If provided, verifies the license belongs to this app." },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed license_key field" },
      { code: 403, message: "License does not belong to this application", desc: "application_id was provided but doesn't match the license's app" },
      { code: 404, message: "License not found", desc: "No license matches the provided key" },
      { code: 429, message: "Too many requests", desc: "Rate limit exceeded" },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/reset-hwid",
    auth: "X-API-Key or Bearer token",
    description: "Reset HWID binding for a license key. Authenticate with a Bot API Key (from Settings) or admin Bearer token.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"
}`,
    response: `{
  "success": true,
  "message": "HWID reset successfully",
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "previous_hwid": "abc123def456"
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to reset HWID for (max 50 chars)" },
    ],
    headers: [
      { name: "X-API-Key", required: "Yes (preferred)", desc: "Bot API Key from Settings page — never expires, ideal for bots" },
      { name: "Authorization", required: "Alternative", desc: "Bearer <admin_access_token> — JWT-based, expires" },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed key" },
      { code: 400, message: "No HWID bound", desc: "License has no HWID to reset" },
      { code: 401, message: "Unauthorized", desc: "Missing or invalid API key / token" },
      { code: 404, message: "License not found", desc: "No license matches the key" },
    ],
  },
];

export default function ApiDocs() {
  const [activeLang, setActiveLang] = useState("python");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyCode = (code: string, label?: string) => {
    navigator.clipboard.writeText(code);
    setCopiedText(label || "code");
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedText(null), 1500);
  };

  return (
    <RoleLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">Complete guide to integrate GrazeXauth into your software</p>
          <a
            href="/openapi.json"
            download="galactic-boosts-openapi.json"
            className="inline-flex items-center gap-2 self-start rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download OpenAPI Spec (v3.0)
          </a>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
          <BookOpen className="h-4 w-4 text-primary" /> Table of Contents
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li><a href="#setup" className="hover:text-primary transition-colors">Setup Guide</a></li>
          <li><a href="#base-url" className="hover:text-primary transition-colors">Base URL</a></li>
          <li><a href="#endpoints" className="hover:text-primary transition-colors">API Endpoints</a></li>
          <li><a href="#hwid" className="hover:text-primary transition-colors">HWID Binding</a></li>
          <li><a href="#request-signing" className="hover:text-primary transition-colors">Request Signing (HMAC)</a></li>
          <li><a href="#security" className="hover:text-primary transition-colors">Security Features</a></li>
          <li><a href="#examples" className="hover:text-primary transition-colors">Code Examples</a></li>
          <li><a href="#quickstart" className="hover:text-primary transition-colors">Quick Start</a></li>
        </ol>
      </div>

      {/* Setup Guide */}
      <div id="setup" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
          <Zap className="h-5 w-5 text-primary" /> Setup Guide
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 1 — Create an Application</h3>
            <p>Go to <strong className="text-foreground">Applications</strong> in the sidebar and click <strong className="text-foreground">Create Application</strong>. Give it a name and optional description. This represents your software product.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 2 — Generate License Keys</h3>
            <p>Navigate to <strong className="text-foreground">Licenses</strong>, select your application, choose a duration (1 Day, 1 Week, 1 Month, or Lifetime), and generate keys. Each key follows the format <code className="text-foreground bg-secondary/50 px-1 rounded">GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX</code>.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 3 — Integrate the API</h3>
            <p>Copy the code example below for your language (Python, C#, Node.js, C++, Go, Java, or Rust). Add it to your project and call the <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> endpoint on startup.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 4 — Build &amp; Distribute</h3>
            <p>Build your project into an executable (<code className="text-foreground bg-secondary/50 px-1 rounded">.exe</code>, <code className="text-foreground bg-secondary/50 px-1 rounded">.dll</code>, binary, etc.) using your language's build tool (PyInstaller, .NET publish, go build, cargo build, etc.). Distribute to your users along with their license keys.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 5 — Monitor &amp; Manage</h3>
            <p>Use the <strong className="text-foreground">Dashboard</strong> to monitor validations in real-time. View logs, ban/unban keys, reset HWIDs, and toggle the kill switch from the dashboard. Enable Discord webhooks in <strong className="text-foreground">Settings</strong> for instant notifications.</p>
          </div>
        </div>
      </div>

      {/* Base URL */}
      <div id="base-url" className="mb-6 rounded-lg border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Server className="h-3.5 w-3.5" /> Base URL
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-secondary/50 px-3 py-2 font-mono text-sm text-foreground break-all">{API_BASE}</code>
          <button
            onClick={() => copyCode(API_BASE, "base-url")}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors shrink-0"
          >
            {copiedText === "base-url" ? <><CheckCircle className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
      </div>

      {/* Endpoints */}
      <div id="endpoints" className="mb-10 space-y-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Code2 className="h-5 w-5 text-primary" /> API Endpoints
        </h2>
        {endpoints.map((ep) => (
          <div key={ep.path} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-border px-4 py-3">
              <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {ep.method}
              </span>
              <span className="font-mono text-sm text-foreground">{ep.path}</span>
              <span className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{ep.auth}</span>
            </div>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm text-muted-foreground">{ep.description}</p>
            </div>

            {/* Request / Response */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request Body</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.request}</pre>
              </div>
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Success Response (200)</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.response}</pre>
              </div>
            </div>

            {/* Fields */}
            {"fields" in ep && ep.fields && (
              <div className="border-t border-border p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request Fields</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2 pr-4 font-medium">Field</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Required</th>
                        <th className="pb-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.fields.map((f) => (
                        <tr key={f.name} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-foreground">{f.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{f.type}</td>
                          <td className="py-2 pr-4">
                            {f.required ? (
                              <span className="text-emerald-400 font-medium">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground">{f.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Headers */}
            {"headers" in ep && ep.headers && (
              <div className="border-t border-border p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request Headers (for signed requests)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2 pr-4 font-medium">Header</th>
                        <th className="pb-2 pr-4 font-medium">Required</th>
                        <th className="pb-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.headers.map((h: any) => (
                        <tr key={h.name} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-foreground">{h.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{h.required}</td>
                          <td className="py-2 text-muted-foreground">{h.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {"errors" in ep && ep.errors && (
              <div className="border-t border-border p-4">
                <p className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" /> Error Responses
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Error</th>
                        <th className="pb-2 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.errors.map((err, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-foreground">{err.code}</td>
                          <td className="py-2 pr-4 font-mono text-destructive">{err.message}</td>
                          <td className="py-2 text-muted-foreground">{err.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* How HWID Works */}
      <div id="hwid" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">How HWID Binding Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Your app sends the license key + a hardware ID (HWID) to the <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> endpoint.</li>
          <li>On <strong className="text-foreground">first validation</strong>, the HWID is bound to that license permanently.</li>
          <li>Subsequent validations from a <strong className="text-foreground">different HWID</strong> are rejected with a 403 error.</li>
          <li>Admins can <strong className="text-foreground">reset HWID</strong> from the Licenses page to allow re-binding.</li>
          <li>If <code className="text-foreground bg-secondary/50 px-1 rounded">hwid</code> is not sent, the license validates without binding.</li>
        </ol>
      </div>

      {/* Request Signing */}
      <div id="request-signing" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Shield className="h-5 w-5 text-primary" /> Request Signing (HMAC-SHA256)
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Prevent payload tampering by enabling request signing on your application. When enabled, every validation request must include an HMAC-SHA256 signature.</p>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Enable <strong className="text-foreground">Request Signing</strong> in the Application details dialog and copy the <strong className="text-foreground">Signing Secret</strong>.</li>
              <li>In your client, build the JSON body string, then compute: <code className="text-foreground bg-secondary/50 px-1 rounded">HMAC-SHA256(secret, timestamp + "." + body)</code></li>
              <li>Send the hex-encoded signature as <code className="text-foreground bg-secondary/50 px-1 rounded">X-Signature</code> header and the unix timestamp as <code className="text-foreground bg-secondary/50 px-1 rounded">X-Timestamp</code> header.</li>
              <li>The server verifies the signature and rejects requests older than <strong className="text-foreground">60 seconds</strong> (replay protection).</li>
            </ol>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Security benefits</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Prevents modification of license_key, hwid, or device_name in transit</li>
              <li>60-second timestamp window blocks replay attacks</li>
              <li>Per-application secrets — compromise of one app doesn't affect others</li>
              <li>Backward compatible — apps without signing enabled continue to work normally</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div id="security" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
          <Shield className="h-5 w-5 text-primary" /> Security Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Rate Limiting</h3>
            <p className="text-xs text-muted-foreground">Configurable max attempts per IP within a time window. Returns 429 when exceeded. Adjust in Settings.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Anti-Sharing (IP Tracking)</h3>
            <p className="text-xs text-muted-foreground">Tracks unique IPs per license. Auto-bans keys exceeding the threshold. Configure threshold in Settings.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Kill Switch</h3>
            <p className="text-xs text-muted-foreground">Instantly disable all validations for an application. Toggle from the Applications page.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Request Signing</h3>
            <p className="text-xs text-muted-foreground">HMAC-SHA256 request signing prevents payload tampering and replay attacks. Enable per-app from Applications page.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Discord Webhooks</h3>
            <p className="text-xs text-muted-foreground">Real-time alerts for validations, rejections, and bans. Set webhook URL in Settings.</p>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div id="examples">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
          <Code2 className="h-5 w-5 text-primary" /> Client Integration Examples
        </h2>
        <Tabs value={activeLang} onValueChange={setActiveLang}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <TabsList className="flex-wrap h-auto">
              {languages.map((lang) => (
                <TabsTrigger key={lang.id} value={lang.id}>{lang.label}</TabsTrigger>
              ))}
            </TabsList>
            <button
              onClick={() => {
                const lang = languages.find((l) => l.id === activeLang);
                if (lang) copyCode(lang.code, `lang-${lang.id}`);
              }}
              className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              {copiedText === `lang-${activeLang}` ? <><CheckCircle className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
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
      <div id="quickstart" className="mt-10 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Start Checklist</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Create an <strong className="text-foreground">Application</strong> in the dashboard.</li>
          <li>Generate <strong className="text-foreground">License Keys</strong> for that application.</li>
          <li>Copy the code example above into your project.</li>
          <li>Replace the API URL if needed (it's embedded in the snippet).</li>
          <li>Call <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> on startup with the user's key + HWID + device_name.</li>
          <li>If <code className="text-foreground bg-secondary/50 px-1 rounded">valid: true</code> → run your app. Otherwise → show the error and exit.</li>
          <li>The code snippets include a <strong className="text-foreground">"Save license key"</strong> prompt — users can type <code className="text-foreground bg-secondary/50 px-1 rounded">y</code> to save their key locally so they don't need to re-enter it.</li>
          <li>Build your project as an executable and distribute with license keys.</li>
          <li>(Optional) Set up <strong className="text-foreground">Discord webhooks</strong> and <strong className="text-foreground">anti-sharing</strong> in Settings.</li>
          <li>(Optional) Create <strong className="text-foreground">Resellers</strong> to let others distribute keys on your behalf.</li>
        </ol>
      </div>
    </RoleLayout>
  );
}
