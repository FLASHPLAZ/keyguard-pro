/**
 * GX Auth — official client integration snippets.
 *
 * Every snippet follows the same shape so users can switch languages safely:
 *   1. CONFIG block (base url, application id, optional signing secret)
 *   2. HWID generation
 *   3. POST /validate  -> { valid, expires, expires_readable, hwid, app, country }
 *   4. Optional POST /heartbeat every 30s -> { active, reason? }
 *
 * Formatting rules: spaces only (no tabs), no trailing whitespace, no emoji.
 */

export const API_BASE = "https://www.gxauth.xyz/api";

export const pythonSnippet = `# GX Auth - Python integration
# pip install requests

import hashlib
import hmac
import json
import os
import platform
import secrets
import socket
import sys
import threading
import time

import requests

API_BASE = "${API_BASE}"
APPLICATION_ID = ""      # optional: lock this build to one application (UUID)
SIGNING_SECRET = ""      # optional: required only when HMAC signing is enabled
HEARTBEAT_SECONDS = 30
LICENSE_FILE = "license.dat"


def get_hwid() -> str:
    raw = ":".join([
        platform.node(),
        platform.machine(),
        os.getenv("USERNAME") or os.getenv("USER") or "",
        sys.platform,
    ])
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def build_headers(body: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if SIGNING_SECRET:
        timestamp = str(int(time.time()))
        nonce = secrets.token_hex(16)
        message = timestamp + "." + nonce + "." + body
        headers["X-Signature"] = hmac.new(
            SIGNING_SECRET.encode(), message.encode(), hashlib.sha256
        ).hexdigest()
        headers["X-Timestamp"] = timestamp
        headers["X-Nonce"] = nonce
    return headers


def post(path: str, payload: dict, signed: bool) -> dict:
    body = json.dumps(payload, separators=(",", ":"))
    headers = build_headers(body) if signed else {"Content-Type": "application/json"}
    response = requests.post(API_BASE + path, data=body, headers=headers, timeout=15)
    try:
        return response.json()
    except ValueError:
        return {"valid": False, "error": "HTTP " + str(response.status_code)}


def validate(license_key: str) -> bool:
    payload = {
        "license_key": license_key.strip().upper(),
        "hwid": get_hwid(),
        "device_name": socket.gethostname()[:100],
    }
    if APPLICATION_ID:
        payload["application_id"] = APPLICATION_ID

    data = post("/validate", payload, signed=True)
    if data.get("valid"):
        print("License valid")
        print("  Application :", data.get("app", "unknown"))
        print("  Expires     :", data.get("expires_readable") or data.get("expires"))
        print("  HWID        :", data.get("hwid"))
        return True

    print("Rejected:", data.get("error", "invalid license"))
    if data.get("verify_url"):
        print("Verify this key first at:", data["verify_url"])
    return False


def heartbeat_loop(license_key: str) -> None:
    payload = {"license_key": license_key.strip().upper()}
    if APPLICATION_ID:
        payload["application_id"] = APPLICATION_ID

    while True:
        time.sleep(HEARTBEAT_SECONDS)
        try:
            data = post("/heartbeat", payload, signed=False)
        except requests.RequestException:
            continue
        if not data.get("active"):
            print("Session closed:", data.get("reason", "license no longer active"))
            os._exit(1)


def load_key() -> str:
    if os.path.exists(LICENSE_FILE):
        with open(LICENSE_FILE, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    return ""


def save_key(license_key: str) -> None:
    with open(LICENSE_FILE, "w", encoding="utf-8") as handle:
        handle.write(license_key)


def main() -> None:
    saved = load_key()
    license_key = saved or input("License key: ").strip()

    if not validate(license_key):
        input("Press Enter to exit...")
        sys.exit(1)

    if not saved:
        save_key(license_key)

    threading.Thread(target=heartbeat_loop, args=(license_key,), daemon=True).start()
    print("Protection active - starting application")
    # Your application code goes here.


if __name__ == "__main__":
    main()
`;

