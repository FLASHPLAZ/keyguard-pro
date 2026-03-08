import { DashboardLayout } from "@/components/DashboardLayout";
import { Copy } from "lucide-react";
import { toast } from "sonner";

const endpoints = [
  {
    method: "POST",
    path: "/api/validate",
    description: "Validate a license key from your software client",
    request: `{
  "license_key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
  "hwid": "machine-hardware-id"
}`,
    response: `{
  "valid": true,
  "expires": "2026-04-08T00:00:00Z",
  "hwid": "HW-8A3F2B",
  "app": "CyberLoader Pro"
}`,
  },
  {
    method: "POST",
    path: "/api/login",
    description: "Authenticate admin or reseller",
    request: `{
  "email": "admin@keyvault.io",
  "password": "your-password"
}`,
    response: `{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "role": "admin" }
}`,
  },
  {
    method: "POST",
    path: "/api/create-app",
    description: "Create a new application",
    request: `{
  "name": "MyApp",
  "description": "My software tool"
}`,
    response: `{
  "id": "app_id",
  "name": "MyApp",
  "created_at": "2026-03-08T..."
}`,
  },
  {
    method: "POST",
    path: "/api/create-key",
    description: "Generate license keys",
    request: `{
  "app_id": "app_id",
  "count": 5,
  "duration_days": 30
}`,
    response: `{
  "keys": ["XXXXX-XXXXX-...", "..."]
}`,
  },
  {
    method: "POST",
    path: "/api/ban-key",
    description: "Ban a license key",
    request: `{ "license_key": "XXXXX-XXXXX-..." }`,
    response: `{ "success": true }`,
  },
  {
    method: "POST",
    path: "/api/reset-hwid",
    description: "Reset HWID binding for a license",
    request: `{ "license_key": "XXXXX-XXXXX-..." }`,
    response: `{ "success": true }`,
  },
  {
    method: "POST",
    path: "/api/extend-key",
    description: "Extend license duration",
    request: `{
  "license_key": "XXXXX-XXXXX-...",
  "days": 30
}`,
    response: `{ "success": true, "new_expiry": "2026-05-08T..." }`,
  },
];

const pythonSnippet = `import requests
import subprocess
import hashlib
import sys

API_URL = "https://your-domain.com/api/validate"

def get_hwid():
    """Get a unique hardware ID"""
    result = subprocess.check_output(
        'wmic csproduct get uuid', shell=True
    ).decode().split('\\n')[1].strip()
    return hashlib.md5(result.encode()).hexdigest()[:12]

def validate_license(key: str) -> bool:
    try:
        response = requests.post(API_URL, json={
            "license_key": key,
            "hwid": get_hwid()
        }, timeout=10)
        
        data = response.json()
        
        if data.get("valid"):
            print(f"✅ License valid | Expires: {data['expires']}")
            return True
        else:
            print(f"❌ {data.get('message', 'Invalid license')}")
            return False
    except Exception as e:
        print(f"⚠️ Connection error: {e}")
        return False

if __name__ == "__main__":
    license_key = input("Enter license key: ").strip()
    if not validate_license(license_key):
        sys.exit(1)
    
    print("\\n🚀 Application starting...")
    # Your app code here
`;

export default function ApiDocs() {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
        <p className="text-sm text-muted-foreground">Integrate KeyVault into your software applications</p>
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
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.request}</pre>
              </div>
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Response</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.response}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Python Client */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Python Client Example</h2>
          <button
            onClick={() => copyCode(pythonSnippet)}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <pre className="rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
          {pythonSnippet}
        </pre>
      </div>
    </DashboardLayout>
  );
}
