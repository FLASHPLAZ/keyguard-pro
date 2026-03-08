const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

export const pythonSnippet = `import requests
import subprocess
import hashlib
import socket
import os
import sys

API_URL = "${API_BASE}/validate"
LICENSE_FILE = "license.dat"

def get_hwid():
    """Get a unique hardware ID (Windows)"""
    result = subprocess.check_output(
        'wmic csproduct get uuid', shell=True
    ).decode().split('\\n')[1].strip()
    return hashlib.md5(result.encode()).hexdigest()[:12]

def get_device_name():
    return socket.gethostname()

def load_saved_key():
    if os.path.exists(LICENSE_FILE):
        with open(LICENSE_FILE, "r") as f:
            return f.read().strip()
    return None

def save_key(key):
    with open(LICENSE_FILE, "w") as f:
        f.write(key)

def validate_license(key: str) -> bool:
    try:
        response = requests.post(API_URL, json={
            "license_key": key,
            "hwid": get_hwid(),
            "device_name": get_device_name()
        }, timeout=10)
        
        data = response.json()
        
        if data.get("valid"):
            expires = data.get("expires_readable", data.get("expires"))
            country = data.get("country", "Unknown")
            print(f"✅ License valid")
            print(f"   Expires: {expires}")
            print(f"   Country: {country}")
            print(f"   Device:  {get_device_name()}")
            return True
        else:
            print(f"❌ {data.get('error', 'Invalid license')}")
            return False
    except Exception as e:
        print(f"⚠️ Connection error: {e}")
        return False

if __name__ == "__main__":
    saved = load_saved_key()
    if saved:
        print(f"🔑 Using saved license: {saved[:20]}...")
        key = saved
    else:
        key = input("Enter license key: ").strip()
    
    if not validate_license(key):
        sys.exit(1)
    
    if not saved:
        save = input("\\n💾 Save license key for next time? (y/n): ").strip().lower()
        if save == "y":
            save_key(key)
            print("✅ Key saved to license.dat")
    
    print("\\n🚀 Application starting...")
    # Your app code here
`;

export const csharpSnippet = `using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Management;
using System.Security.Cryptography;

class LicenseValidator
{
    private static readonly string API_URL = "${API_BASE}/validate";
    private static readonly HttpClient client = new HttpClient();
    private static readonly string LICENSE_FILE = "license.dat";

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

    static string GetDeviceName() => Environment.MachineName;

    static string? LoadSavedKey()
    {
        if (File.Exists(LICENSE_FILE))
            return File.ReadAllText(LICENSE_FILE).Trim();
        return null;
    }

    static void SaveKey(string key) => File.WriteAllText(LICENSE_FILE, key);

    public static async Task<bool> ValidateLicense(string licenseKey)
    {
        try
        {
            var payload = JsonSerializer.Serialize(new
            {
                license_key = licenseKey,
                hwid = GetHWID(),
                device_name = GetDeviceName()
            });

            var content = new StringContent(payload, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(API_URL, content);
            var json = await response.Content.ReadAsStringAsync();
            var result = JsonDocument.Parse(json).RootElement;

            if (result.GetProperty("valid").GetBoolean())
            {
                var expires = result.TryGetProperty("expires_readable", out var er) ? er.GetString() : result.GetProperty("expires").GetString();
                var country = result.TryGetProperty("country", out var c) ? c.GetString() : "Unknown";
                Console.WriteLine($"✅ License valid");
                Console.WriteLine($"   Expires: {expires}");
                Console.WriteLine($"   Country: {country}");
                Console.WriteLine($"   Device:  {GetDeviceName()}");
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
        var saved = LoadSavedKey();
        string key;
        if (saved != null)
        {
            Console.WriteLine($"🔑 Using saved license: {saved.Substring(0, Math.Min(20, saved.Length))}...");
            key = saved;
        }
        else
        {
            Console.Write("Enter license key: ");
            key = Console.ReadLine()?.Trim() ?? "";
        }
        
        if (!await ValidateLicense(key))
            Environment.Exit(1);
        
        if (saved == null)
        {
            Console.Write("\\n💾 Save license key for next time? (y/n): ");
            if (Console.ReadLine()?.Trim().ToLower() == "y")
            {
                SaveKey(key);
                Console.WriteLine("✅ Key saved to license.dat");
            }
        }
        
        Console.WriteLine("\\n🚀 Application starting...");
        // Your app code here
    }
}`;