export const pythonMinimalSnippet = `# GX Auth - minimal Python gate (validate only)
# pip install requests

import hashlib
import platform
import socket
import sys

import requests

API_BASE = "${API_BASE}"


def get_hwid() -> str:
    raw = platform.node() + ":" + platform.machine() + ":" + sys.platform
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def validate(license_key: str) -> bool:
    response = requests.post(
        API_BASE + "/validate",
        json={
            "license_key": license_key.strip().upper(),
            "hwid": get_hwid(),
            "device_name": socket.gethostname()[:100],
        },
        timeout=15,
    )
    data = response.json()
    if data.get("valid"):
        print("Valid until", data.get("expires_readable"))
        return True
    print("Rejected:", data.get("error"))
    return False


if not validate(input("License key: ")):
    sys.exit(1)

print("Starting application")
`;

export const csharpSnippet = `// GX Auth - C# / .NET integration
// Target: .NET 6 or newer

using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

public static class GxAuth
{
    private const string ApiBase = "${API_BASE}";
    private const string ApplicationId = "";   // optional application UUID
    private const string SigningSecret = "";   // optional HMAC secret
    private const int HeartbeatSeconds = 30;

    private static readonly HttpClient Http = new HttpClient
    {
        Timeout = TimeSpan.FromSeconds(15)
    };

    public static string GetHwid()
    {
        var raw = Environment.MachineName + ":" + Environment.UserName + ":" + Environment.OSVersion.Platform;
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash).ToLowerInvariant().Substring(0, 32);
    }

    private static async Task<JsonElement> PostAsync(string path, object payload, bool signed)
    {
        var body = JsonSerializer.Serialize(payload);
        using var request = new HttpRequestMessage(HttpMethod.Post, ApiBase + path)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };

        if (signed && SigningSecret.Length > 0)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            var nonce = Guid.NewGuid().ToString("N");
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(SigningSecret));
            var signature = Convert.ToHexString(
                hmac.ComputeHash(Encoding.UTF8.GetBytes(timestamp + "." + nonce + "." + body))
            ).ToLowerInvariant();

            request.Headers.Add("X-Signature", signature);
            request.Headers.Add("X-Timestamp", timestamp);
            request.Headers.Add("X-Nonce", nonce);
        }

        var response = await Http.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(text).RootElement.Clone();
    }

    public static async Task<bool> ValidateAsync(string licenseKey)
    {
        var payload = ApplicationId.Length > 0
            ? (object)new
            {
                license_key = licenseKey.Trim().ToUpperInvariant(),
                hwid = GetHwid(),
                device_name = Environment.MachineName,
                application_id = ApplicationId
            }
            : new
            {
                license_key = licenseKey.Trim().ToUpperInvariant(),
                hwid = GetHwid(),
                device_name = Environment.MachineName
            };

        var data = await PostAsync("/validate", payload, signed: true);
        if (data.TryGetProperty("valid", out var valid) && valid.GetBoolean())
        {
            Console.WriteLine("License valid until " + data.GetProperty("expires_readable").GetString());
            return true;
        }

        Console.WriteLine("Rejected: " + (data.TryGetProperty("error", out var error) ? error.GetString() : "invalid license"));
        return false;
    }

    public static void StartHeartbeat(string licenseKey)
    {
        _ = Task.Run(async () =>
        {
            while (true)
            {
                await Task.Delay(HeartbeatSeconds * 1000);
                try
                {
                    var data = await PostAsync("/heartbeat", new { license_key = licenseKey.Trim().ToUpperInvariant() }, signed: false);
                    if (!data.GetProperty("active").GetBoolean())
                    {
                        Console.WriteLine("Session closed: " + data.GetProperty("reason").GetString());
                        Environment.Exit(1);
                    }
                }
                catch (Exception)
                {
                    // network hiccup - retry on next tick
                }
            }
        });
    }
}

public static class Program
{
    public static async Task Main()
    {
        Console.Write("License key: ");
        var key = Console.ReadLine() ?? string.Empty;

        if (!await GxAuth.ValidateAsync(key))
        {
            Console.ReadLine();
            return;
        }

        GxAuth.StartHeartbeat(key);
        Console.WriteLine("Protection active - starting application");
        // Your application code goes here.
    }
}
`;

