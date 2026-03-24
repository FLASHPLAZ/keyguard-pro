import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_RATE_LIMIT_MAX = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 5;
const DEFAULT_IP_THRESHOLD = 5;
const SIGNATURE_MAX_AGE_SECONDS = 60;

// ── Cache for admin settings (avoid DB hit on every request) ──
let settingsCache: { data: AdminSettings; expiry: number } | null = null;
const SETTINGS_CACHE_TTL_MS = 60_000; // 1 minute

interface AdminSettings {
  rateLimitMax: number;
  rateLimitWindow: number;
  discordWebhookUrl: string;
  ipChangeThreshold: number;
  autoBanEnabled: boolean;
}

async function getAdminSettings(supabase: any): Promise<AdminSettings> {
  if (settingsCache && Date.now() < settingsCache.expiry) return settingsCache.data;

  const { data } = await supabase.from("settings").select("key, value");
  let rateLimitMax = DEFAULT_RATE_LIMIT_MAX;
  let rateLimitWindow = DEFAULT_RATE_LIMIT_WINDOW_MINUTES;
  let discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL") || "";
  let ipChangeThreshold = DEFAULT_IP_THRESHOLD;
  let autoBanEnabled = true;
  if (data) {
    for (const row of data) {
      if (row.key === "rate_limit_max") rateLimitMax = parseInt(row.value) || DEFAULT_RATE_LIMIT_MAX;
      if (row.key === "rate_limit_window") rateLimitWindow = parseInt(row.value) || DEFAULT_RATE_LIMIT_WINDOW_MINUTES;
      if (row.key === "discord_webhook_url" && row.value) discordWebhookUrl = row.value;
      if (row.key === "ip_change_threshold") ipChangeThreshold = parseInt(row.value) || DEFAULT_IP_THRESHOLD;
      if (row.key === "auto_ban_enabled") autoBanEnabled = row.value !== "false";
    }
  }
  const result = { rateLimitMax, rateLimitWindow, discordWebhookUrl, ipChangeThreshold, autoBanEnabled };
  settingsCache = { data: result, expiry: Date.now() + SETTINGS_CACHE_TTL_MS };
  return result;
}

function formatExpiry(expiresAt: string): string {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 3600 * 24));
  const dateStr = expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (daysLeft > 36000) return `${dateStr} (Lifetime)`;
  if (daysLeft <= 0) return `${dateStr} (Expired)`;
  if (daysLeft === 1) return `${dateStr} (1 day left)`;
  return `${dateStr} (${daysLeft} days left)`;
}