export const nodejsSnippet = `const crypto = require('crypto');
const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const os = require('os');

const API_URL = "${API_BASE}/validate";
const LICENSE_FILE = "license.dat";

function getHWID() {
  try {
    const uuid = execSync('wmic csproduct get uuid', { encoding: 'utf-8' })
      .split('\\n')[1].trim();
    return crypto.createHash('md5').update(uuid).digest('hex').slice(0, 12);
  } catch {
    return 'unknown';
  }
}

function getDeviceName() {
  return os.hostname();
}

function loadSavedKey() {
  try {
    if (fs.existsSync(LICENSE_FILE))
      return fs.readFileSync(LICENSE_FILE, 'utf-8').trim();
  } catch {}
  return null;
}

function saveKey(key) {
  fs.writeFileSync(LICENSE_FILE, key);
}

async function validateLicense(licenseKey) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        hwid: getHWID(),
        device_name: getDeviceName()
      })
    });

    const data = await res.json();

    if (data.valid) {
      const expires = data.expires_readable || data.expires;
      console.log(\`✅ License valid\`);
      console.log(\`   Expires: \${expires}\`);
      console.log(\`   Country: \${data.country || 'Unknown'}\`);
      console.log(\`   Device:  \${getDeviceName()}\`);
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
const ask = (q) => new Promise(r => rl.question(q, r));

(async () => {
  const saved = loadSavedKey();
  let key;
  if (saved) {
    console.log(\`🔑 Using saved license: \${saved.slice(0, 20)}...\`);
    key = saved;
  } else {
    key = (await ask('Enter license key: ')).trim();
  }

  if (!await validateLicense(key)) { rl.close(); process.exit(1); }

  if (!saved) {
    const save = (await ask('\\n💾 Save license key for next time? (y/n): ')).trim().toLowerCase();
    if (save === 'y') {
      saveKey(key);
      console.log('✅ Key saved to license.dat');
    }
  }

  rl.close();
  console.log('\\n🚀 Application starting...');
  // Your app code here
})();`;

export const cppSnippet = `// Requires: libcurl, nlohmann/json
// Compile: g++ -o app main.cpp -lcurl

#include <iostream>
#include <fstream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

const std::string API_URL = "${API_BASE}/validate";
const std::string LICENSE_FILE = "license.dat";

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* s) {
    s->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::string getHWID() {
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

std::string getDeviceName() {
    char hostname[256];
    #ifdef _WIN32
    DWORD size = sizeof(hostname);
    GetComputerNameA(hostname, &size);
    #else
    gethostname(hostname, sizeof(hostname));
    #endif
    return std::string(hostname);
}

std::string loadSavedKey() {
    std::ifstream f(LICENSE_FILE);
    if (f.good()) {
        std::string key;
        std::getline(f, key);
        return key;
    }
    return "";
}

void saveKey(const std::string& key) {
    std::ofstream f(LICENSE_FILE);
    f << key;
}

bool validateLicense(const std::string& licenseKey) {
    CURL* curl = curl_easy_init();
    if (!curl) return false;

    json payload = {
        {"license_key", licenseKey},
        {"hwid", getHWID()},
        {"device_name", getDeviceName()}
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
        std::string expires = data.value("expires_readable", data.value("expires", "N/A"));
        std::string country = data.value("country", "Unknown");
        std::cout << "License valid" << std::endl;
        std::cout << "   Expires: " << expires << std::endl;
        std::cout << "   Country: " << country << std::endl;
        std::cout << "   Device:  " << getDeviceName() << std::endl;
        return true;
    } else {
        std::cerr << data["error"].get<std::string>() << std::endl;
        return false;
    }
}

int main() {
    std::string key = loadSavedKey();
    bool wasSaved = !key.empty();

    if (wasSaved) {
        std::cout << "Using saved license: " << key.substr(0, 20) << "..." << std::endl;
    } else {
        std::cout << "Enter license key: ";
        std::getline(std::cin, key);
    }

    if (!validateLicense(key)) return 1;

    if (!wasSaved) {
        std::cout << "\\nSave license key for next time? (y/n): ";
        std::string ans;
        std::getline(std::cin, ans);
        if (ans == "y" || ans == "Y") {
            saveKey(key);
            std::cout << "Key saved to license.dat" << std::endl;
        }
    }

    std::cout << "\\nApplication starting..." << std::endl;
    // Your app code here
    return 0;
}`;