export const nodejsSnippet = `// GX Auth - Node.js integration (Node 18+, no dependencies)

const crypto = require("crypto");
const os = require("os");
const readline = require("readline");

const API_BASE = "${API_BASE}";
const APPLICATION_ID = "";   // optional application UUID
const SIGNING_SECRET = "";   // optional HMAC secret
const HEARTBEAT_SECONDS = 30;

function getHwid() {
  const raw = [os.hostname(), os.platform(), os.arch(), os.userInfo().username].join(":");
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

async function post(path, payload, signed) {
  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };

  if (signed && SIGNING_SECRET) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    headers["X-Signature"] = crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(timestamp + "." + nonce + "." + body)
      .digest("hex");
    headers["X-Timestamp"] = timestamp;
    headers["X-Nonce"] = nonce;
  }

  const response = await fetch(API_BASE + path, { method: "POST", headers, body });
  return response.json();
}

async function validate(licenseKey) {
  const payload = {
    license_key: licenseKey.trim().toUpperCase(),
    hwid: getHwid(),
    device_name: os.hostname().slice(0, 100),
  };
  if (APPLICATION_ID) payload.application_id = APPLICATION_ID;

  const data = await post("/validate", payload, true);
  if (data.valid) {
    console.log("License valid");
    console.log("  Application:", data.app);
    console.log("  Expires    :", data.expires_readable || data.expires);
    return true;
  }

  console.error("Rejected:", data.error || "invalid license");
  if (data.verify_url) console.error("Verify this key first at:", data.verify_url);
  return false;
}

function startHeartbeat(licenseKey) {
  const payload = { license_key: licenseKey.trim().toUpperCase() };
  if (APPLICATION_ID) payload.application_id = APPLICATION_ID;

  setInterval(async () => {
    try {
      const data = await post("/heartbeat", payload, false);
      if (!data.active) {
        console.error("Session closed:", data.reason || "license no longer active");
        process.exit(1);
      }
    } catch (error) {
      // network hiccup - retry on next tick
    }
  }, HEARTBEAT_SECONDS * 1000).unref();
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

(async () => {
  const key = process.env.GXAUTH_LICENSE_KEY || (await ask("License key: "));

  if (!(await validate(key))) {
    process.exit(1);
  }

  startHeartbeat(key);
  console.log("Protection active - starting application");
  // Your application code goes here.
})();
`;

