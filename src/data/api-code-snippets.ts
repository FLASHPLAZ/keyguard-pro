const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

export const pythonSnippet = `import requests
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

export const csharpSnippet = `using System;
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

export const nodejsSnippet = `const crypto = require('crypto');
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

export const cppSnippet = `// Requires: libcurl, nlohmann/json
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

type ValidateRequest struct {
	LicenseKey string \`json:"license_key"\`
	HWID       string \`json:"hwid"\`
}

type ValidateResponse struct {
	Valid   bool   \`json:"valid"\`
	Expires string \`json:"expires"\`
	HWID    string \`json:"hwid"\`
	App     string \`json:"app"\`
	Error   string \`json:"error"\`
}

func validateLicense(key string) bool {
	payload, _ := json.Marshal(ValidateRequest{
		LicenseKey: key,
		HWID:       getHWID(),
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
		fmt.Printf("✅ License valid | Expires: %s\\n", result.Expires)
		return true
	}
	fmt.Printf("❌ %s\\n", result.Error)
	return false
}

func main() {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Enter license key: ")
	key, _ := reader.ReadString('\\n')
	key = strings.TrimSpace(key)

	if !validateLicense(key) {
		os.Exit(1)
	}

	fmt.Println("\\n🚀 Application starting...")
	// Your app code here
}`;

export const javaSnippet = `import java.net.URI;
import java.net.http.*;
import java.io.*;
import java.security.MessageDigest;
import com.google.gson.*;

public class LicenseValidator {
    private static final String API_URL = "${API_BASE}/validate";

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

    public static boolean validateLicense(String licenseKey) {
        try {
            JsonObject payload = new JsonObject();
            payload.addProperty("license_key", licenseKey);
            payload.addProperty("hwid", getHWID());

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
                System.out.println("✅ License valid | Expires: " +
                    result.get("expires").getAsString());
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
        System.out.print("Enter license key: ");
        String key = new BufferedReader(
            new InputStreamReader(System.in)).readLine().trim();

        if (!validateLicense(key)) System.exit(1);

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
use std::io::{self, Write};
use std::process::Command;

const API_URL: &str = "${API_BASE}/validate";

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

#[derive(Serialize)]
struct ValidateRequest {
    license_key: String,
    hwid: String,
}

#[derive(Deserialize)]
struct ValidateResponse {
    valid: bool,
    expires: Option<String>,
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
    };

    match client.post(API_URL).json(&payload).send() {
        Ok(resp) => {
            match resp.json::<ValidateResponse>() {
                Ok(data) => {
                    if data.valid {
                        println!("✅ License valid | Expires: {}",
                            data.expires.unwrap_or_default());
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
    print!("Enter license key: ");
    io::stdout().flush().unwrap();
    let mut key = String::new();
    io::stdin().read_line(&mut key).unwrap();

    if !validate_license(key.trim()) {
        std::process::exit(1);
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