// ── Non-blocking country lookup with 2s timeout ──
async function lookupCountry(ip: string): Promise<string> {
  if (!ip || ip === "unknown") return "Unknown";
  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=country`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.country) return data.country;
    }
  } catch { /* fall through */ }
  try {
    const resp = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.country_name) return data.country_name;
    }
  } catch { /* ignore */ }
  return "Unknown";
}

// ── Fire-and-forget: send Discord webhook without blocking ──
function fireDiscordWebhook(webhookUrl: string, action: string, details: Record<string, any>) {
  if (!webhookUrl) return;
  const colorMap: Record<string, number> = {
    "✅ License Login Successful": 0x00ff00,
    "✅ First Login — HWID Bound": 0x00cc88,
    "❌ Unknown Key — Rejected": 0xff0000,
    "🚫 Banned License — Rejected": 0xff0000,
    "⛔ App Disabled — Rejected": 0xff6600,
    "⏰ Expired License — Rejected": 0xffaa00,
    "🔒 HWID Mismatch — Rejected": 0xff0000,
    "🚦 Rate Limited": 0xff0000,
    "🔨 Auto-Banned (IP Sharing)": 0xff0000,
    "🛑 Blacklisted IP — Rejected": 0xff0000,
    "🛑 Blacklisted HWID — Rejected": 0xff0000,
    "⚠️ Invalid Signature — Rejected": 0xff0000,
    "⏳ Expired Request — Rejected": 0xff0000,
    "🚫 App Mismatch — Rejected": 0xff0000,
  };
  const embed = {
    title: action,
    color: colorMap[action] || 0x808080,
    fields: Object.entries(details)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => ({ name: k, value: String(v), inline: true })),
    timestamp: new Date().toISOString(),
    footer: { text: "Galactic Boosts License System" },
  };
  // Fire and forget — don't await
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(() => {});
}

async function checkRateLimit(supabase: any, ip: string, max: number, windowMinutes: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("rate_limits")
    .select("id, attempt_count")
    .eq("ip", ip)
    .eq("endpoint", "validate")
    .gte("window_start", windowStart)
    .single();
  if (data) {
    if (data.attempt_count >= max) return true;
    // Fire and forget — don't block on counter update
    supabase.from("rate_limits").update({ attempt_count: data.attempt_count + 1 }).eq("id", data.id).then(() => {});
  } else {
    // Clean old + insert new — fire and forget
    supabase.from("rate_limits").delete().eq("ip", ip).eq("endpoint", "validate").lt("window_start", windowStart)
      .then(() => supabase.from("rate_limits").insert({ ip, endpoint: "validate", attempt_count: 1, window_start: new Date().toISOString() }))
      .catch(() => {});
  }
  return false;
}

async function trackIpAndCheckSharing(
  supabase: any, licenseId: string, ip: string, threshold: number, autoBan: boolean
): Promise<{ shouldBan: boolean; uniqueIpCount: number }> {
  // Upsert and count in parallel
  const [_, { count }] = await Promise.all([
    supabase.from("license_ips").upsert(
      { license_id: licenseId, ip, last_seen: new Date().toISOString() },
      { onConflict: "license_id,ip" }
    ),
    supabase.from("license_ips").select("id", { count: "exact", head: true }).eq("license_id", licenseId),
  ]);
  const uniqueIpCount = count || 0;
  if (autoBan && uniqueIpCount >= threshold) return { shouldBan: true, uniqueIpCount };
  return { shouldBan: false, uniqueIpCount };
}

async function checkBlacklist(supabase: any, ip: string, hwid: string | null): Promise<{ blocked: boolean; type: string; reason: string }> {
  // Check IP and HWID blacklists in parallel
  const checks = [
    supabase.from("blacklist").select("reason").eq("type", "ip").eq("value", ip).maybeSingle(),
  ];
  if (hwid) {
    checks.push(supabase.from("blacklist").select("reason").eq("type", "hwid").eq("value", hwid).maybeSingle());
  }
  const results = await Promise.all(checks);

  if (results[0]?.data) return { blocked: true, type: "ip", reason: results[0].data.reason || "IP is blacklisted" };
  if (hwid && results[1]?.data) return { blocked: true, type: "hwid", reason: results[1].data.reason || "HWID is blacklisted" };
  return { blocked: false, type: "", reason: "" };
}

async function verifyHmacSignature(
  body: string, signature: string, timestamp: string, secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === signature.toLowerCase();
}

// ── Helper: log + webhook fire-and-forget ──
function logAndNotify(
  supabase: any, webhookUrl: string, logData: Record<string, any>, discordAction: string, embedData: Record<string, any>,
  startTime?: number
) {
  if (startTime) logData.response_time_ms = Date.now() - startTime;
  supabase.from("activity_logs").insert(logData).then(() => {});
  fireDiscordWebhook(webhookUrl, discordAction, embedData);
}

// ── Reusable JSON response ──
function jsonResponse(body: Record<string, any>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const rawBody = await req.text();
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ valid: false, error: "Invalid JSON body" }, 400);
    }

    const { license_key, hwid, device_name, application_id } = parsed;

    // ── Input validation ──
    if (!license_key || typeof license_key !== "string" || license_key.length > 50) {
      return jsonResponse({ valid: false, error: "Invalid license_key" }, 400);
    }
    if (hwid && (typeof hwid !== "string" || hwid.length > 100)) {
      return jsonResponse({ valid: false, error: "Invalid hwid" }, 400);
    }

    const sanitizedDeviceName = (device_name && typeof device_name === "string")
      ? device_name.slice(0, 100).trim() : null;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const providedSignature = req.headers.get("x-signature");
    const providedTimestamp = req.headers.get("x-timestamp");

    // ── Phase 1: Parallel — settings, blacklist, rate limit, license lookup, country ──
    // All independent queries run simultaneously for maximum speed
    const [settings, blacklistResult, license_result, country] = await Promise.all([
      getAdminSettings(supabase),
      checkBlacklist(supabase, clientIp, hwid || null),
      supabase
        .from("licenses")
        .select("*, applications(name, suspended, kill_switch, signing_secret, signature_required)")
        .eq("license_key", license_key)
        .single(),
      lookupCountry(clientIp),
    ]);

    // ── Blacklist check ──
    if (blacklistResult.blocked) {
      const action = blacklistResult.type === "ip" ? "🛑 Blacklisted IP — Rejected" : "🛑 Blacklisted HWID — Rejected";
      const dbAction = blacklistResult.type === "ip" ? "Blacklisted IP — Rejected" : "Blacklisted HWID — Rejected";
      logAndNotify(supabase, settings.discordWebhookUrl,
        { license_key, action: dbAction, ip: clientIp, hwid: hwid || null, device_name: sanitizedDeviceName, country },
        action,
        { "🔑 Key": license_key, "🌐 IP": clientIp, "🖥️ HWID": hwid || "N/A", "🌍 Country": country, "💻 Device": sanitizedDeviceName || "N/A", "📝 Reason": blacklistResult.reason }
      , startTime);
      return jsonResponse({ valid: false, error: "Access denied" }, 403);
    }

    // ── Rate limit (uses cached settings) ──
    const isRateLimited = await checkRateLimit(supabase, clientIp, settings.rateLimitMax, settings.rateLimitWindow);
    if (isRateLimited) {
      fireDiscordWebhook(settings.discordWebhookUrl, "🚦 Rate Limited", {
        "🌐 IP": clientIp, "🔑 Key": license_key, "🖥️ HWID": hwid || "N/A", "🌍 Country": country, "💻 Device": sanitizedDeviceName || "N/A",
      });
      return new Response(JSON.stringify({ valid: false, error: "Too many requests. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(settings.rateLimitWindow * 60) },
      });
    }

    // ── License lookup result ──
    const { data: license, error } = license_result;
    if (error || !license) {
      logAndNotify(supabase, settings.discordWebhookUrl,
        { license_key, action: "Unknown Key — Rejected", ip: clientIp, hwid: hwid || null, device_name: sanitizedDeviceName, country },
        "❌ Unknown Key — Rejected",
        { "🔑 Key": license_key, "🌐 IP": clientIp, "🖥️ HWID": hwid || "N/A", "🌍 Country": country, "💻 Device": sanitizedDeviceName || "N/A" }
      , startTime);
      return jsonResponse({ valid: false, error: "License not found" }, 404);
    }

    const app = license.applications;
    const logBase = {
      license_key, application_id: license.application_id, application_name: app?.name,
      ip: clientIp, user_id: license.user_id, device_name: sanitizedDeviceName, country,
    };
    const embedBase = {
      "🔑 Key": license_key, "📱 App": app?.name, "🌐 IP": clientIp, "🌍 Country": country, "💻 Device": sanitizedDeviceName || "N/A",
    };

    // ── Application ID mismatch ──
    if (application_id && license.application_id !== application_id) {
      logAndNotify(supabase, settings.discordWebhookUrl,
        { ...logBase, action: "App Mismatch — Rejected", hwid: hwid || null },
        "🚫 App Mismatch — Rejected",
        { ...embedBase, "❌ Requested App": application_id, "🖥️ HWID": hwid || "N/A" }
      , startTime);
      return jsonResponse({ valid: false, error: "License does not belong to this application" }, 403);
    }

    // ── HMAC Signature verification ──
    if (app?.signature_required && app?.signing_secret) {
      if (!providedSignature || !providedTimestamp) {
        logAndNotify(supabase, settings.discordWebhookUrl,
          { ...logBase, action: "Invalid Signature — Rejected", hwid: hwid || null },
          "⚠️ Invalid Signature — Rejected",
          { ...embedBase, "🖥️ HWID": hwid || "N/A", "📝 Reason": "Missing signature or timestamp header" }
        , startTime);
        return jsonResponse({ valid: false, error: "Signature required" }, 403);
      }

      const requestTime = parseInt(providedTimestamp);
      const now = Math.floor(Date.now() / 1000);
      if (isNaN(requestTime) || Math.abs(now - requestTime) > SIGNATURE_MAX_AGE_SECONDS) {
        logAndNotify(supabase, settings.discordWebhookUrl,
          { ...logBase, action: "Expired Request — Rejected", hwid: hwid || null },
          "⏳ Expired Request — Rejected",
          { ...embedBase, "🖥️ HWID": hwid || "N/A", "📝 Reason": "Request timestamp expired (>60s)" }
        , startTime);
        return jsonResponse({ valid: false, error: "Request expired" }, 403);
      }

      const isValid = await verifyHmacSignature(rawBody, providedSignature, providedTimestamp, app.signing_secret);
      if (!isValid) {
        logAndNotify(supabase, settings.discordWebhookUrl,
          { ...logBase, action: "Invalid Signature — Rejected", hwid: hwid || null },
          "⚠️ Invalid Signature — Rejected",
          { ...embedBase, "🖥️ HWID": hwid || "N/A", "📝 Reason": "HMAC signature mismatch" }
        , startTime);
        return jsonResponse({ valid: false, error: "Invalid signature" }, 403);
      }
    }

    // ── Banned check ──
    if (license.banned) {
      logAndNotify(supabase, settings.discordWebhookUrl,
        { ...logBase, action: "Banned License — Rejected", hwid: hwid || license.hwid },
        "🚫 Banned License — Rejected",
        { ...embedBase, "🖥️ HWID": hwid || license.hwid }
      , startTime);
      return jsonResponse({ valid: false, error: "License is banned" }, 403);
    }

    // ── App disabled ──
    if (app?.suspended || app?.kill_switch) {
      logAndNotify(supabase, settings.discordWebhookUrl,
        { ...logBase, action: "App Disabled — Rejected", hwid: hwid || license.hwid },
        "⛔ App Disabled — Rejected",
        { ...embedBase, "🖥️ HWID": hwid || license.hwid }
      , startTime);
      return jsonResponse({ valid: false, error: "Application is disabled" }, 403);
    }

    // ── Expired check ──
    if (new Date(license.expires_at) < new Date()) {
      // Update status fire-and-forget
      supabase.from("licenses").update({ status: "expired" }).eq("id", license.id).then(() => {});
      logAndNotify(supabase, settings.discordWebhookUrl,
        { ...logBase, action: "Expired License — Rejected", hwid: hwid || license.hwid },
        "⏰ Expired License — Rejected",
        { ...embedBase, "🖥️ HWID": hwid || license.hwid, "📅 Expires": formatExpiry(license.expires_at) }
      , startTime);
      return jsonResponse({ valid: false, error: "License expired" }, 403);
    }

    // ── HWID mismatch ──
    if (license.hwid && hwid && license.hwid !== hwid) {
      logAndNotify(supabase, settings.discordWebhookUrl,
        { ...logBase, action: "HWID Mismatch — Rejected", hwid },
        "🔒 HWID Mismatch — Rejected",
        { ...embedBase, "🖥️ Sent HWID": hwid, "🔐 Bound HWID": license.hwid }
      , startTime);
      return jsonResponse({ valid: false, error: "HWID mismatch" }, 403);
    }

    // ── Anti-sharing check ──
    const { shouldBan, uniqueIpCount } = await trackIpAndCheckSharing(
      supabase, license.id, clientIp, settings.ipChangeThreshold, settings.autoBanEnabled
    );
    if (shouldBan) {
      supabase.from("licenses").update({ banned: true, status: "banned" }).eq("id", license.id).then(() => {});
      logAndNotify(supabase, settings.discordWebhookUrl,
        { ...logBase, action: "Auto-Banned (IP Sharing)", hwid: hwid || license.hwid },
        "🔨 Auto-Banned (IP Sharing)",
        { ...embedBase, "🖥️ HWID": hwid || license.hwid, "🌐 Unique IPs": uniqueIpCount, "⚙️ Threshold": settings.ipChangeThreshold }
      , startTime);
      return jsonResponse({ valid: false, error: "License banned for sharing" }, 403);
    }

    // ── SUCCESS — update license fire-and-forget ──
    const updates: Record<string, any> = {
      status: "active", last_used: new Date().toISOString(), ip: clientIp,
    };
    if (!license.hwid && hwid) updates.hwid = hwid;
    if (sanitizedDeviceName) updates.device_name = sanitizedDeviceName;

    supabase.from("licenses").update(updates).eq("id", license.id).then(() => {});

    const action = !license.hwid && hwid ? "First Login — HWID Bound" : "License Login";
    const discordAction = !license.hwid && hwid ? "✅ First Login — HWID Bound" : "✅ License Login Successful";
    logAndNotify(supabase, settings.discordWebhookUrl,
      { ...logBase, action, hwid: hwid || license.hwid },
      discordAction,
      { ...embedBase, "🖥️ HWID": hwid || license.hwid, "📅 Expires": formatExpiry(license.expires_at) }
    , startTime);

    return jsonResponse({
      valid: true, expires: license.expires_at, expires_readable: formatExpiry(license.expires_at),
      hwid: updates.hwid || license.hwid, app: app?.name, country, device_name: sanitizedDeviceName,
    }, 200);

  } catch (err) {
    console.error("Validate error:", err);
    return jsonResponse({ valid: false, error: "Internal server error" }, 500);
  }
});