export const cppSnippet = `// GX Auth - C++ integration
// Requires: libcurl, OpenSSL, nlohmann/json
// Build: g++ main.cpp -lcurl -lcrypto -o app

#include <chrono>
#include <cstdlib>
#include <iostream>
#include <string>
#include <thread>

#include <curl/curl.h>
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

static const std::string API_BASE = "${API_BASE}";
static const std::string APPLICATION_ID = "";   // optional application UUID
static const std::string SIGNING_SECRET = "";   // optional HMAC secret
static const int HEARTBEAT_SECONDS = 30;

static std::string to_hex(const unsigned char *data, unsigned int len) {
    static const char *digits = "0123456789abcdef";
    std::string out;
    out.reserve(len * 2);
    for (unsigned int i = 0; i < len; ++i) {
        out.push_back(digits[data[i] >> 4]);
        out.push_back(digits[data[i] & 0x0F]);
    }
    return out;
}

static std::string sha256_hex(const std::string &input) {
    unsigned char digest[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char *>(input.data()), input.size(), digest);
    return to_hex(digest, SHA256_DIGEST_LENGTH);
}

static std::string hmac_hex(const std::string &key, const std::string &message) {
    unsigned char digest[EVP_MAX_MD_SIZE];
    unsigned int len = 0;
    HMAC(EVP_sha256(), key.data(), static_cast<int>(key.size()),
         reinterpret_cast<const unsigned char *>(message.data()), message.size(), digest, &len);
    return to_hex(digest, len);
}

static std::string get_hwid() {
    const char *user = std::getenv("USERNAME") ? std::getenv("USERNAME") : std::getenv("USER");
    char host[256] = {0};
    gethostname(host, sizeof(host) - 1);
    std::string raw = std::string(host) + ":" + (user ? user : "");
    return sha256_hex(raw).substr(0, 32);
}

static size_t write_cb(void *contents, size_t size, size_t nmemb, void *userp) {
    static_cast<std::string *>(userp)->append(static_cast<char *>(contents), size * nmemb);
    return size * nmemb;
}

static json post(const std::string &path, const json &payload, bool signed_request) {
    const std::string body = payload.dump();
    std::string response;

    CURL *curl = curl_easy_init();
    if (!curl) return json{{"valid", false}, {"error", "curl init failed"}};

    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    if (signed_request && !SIGNING_SECRET.empty()) {
        const std::string timestamp = std::to_string(
            std::chrono::duration_cast<std::chrono::seconds>(
                std::chrono::system_clock::now().time_since_epoch()).count());
        const std::string nonce = sha256_hex(timestamp + body).substr(0, 32);
        const std::string signature = hmac_hex(SIGNING_SECRET, timestamp + "." + nonce + "." + body);

        headers = curl_slist_append(headers, ("X-Signature: " + signature).c_str());
        headers = curl_slist_append(headers, ("X-Timestamp: " + timestamp).c_str());
        headers = curl_slist_append(headers, ("X-Nonce: " + nonce).c_str());
    }

    curl_easy_setopt(curl, CURLOPT_URL, (API_BASE + path).c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);

    const CURLcode code = curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (code != CURLE_OK) return json{{"valid", false}, {"error", "connection failed"}};
    return json::parse(response, nullptr, false);
}

static bool validate(const std::string &license_key) {
    json payload = {
        {"license_key", license_key},
        {"hwid", get_hwid()},
        {"device_name", "cpp-client"}
    };
    if (!APPLICATION_ID.empty()) payload["application_id"] = APPLICATION_ID;

    const json data = post("/validate", payload, true);
    if (data.is_discarded()) {
        std::cout << "Rejected: invalid server response" << std::endl;
        return false;
    }
    if (data.value("valid", false)) {
        std::cout << "License valid until " << data.value("expires_readable", "unknown") << std::endl;
        return true;
    }

    std::cout << "Rejected: " << data.value("error", "invalid license") << std::endl;
    return false;
}

static void heartbeat_loop(const std::string &license_key) {
    json payload = {{"license_key", license_key}};
    if (!APPLICATION_ID.empty()) payload["application_id"] = APPLICATION_ID;

    while (true) {
        std::this_thread::sleep_for(std::chrono::seconds(HEARTBEAT_SECONDS));
        const json data = post("/heartbeat", payload, false);
        if (!data.is_discarded() && !data.value("active", true)) {
            std::cout << "Session closed: " << data.value("reason", "license inactive") << std::endl;
            std::exit(1);
        }
    }
}

int main() {
    curl_global_init(CURL_GLOBAL_DEFAULT);

    std::string key;
    std::cout << "License key: ";
    std::getline(std::cin, key);

    if (!validate(key)) {
        curl_global_cleanup();
        return 1;
    }

    std::thread(heartbeat_loop, key).detach();
    std::cout << "Protection active - starting application" << std::endl;
    // Your application code goes here.

    curl_global_cleanup();
    return 0;
}
`;