export const goSnippet = `package main

import (
	"bufio"
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

const apiURL = "${API_BASE}/validate"
const licenseFile = "license.dat"

func getHWID() string {
	out, err := exec.Command("wmic", "csproduct", "get", "uuid").Output()
	if err != nil {
		return "unknown"
	}
	lines := strings.Split(string(out), "\\n")
	if len(lines) < 2 {
		return "unknown"
	}
	uuid := strings.TrimSpace(lines[1])
	hash := md5.Sum([]byte(uuid))
	return fmt.Sprintf("%x", hash)[:12]
}

func getDeviceName() string {
	name, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return name
}

func loadSavedKey() string {
	data, err := os.ReadFile(licenseFile)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func saveKey(key string) {
	os.WriteFile(licenseFile, []byte(key), 0644)
}

type ValidateRequest struct {
	LicenseKey string \`json:"license_key"\`
	HWID       string \`json:"hwid"\`
	DeviceName string \`json:"device_name"\`
}

type ValidateResponse struct {
	Valid           bool   \`json:"valid"\`
	Expires         string \`json:"expires"\`
	ExpiresReadable string \`json:"expires_readable"\`
	HWID            string \`json:"hwid"\`
	App             string \`json:"app"\`
	Country         string \`json:"country"\`
	Error           string \`json:"error"\`
}

func validateLicense(key string) bool {
	payload, _ := json.Marshal(ValidateRequest{
		LicenseKey: key,
		HWID:       getHWID(),
		DeviceName: getDeviceName(),
	})

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(apiURL, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		fmt.Printf("⚠️ Connection error: %v\\n", err)
		return false
	}
	defer resp.Body.Close()

	var result ValidateResponse
	json.NewDecoder(resp.Body).Decode(&result)

	if result.Valid {
		expires := result.ExpiresReadable
		if expires == "" {
			expires = result.Expires
		}
		fmt.Println("✅ License valid")
		fmt.Printf("   Expires: %s\\n", expires)
		fmt.Printf("   Country: %s\\n", result.Country)
		fmt.Printf("   Device:  %s\\n", getDeviceName())
		return true
	}
	fmt.Printf("❌ %s\\n", result.Error)
	return false
}

func main() {
	reader := bufio.NewReader(os.Stdin)
	saved := loadSavedKey()
	var key string

	if saved != "" {
		fmt.Printf("🔑 Using saved license: %s...\\n", saved[:min(20, len(saved))])
		key = saved
	} else {
		fmt.Print("Enter license key: ")
		key, _ = reader.ReadString('\\n')
		key = strings.TrimSpace(key)
	}

	if !validateLicense(key) {
		os.Exit(1)
	}

	if saved == "" {
		fmt.Print("\\n💾 Save license key for next time? (y/n): ")
		ans, _ := reader.ReadString('\\n')
		if strings.TrimSpace(strings.ToLower(ans)) == "y" {
			saveKey(key)
			fmt.Println("✅ Key saved to license.dat")
		}
	}

	fmt.Println("\\n🚀 Application starting...")
	// Your app code here
}

func min(a, b int) int {
	if a < b { return a }
	return b
}`;

export const javaSnippet = `import java.net.URI;
import java.net.http.*;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import com.google.gson.*;

public class LicenseValidator {
    private static final String API_URL = "${API_BASE}/validate";
    private static final String LICENSE_FILE = "license.dat";

    static String getHWID() {
        try {
            Process p = Runtime.getRuntime().exec("wmic csproduct get uuid");
            BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()));
            br.readLine(); // skip header
            String uuid = br.readLine().trim();
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(uuid.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString().substring(0, 12);
        } catch (Exception e) {
            return "unknown";
        }
    }

    static String getDeviceName() {
        try { return java.net.InetAddress.getLocalHost().getHostName(); }
        catch (Exception e) { return "unknown"; }
    }

    static String loadSavedKey() {
        try { return Files.readString(Path.of(LICENSE_FILE)).trim(); }
        catch (Exception e) { return null; }
    }

    static void saveKey(String key) {
        try { Files.writeString(Path.of(LICENSE_FILE), key); }
        catch (Exception e) { /* ignore */ }
    }

    public static boolean validateLicense(String licenseKey) {
        try {
            JsonObject payload = new JsonObject();
            payload.addProperty("license_key", licenseKey);
            payload.addProperty("hwid", getHWID());
            payload.addProperty("device_name", getDeviceName());

            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                .build();

            HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());

            JsonObject result = JsonParser.parseString(response.body())
                .getAsJsonObject();

            if (result.get("valid").getAsBoolean()) {
                String expires = result.has("expires_readable")
                    ? result.get("expires_readable").getAsString()
                    : result.get("expires").getAsString();
                String country = result.has("country")
                    ? result.get("country").getAsString() : "Unknown";
                System.out.println("✅ License valid");
                System.out.println("   Expires: " + expires);
                System.out.println("   Country: " + country);
                System.out.println("   Device:  " + getDeviceName());
                return true;
            } else {
                System.out.println("❌ " + result.get("error").getAsString());
                return false;
            }
        } catch (Exception e) {
            System.out.println("⚠️ Connection error: " + e.getMessage());
            return false;
        }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String saved = loadSavedKey();
        String key;

        if (saved != null && !saved.isEmpty()) {
            System.out.println("🔑 Using saved license: " +
                saved.substring(0, Math.min(20, saved.length())) + "...");
            key = saved;
        } else {
            System.out.print("Enter license key: ");
            key = reader.readLine().trim();
        }

        if (!validateLicense(key)) System.exit(1);

        if (saved == null || saved.isEmpty()) {
            System.out.print("\\n💾 Save license key for next time? (y/n): ");
            if (reader.readLine().trim().equalsIgnoreCase("y")) {
                saveKey(key);
                System.out.println("✅ Key saved to license.dat");
            }
        }

        System.out.println("\\n🚀 Application starting...");
        // Your app code here
    }
}`;

