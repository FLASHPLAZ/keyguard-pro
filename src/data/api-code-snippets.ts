const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

export const pythonSnippet = `import requests
import subprocess
import hashlib
import hmac
import socket
import os
import sys
import time
import json
import threading

API_URL = "${API_BASE}/validate"
HEARTBEAT_URL = "${API_BASE}/heartbeat"
HEARTBEAT_INTERVAL = 30  # seconds — check every 30s for instant kill
LICENSE_FILE = "license.dat"
SIGNING_SECRET = ""  # Set your app's signing secret here (from dashboard)

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

def sign_request(body_str: str, secret: str) -> tuple:
    """Generate HMAC-SHA256 signature and timestamp for request signing."""
    timestamp = str(int(time.time()))
    signing_payload = f"{timestamp}.{body_str}"
    signature = hmac.new(
        secret.encode(), signing_payload.encode(), hashlib.sha256
    ).hexdigest()
    return signature, timestamp

def validate_license(key: str) -> bool:
    try:
        payload = {
            "license_key": key,
            "hwid": get_hwid(),
            "device_name": get_device_name()
        }
        body_str = json.dumps(payload, separators=(',', ':'))
        
        headers = {"Content-Type": "application/json"}
        
        # Add HMAC signature if signing secret is configured
        if SIGNING_SECRET:
            signature, timestamp = sign_request(body_str, SIGNING_SECRET)
            headers["X-Signature"] = signature
            headers["X-Timestamp"] = timestamp
        
        response = requests.post(API_URL, data=body_str, headers=headers, timeout=10)
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

def heartbeat_loop(key: str):
    """Background thread: periodically checks if license is still active.
    Exits the program immediately if banned, expired, or app disabled."""
    while True:
        time.sleep(HEARTBEAT_INTERVAL)
        try:
            resp = requests.post(HEARTBEAT_URL, json={"license_key": key}, timeout=5)
            data = resp.json()
            if not data.get("active"):
                reason = data.get("reason", "License no longer active")
                print(f"\\n🚫 KILLED: {reason}")
                os._exit(1)  # Force exit immediately
        except Exception:
            pass  # Network error — retry next cycle

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
    
    # Start heartbeat thread — will kill the app if license is banned/expired
    hb = threading.Thread(target=heartbeat_loop, args=(key,), daemon=True)
    hb.start()
    print(f"💓 Heartbeat active (checking every {HEARTBEAT_INTERVAL}s)")
    
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
    private static readonly string SIGNING_SECRET = ""; // Set your app's signing secret here

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

    static (string signature, string timestamp) SignRequest(string body, string secret)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signingPayload = $"{timestamp}.{body}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signingPayload));
        var signature = BitConverter.ToString(hash).Replace("-", "").ToLower();
        return (signature, timestamp);
    }

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

            var request = new HttpRequestMessage(HttpMethod.Post, API_URL);
            request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

            // Add HMAC signature if signing secret is configured
            if (!string.IsNullOrEmpty(SIGNING_SECRET))
            {
                var (signature, timestamp) = SignRequest(payload, SIGNING_SECRET);
                request.Headers.Add("X-Signature", signature);
                request.Headers.Add("X-Timestamp", timestamp);
            }

            var response = await client.SendAsync(request);
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
const HEARTBEAT_URL = "${API_BASE}/heartbeat";
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const LICENSE_FILE = "license.dat";
const SIGNING_SECRET = ""; // Set your app's signing secret here

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

function signRequest(bodyStr, secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signingPayload = \`\${timestamp}.\${bodyStr}\`;
  const signature = crypto.createHmac('sha256', secret)
    .update(signingPayload).digest('hex');
  return { signature, timestamp };
}

async function validateLicense(licenseKey) {
  try {
    const payload = {
      license_key: licenseKey,
      hwid: getHWID(),
      device_name: getDeviceName()
    };
    const bodyStr = JSON.stringify(payload);
    
    const headers = { 'Content-Type': 'application/json' };
    
    // Add HMAC signature if signing secret is configured
    if (SIGNING_SECRET) {
      const { signature, timestamp } = signRequest(bodyStr, SIGNING_SECRET);
      headers['X-Signature'] = signature;
      headers['X-Timestamp'] = timestamp;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: bodyStr
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

export const cppSnippet = `// Requires: libcurl, nlohmann/json, OpenSSL
// Compile: g++ -o app main.cpp -lcurl -lssl -lcrypto

#include <iostream>
#include <fstream>
#include <string>
#include <ctime>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <openssl/hmac.h>