export const goSnippet = `// GX Auth - Go integration
// go mod init yourapp && go build

package main

import (
    "bufio"
    "bytes"
    "crypto/hmac"
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "runtime"
    "strconv"
    "strings"
    "time"
)

const (
    apiBase           = "${API_BASE}"
    applicationID     = "" // optional application UUID
    signingSecret     = "" // optional HMAC secret
    heartbeatSeconds  = 30
)

var client = &http.Client{Timeout: 15 * time.Second}

func getHWID() string {
    host, _ := os.Hostname()
    raw := strings.Join([]string{host, runtime.GOOS, runtime.GOARCH, os.Getenv("USER")}, ":")
    sum := sha256.Sum256([]byte(raw))
    return hex.EncodeToString(sum[:])[:32]
}

func post(path string, payload map[string]string, signRequest bool) (map[string]interface{}, error) {
    body, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }

    request, err := http.NewRequest("POST", apiBase+path, bytes.NewReader(body))
    if err != nil {
        return nil, err
    }
    request.Header.Set("Content-Type", "application/json")

    if signRequest && signingSecret != "" {
        timestamp := strconv.FormatInt(time.Now().Unix(), 10)
        buf := make([]byte, 16)
        rand.Read(buf)
        nonce := hex.EncodeToString(buf)

        mac := hmac.New(sha256.New, []byte(signingSecret))
        mac.Write([]byte(timestamp + "." + nonce + "." + string(body)))

        request.Header.Set("X-Signature", hex.EncodeToString(mac.Sum(nil)))
        request.Header.Set("X-Timestamp", timestamp)
        request.Header.Set("X-Nonce", nonce)
    }

    response, err := client.Do(request)
    if err != nil {
        return nil, err
    }
    defer response.Body.Close()

    var data map[string]interface{}
    if err := json.NewDecoder(response.Body).Decode(&data); err != nil {
        return nil, err
    }
    return data, nil
}

func validate(licenseKey string) bool {
    host, _ := os.Hostname()
    payload := map[string]string{
        "license_key": strings.ToUpper(strings.TrimSpace(licenseKey)),
        "hwid":        getHWID(),
        "device_name": host,
    }
    if applicationID != "" {
        payload["application_id"] = applicationID
    }

    data, err := post("/validate", payload, true)
    if err != nil {
        fmt.Println("Connection error:", err)
        return false
    }
    if valid, _ := data["valid"].(bool); valid {
        fmt.Println("License valid until", data["expires_readable"])
        return true
    }

    fmt.Println("Rejected:", data["error"])
    return false
}

func heartbeatLoop(licenseKey string) {
    payload := map[string]string{"license_key": strings.ToUpper(strings.TrimSpace(licenseKey))}
    if applicationID != "" {
        payload["application_id"] = applicationID
    }

    for {
        time.Sleep(heartbeatSeconds * time.Second)
        data, err := post("/heartbeat", payload, false)
        if err != nil {
            continue
        }
        if active, _ := data["active"].(bool); !active {
            fmt.Println("Session closed:", data["reason"])
            os.Exit(1)
        }
    }
}

func main() {
    fmt.Print("License key: ")
    reader := bufio.NewReader(os.Stdin)
    key, _ := reader.ReadString('\\n')

    if !validate(key) {
        os.Exit(1)
    }

    go heartbeatLoop(key)
    fmt.Println("Protection active - starting application")
    // Your application code goes here.
}
`;