export const rustSnippet = `// Cargo.toml dependencies:
// reqwest = { version = "0.11", features = ["json", "blocking"] }
// serde = { version = "1", features = ["derive"] }
// serde_json = "1"
// md5 = "0.7"

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::process::Command;

const API_URL: &str = "${API_BASE}/validate";
const LICENSE_FILE: &str = "license.dat";

fn get_hwid() -> String {
    let output = Command::new("wmic")
        .args(["csproduct", "get", "uuid"])
        .output();

    match output {
        Ok(out) => {
            let text = String::from_utf8_lossy(&out.stdout);
            let uuid = text.lines().nth(1)
                .unwrap_or("unknown").trim();
            let hash = md5::compute(uuid.as_bytes());
            format!("{:x}", hash)[..12].to_string()
        }
        Err(_) => "unknown".to_string(),
    }
}

fn get_device_name() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}

fn load_saved_key() -> Option<String> {
    fs::read_to_string(LICENSE_FILE).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn save_key(key: &str) {
    let _ = fs::write(LICENSE_FILE, key);
}

#[derive(Serialize)]
struct ValidateRequest {
    license_key: String,
    hwid: String,
    device_name: String,
}

#[derive(Deserialize)]
struct ValidateResponse {
    valid: bool,
    expires: Option<String>,
    expires_readable: Option<String>,
    country: Option<String>,
    error: Option<String>,
}

fn validate_license(key: &str) -> bool {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    let payload = ValidateRequest {
        license_key: key.to_string(),
        hwid: get_hwid(),
        device_name: get_device_name(),
    };

    match client.post(API_URL).json(&payload).send() {
        Ok(resp) => {
            match resp.json::<ValidateResponse>() {
                Ok(data) => {
                    if data.valid {
                        let expires = data.expires_readable.or(data.expires).unwrap_or_default();
                        let country = data.country.unwrap_or_else(|| "Unknown".to_string());
                        println!("✅ License valid");
                        println!("   Expires: {}", expires);
                        println!("   Country: {}", country);
                        println!("   Device:  {}", get_device_name());
                        true
                    } else {
                        println!("❌ {}",
                            data.error.unwrap_or("Invalid license".into()));
                        false
                    }
                }
                Err(e) => {
                    println!("⚠️ Parse error: {}", e);
                    false
                }
            }
        }
        Err(e) => {
            println!("⚠️ Connection error: {}", e);
            false
        }
    }
}

fn main() {
    let saved = load_saved_key();
    let key;

    if let Some(ref s) = saved {
        println!("🔑 Using saved license: {}...", &s[..s.len().min(20)]);
        key = s.clone();
    } else {
        print!("Enter license key: ");
        io::stdout().flush().unwrap();
        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();
        key = input.trim().to_string();
    }

    if !validate_license(&key) {
        std::process::exit(1);
    }

    if saved.is_none() {
        print!("\\n💾 Save license key for next time? (y/n): ");
        io::stdout().flush().unwrap();
        let mut ans = String::new();
        io::stdin().read_line(&mut ans).unwrap();
        if ans.trim().eq_ignore_ascii_case("y") {
            save_key(&key);
            println!("✅ Key saved to license.dat");
        }
    }

    println!("\\n🚀 Application starting...");
    // Your app code here
}`;

export const languages = [
  { id: "python", label: "Python", code: pythonSnippet },
  { id: "csharp", label: "C# (.NET)", code: csharpSnippet },
  { id: "nodejs", label: "Node.js", code: nodejsSnippet },
  { id: "cpp", label: "C++", code: cppSnippet },
  { id: "go", label: "Go", code: goSnippet },
  { id: "java", label: "Java", code: javaSnippet },
  { id: "rust", label: "Rust", code: rustSnippet },
];
