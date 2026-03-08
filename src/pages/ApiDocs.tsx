import { DashboardLayout } from "@/components/DashboardLayout";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const pythonSnippet = `import requests
import subprocess
import hashlib
import sys

API_URL = "${API_BASE}/validate"

def get_hwid():
    """Get a unique hardware ID (Windows)"""
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
            print(f"❌ {data.get('error', 'Invalid license')}")
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

const csharpSnippet = `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Management;
using System.Security.Cryptography;

class LicenseValidator
{
    private static readonly string API_URL = "${API_BASE}/validate";
    private static readonly HttpClient client = new HttpClient();

    static string GetHWID()
    {
        var searcher = new ManagementObjectSearcher("SELECT UUID FROM Win32_ComputerSystemProduct");
        foreach (var obj in searcher.Get())
        {
            var uuid = obj["UUID"]?.ToString() ?? "";
            using var md5 = MD5.Create();
            var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(uuid));
            return BitConverter.ToString(hash).Replace("-", "").Substring(0, 12).ToLower();
        }
        return "unknown";
    }

    public static async Task<bool> ValidateLicense(string licenseKey)
    {
        try
        {
            var payload = JsonSerializer.Serialize(new
            {
                license_key = licenseKey,
                hwid = GetHWID()
            });

            var content = new StringContent(payload, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(API_URL, content);
            var json = await response.Content.ReadAsStringAsync();
            var result = JsonDocument.Parse(json).RootElement;

            if (result.GetProperty("valid").GetBoolean())
            {
                Console.WriteLine($"✅ License valid | Expires: {result.GetProperty("expires")}");
                return true;
            }
            else
            {
                Console.WriteLine($"❌ {result.GetProperty("error").GetString()}");
                return false;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Connection error: {ex.Message}");
            return false;
        }
    }

    static async Task Main(string[] args)
    {
        Console.Write("Enter license key: ");
        var key = Console.ReadLine()?.Trim() ?? "";
        
        if (!await ValidateLicense(key))
            Environment.Exit(1);
        
        Console.WriteLine("\\n🚀 Application starting...");
        // Your app code here
    }
}`;

const nodejsSnippet = `const crypto = require('crypto');
const { execSync } = require('child_process');
const readline = require('readline');

const API_URL = "${API_BASE}/validate";

function getHWID() {
  try {
    const uuid = execSync('wmic csproduct get uuid', { encoding: 'utf-8' })
      .split('\\n')[1].trim();
    return crypto.createHash('md5').update(uuid).digest('hex').slice(0, 12);
  } catch {
    return 'unknown';
  }
}

async function validateLicense(licenseKey) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        hwid: getHWID()
      })
    });

    const data = await res.json();

    if (data.valid) {
      console.log(\`✅ License valid | Expires: \${data.expires}\`);
      return true;
    } else {
      console.log(\`❌ \${data.error || 'Invalid license'}\`);
      return false;
    }
  } catch (err) {
    console.log(\`⚠️ Connection error: \${err.message}\`);
    return false;
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter license key: ', async (key) => {
  rl.close();
  if (!await validateLicense(key.trim())) process.exit(1);
  console.log('\\n🚀 Application starting...');
  // Your app code here
});`;

const cppSnippet = `// Requires: libcurl, nlohmann/json
// Compile: g++ -o app main.cpp -lcurl

#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

const std::string API_URL = "${API_BASE}/validate";

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* s) {
    s->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::string getHWID() {
    // Windows: read from WMI or registry
    // Linux: cat /etc/machine-id
    // For simplicity, using a command approach
    #ifdef _WIN32
    FILE* pipe = _popen("wmic csproduct get uuid", "r");
    #else
    FILE* pipe = popen("cat /etc/machine-id", "r");
    #endif
    if (!pipe) return "unknown";
    char buffer[128];
    std::string result;
    while (fgets(buffer, sizeof(buffer), pipe)) result += buffer;
    #ifdef _WIN32
    _pclose(pipe);
    #else
    pclose(pipe);
    #endif
    return result.substr(0, 12);
}

bool validateLicense(const std::string& licenseKey) {
    CURL* curl = curl_easy_init();
    if (!curl) return false;

    json payload = {
        {"license_key", licenseKey},
        {"hwid", getHWID()}
    };
    std::string postData = payload.dump();
    std::string response;

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, API_URL.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        std::cerr << "Connection error" << std::endl;
        return false;
    }

    auto data = json::parse(response);
    if (data["valid"].get<bool>()) {
        std::cout << "License valid | Expires: " << data["expires"] << std::endl;
        return true;
    } else {
        std::cerr << data["error"].get<std::string>() << std::endl;
        return false;
    }
}

int main() {
    std::string key;
    std::cout << "Enter license key: ";
    std::getline(std::cin, key);

    if (!validateLicense(key)) return 1;

    std::cout << "\\nApplication starting..." << std::endl;
    // Your app code here
    return 0;
}`;

const languages = [
  { id: "python", label: "Python", code: pythonSnippet },
  { id: "csharp", label: "C# (.NET)", code: csharpSnippet },
  { id: "nodejs", label: "Node.js", code: nodejsSnippet },
  { id: "cpp", label: "C++", code: cppSnippet },
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
        <p className="text-sm text-muted-foreground">Integrate KeyVault into your software applications</p>
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
            <TabsList>
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