export const javaSnippet = `// GX Auth - Java integration (Java 11+, no dependencies)

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Scanner;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class GxAuth {

    private static final String API_BASE = "${API_BASE}";
    private static final String APPLICATION_ID = "";   // optional application UUID
    private static final String SIGNING_SECRET = "";   // optional HMAC secret
    private static final int HEARTBEAT_SECONDS = 30;

    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private static String hex(byte[] bytes) {
        StringBuilder builder = new StringBuilder();
        for (byte b : bytes) {
            builder.append(String.format("%02x", b));
        }
        return builder.toString();
    }

    private static String getHwid() throws Exception {
        String raw = InetAddress.getLocalHost().getHostName()
                + ":" + System.getProperty("os.name")
                + ":" + System.getProperty("user.name");
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return hex(digest.digest(raw.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
    }

    private static String jsonValue(String source, String field) {
        String needle = "\\"" + field + "\\":";
        int index = source.indexOf(needle);
        if (index < 0) {
            return null;
        }
        int start = index + needle.length();
        int end = start;
        while (end < source.length() && source.charAt(end) != ',' && source.charAt(end) != '}') {
            end++;
        }
        return source.substring(start, end).replace("\\"", "").trim();
    }

    private static String post(String path, String body, boolean signRequest) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));

        if (signRequest && !SIGNING_SECRET.isEmpty()) {
            String timestamp = String.valueOf(Instant.now().getEpochSecond());
            String nonce = UUID.randomUUID().toString().replace("-", "");
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SIGNING_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String signature = hex(mac.doFinal((timestamp + "." + nonce + "." + body).getBytes(StandardCharsets.UTF_8)));

            builder.header("X-Signature", signature)
                   .header("X-Timestamp", timestamp)
                   .header("X-Nonce", nonce);
        }

        HttpResponse<String> response = CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    public static boolean validate(String licenseKey) throws Exception {
        String key = licenseKey.trim().toUpperCase();
        StringBuilder body = new StringBuilder();
        body.append("{\\"license_key\\":\\"").append(key).append("\\"")
            .append(",\\"hwid\\":\\"").append(getHwid()).append("\\"")
            .append(",\\"device_name\\":\\"").append(InetAddress.getLocalHost().getHostName()).append("\\"");
        if (!APPLICATION_ID.isEmpty()) {
            body.append(",\\"application_id\\":\\"").append(APPLICATION_ID).append("\\"");
        }
        body.append("}");

        String response = post("/validate", body.toString(), true);
        if ("true".equals(jsonValue(response, "valid"))) {
            System.out.println("License valid until " + jsonValue(response, "expires_readable"));
            return true;
        }

        System.out.println("Rejected: " + jsonValue(response, "error"));
        return false;
    }

    public static void startHeartbeat(String licenseKey) {
        Thread thread = new Thread(() -> {
            String body = "{\\"license_key\\":\\"" + licenseKey.trim().toUpperCase() + "\\"}";
            while (true) {
                try {
                    Thread.sleep(HEARTBEAT_SECONDS * 1000L);
                    String response = post("/heartbeat", body, false);
                    if (!"true".equals(jsonValue(response, "active"))) {
                        System.out.println("Session closed: " + jsonValue(response, "reason"));
                        System.exit(1);
                    }
                } catch (Exception ignored) {
                    // network hiccup - retry on next tick
                }
            }
        });
        thread.setDaemon(true);
        thread.start();
    }

    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        System.out.print("License key: ");
        String key = scanner.nextLine();

        if (!validate(key)) {
            System.exit(1);
        }

        startHeartbeat(key);
        System.out.println("Protection active - starting application");
        // Your application code goes here.
    }
}
`;