using json = nlohmann::json;

const std::string API_URL = "${API_BASE}/validate";
const std::string LICENSE_FILE = "license.dat";
const std::string SIGNING_SECRET = ""; // Set your app's signing secret here

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

std::string hmacSha256(const std::string& secret, const std::string& data) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int hashLen;
    HMAC(EVP_sha256(), secret.c_str(), secret.size(),
         (unsigned char*)data.c_str(), data.size(), hash, &hashLen);
    char hex[65];
    for (unsigned int i = 0; i < hashLen; i++)
        sprintf(hex + i * 2, "%02x", hash[i]);
    hex[hashLen * 2] = 0;
    return std::string(hex);
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

    // Add HMAC signature if signing secret is configured
    if (!SIGNING_SECRET.empty()) {
        std::string timestamp = std::to_string(std::time(nullptr));
        std::string signingPayload = timestamp + "." + postData;
        std::string signature = hmacSha256(SIGNING_SECRET, signingPayload);
        headers = curl_slist_append(headers, ("X-Signature: " + signature).c_str());
        headers = curl_slist_append(headers, ("X-Timestamp: " + timestamp).c_str());
    }

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
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

const apiURL = "${API_BASE}/validate"
const licenseFile = "license.dat"
const signingSecret = "" // Set your app's signing secret here

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

func signRequest(bodyStr string, secret string) (string, string) {
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	signingPayload := timestamp + "." + bodyStr
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingPayload))
	signature := hex.EncodeToString(mac.Sum(nil))
	return signature, timestamp
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
	bodyStr := string(payload)

	req, err := http.NewRequest("POST", apiURL, bytes.NewBufferString(bodyStr))
	if err != nil {
		fmt.Printf("⚠️ Request error: %v\\n", err)
		return false
	}
	req.Header.Set("Content-Type", "application/json")

	// Add HMAC signature if signing secret is configured
	if signingSecret != "" {
		signature, timestamp := signRequest(bodyStr, signingSecret)
		req.Header.Set("X-Signature", signature)
		req.Header.Set("X-Timestamp", timestamp)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
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
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import com.google.gson.*;

public class LicenseValidator {
    private static final String API_URL = "${API_BASE}/validate";
    private static final String LICENSE_FILE = "license.dat";
    private static final String SIGNING_SECRET = ""; // Set your app's signing secret here

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

    static String[] signRequest(String body, String secret) throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String signingPayload = timestamp + "." + body;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        byte[] hash = mac.doFinal(signingPayload.getBytes());
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return new String[]{ sb.toString(), timestamp };
    }

    public static boolean validateLicense(String licenseKey) {
        try {
            JsonObject payload = new JsonObject();
            payload.addProperty("license_key", licenseKey);
            payload.addProperty("hwid", getHWID());
            payload.addProperty("device_name", getDeviceName());
            String bodyStr = payload.toString();

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyStr));

            // Add HMAC signature if signing secret is configured
            if (!SIGNING_SECRET.isEmpty()) {
                String[] sig = signRequest(bodyStr, SIGNING_SECRET);
                requestBuilder.header("X-Signature", sig[0]);
                requestBuilder.header("X-Timestamp", sig[1]);
            }

            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();

            HttpResponse<String> response = client.send(requestBuilder.build(),
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
// hmac = "0.12"
// sha2 = "0.10"
// hex = "0.4"

use hmac::{Hmac, Mac};
use sha2::Sha256;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

const API_URL: &str = "${API_BASE}/validate";
const LICENSE_FILE: &str = "license.dat";
const SIGNING_SECRET: &str = ""; // Set your app's signing secret here

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

fn sign_request(body: &str, secret: &str) -> (String, String) {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        .to_string();
    let signing_payload = format!("{}.{}", timestamp, body);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(signing_payload.as_bytes());
    let signature = hex::encode(mac.finalize().into_bytes());
    (signature, timestamp)
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
    let payload = ValidateRequest {
        license_key: key.to_string(),
        hwid: get_hwid(),
        device_name: get_device_name(),
    };
    let body_str = serde_json::to_string(&payload).unwrap();

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    let mut request = client.post(API_URL)
        .header("Content-Type", "application/json");

    // Add HMAC signature if signing secret is configured
    if !SIGNING_SECRET.is_empty() {
        let (signature, timestamp) = sign_request(&body_str, SIGNING_SECRET);
        request = request
            .header("X-Signature", signature)
            .header("X-Timestamp", timestamp);
    }

    match request.body(body_str).send() {
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