export const rustSnippet = `// GX Auth - Rust integration
// Cargo.toml:
//   reqwest = { version = "0.11", features = ["blocking", "json"] }
//   serde_json = "1"
//   sha2 = "0.10"
//   hmac = "0.12"
//   hex = "0.4"

use std::io::{self, Write};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use hmac::{Hmac, Mac};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

const API_BASE: &str = "${API_BASE}";
const APPLICATION_ID: &str = "";  // optional application UUID
const SIGNING_SECRET: &str = "";  // optional HMAC secret
const HEARTBEAT_SECONDS: u64 = 30;

type HmacSha256 = Hmac<Sha256>;

fn get_hwid() -> String {
    let host = hostname();
    let user = std::env::var("USERNAME").or_else(|_| std::env::var("USER")).unwrap_or_default();
    let raw = format!("{}:{}:{}", host, user, std::env::consts::OS);
    let digest = Sha256::digest(raw.as_bytes());
    hex::encode(digest)[..32].to_string()
}

fn hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "rust-client".to_string())
}

fn post(path: &str, payload: &Value, sign_request: bool) -> Result<Value, Box<dyn std::error::Error>> {
    let body = serde_json::to_string(payload)?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()?;

    let mut request = client
        .post(format!("{}{}", API_BASE, path))
        .header("Content-Type", "application/json");

    if sign_request && !SIGNING_SECRET.is_empty() {
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs().to_string();
        let nonce = hex::encode(Sha256::digest(format!("{}{}", timestamp, body).as_bytes()))[..32].to_string();

        let mut mac = HmacSha256::new_from_slice(SIGNING_SECRET.as_bytes())?;
        mac.update(format!("{}.{}.{}", timestamp, nonce, body).as_bytes());

        request = request
            .header("X-Signature", hex::encode(mac.finalize().into_bytes()))
            .header("X-Timestamp", timestamp)
            .header("X-Nonce", nonce);
    }

    let response = request.body(body).send()?;
    Ok(response.json::<Value>()?)
}

fn validate(license_key: &str) -> bool {
    let mut payload = json!({
        "license_key": license_key.trim().to_uppercase(),
        "hwid": get_hwid(),
        "device_name": hostname(),
    });
    if !APPLICATION_ID.is_empty() {
        payload["application_id"] = json!(APPLICATION_ID);
    }

    match post("/validate", &payload, true) {
        Ok(data) => {
            if data["valid"].as_bool().unwrap_or(false) {
                println!("License valid until {}", data["expires_readable"].as_str().unwrap_or("unknown"));
                true
            } else {
                println!("Rejected: {}", data["error"].as_str().unwrap_or("invalid license"));
                false
            }
        }
        Err(error) => {
            println!("Connection error: {}", error);
            false
        }
    }
}

fn heartbeat_loop(license_key: String) {
    let mut payload = json!({ "license_key": license_key.trim().to_uppercase() });
    if !APPLICATION_ID.is_empty() {
        payload["application_id"] = json!(APPLICATION_ID);
    }

    loop {
        thread::sleep(Duration::from_secs(HEARTBEAT_SECONDS));
        if let Ok(data) = post("/heartbeat", &payload, false) {
            if !data["active"].as_bool().unwrap_or(true) {
                println!("Session closed: {}", data["reason"].as_str().unwrap_or("license inactive"));
                std::process::exit(1);
            }
        }
    }
}

fn main() {
    print!("License key: ");
    io::stdout().flush().ok();
    let mut key = String::new();
    io::stdin().read_line(&mut key).ok();
    let key = key.trim().to_string();

    if !validate(&key) {
        std::process::exit(1);
    }

    let cloned = key.clone();
    thread::spawn(move || heartbeat_loop(cloned));

    println!("Protection active - starting application");
    // Your application code goes here.
}
`;

export const curlSnippet = `# GX Auth - raw HTTP reference (curl)

# 1. Validate a license (binds HWID on first success)
curl -sS -X POST "${API_BASE}/validate" \\
  -H "Content-Type: application/json" \\
  -d '{"license_key":"GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX","hwid":"abc123","device_name":"My-PC"}'

# 2. Heartbeat while the tool is running (every 30-60s)
curl -sS -X POST "${API_BASE}/heartbeat" \\
  -H "Content-Type: application/json" \\
  -d '{"license_key":"GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"}'

# 3. Read-only lookup for web portals (no HWID binding, no logs)
curl -sS -X POST "${API_BASE}/check-license" \\
  -H "Content-Type: application/json" \\
  -d '{"license_key":"GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"}'

# 4. Reset HWID with a Bot API Key from Settings
curl -sS -X POST "${API_BASE}/reset-hwid" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: gk_your_bot_api_key" \\
  -d '{"license_key":"GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"}'
`;

/** Kept for backwards compatibility with older imports. */
export const pythonCliGateSnippet = pythonSnippet;

export const languages = [
  { id: "python", label: "Python", code: pythonSnippet, filename: "license_client.py", syntax: "python" },
  { id: "python-minimal", label: "Python Minimal", code: pythonMinimalSnippet, filename: "license_minimal.py", syntax: "python" },
  { id: "csharp", label: "C# (.NET)", code: csharpSnippet, filename: "LicenseClient.cs", syntax: "clike" },
  { id: "nodejs", label: "Node.js", code: nodejsSnippet, filename: "licenseClient.js", syntax: "js" },
  { id: "cpp", label: "C++", code: cppSnippet, filename: "license_client.cpp", syntax: "clike" },
  { id: "go", label: "Go", code: goSnippet, filename: "license_client.go", syntax: "clike" },
  { id: "java", label: "Java", code: javaSnippet, filename: "LicenseClient.java", syntax: "clike" },
  { id: "rust", label: "Rust", code: rustSnippet, filename: "license_client.rs", syntax: "clike" },
  { id: "curl", label: "cURL / HTTP", code: curlSnippet, filename: "requests.sh", syntax: "shell" },
];
