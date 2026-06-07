import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_RATE_LIMIT_MAX = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MIN = 5;

// ── Cache settings for 1 minute ──
let settingsCache: { data: any; expiry: number } | null = null;

async function getHeartbeatSettings(supabase: any) {
  if (settingsCache && Date.now() < settingsCache.expiry) return settingsCache.data;

  const { data } = await supabase.from("settings").select("key, value");
  let rateLimitMax = DEFAULT_RATE_LIMIT_MAX;
  let rateLimitWindow = DEFAULT_RATE_LIMIT_WINDOW_MIN;
  if (data) {
    for (const row of data) {
      if (row.key === "heartbeat_rate_limit_max") rateLimitMax = parseInt(row.value) || DEFAULT_RATE_LIMIT_MAX;
      if (row.key === "heartbeat_rate_limit_window") rateLimitWindow = parseInt(row.value) || DEFAULT_RATE_LIMIT_WINDOW_MIN;
    }
  }
  const result = { rateLimitMax, rateLimitWindow };
  settingsCache = { data: result, expiry: Date.now() + 60_000 };
  return result;
}

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

async function checkRateLimit(supabase: any, ip: string, max: number, windowMinutes: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("rate_limits")
    .select("id, attempt_count")
    .eq("ip", ip)
    .eq("endpoint", "heartbeat")
    .gte("window_start", windowStart)
    .single();

  if (data) {
    if (data.attempt_count >= max) return true;
    supabase.from("rate_limits").update({ attempt_count: data.attempt_count + 1 }).eq("id", data.id).then(() => {});
  } else {
    supabase.from("rate_limits").delete().eq("ip", ip).eq("endpoint", "heartbeat").lt("window_start", windowStart)
      .then(() => supabase.from("rate_limits").insert({ ip, endpoint: "heartbeat", attempt_count: 1, window_start: new Date().toISOString() }))
      .catch(() => {});
  }
  return false;
}

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
    let parsed: any;
    try {
      parsed = await req.json();
    } catch {
      return jsonResponse({ active: false, reason: "Invalid JSON body" }, 400);
    }

    const { license_key, application_id, hwid, device_name } = parsed;

    if (!license_key || typeof license_key !== "string" || license_key.length > 50) {
      return jsonResponse({ active: false, reason: "Invalid license_key" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

    // ── Phase 1: All independent queries in parallel ──
    const [settings, license_result, country] = await Promise.all([
      getHeartbeatSettings(supabase),
      supabase
        .from("licenses")
        .select("id, banned, status, expires_at, application_id, last_seen, hwid, device_name, applications(name, suspended, kill_switch)")
        .eq("license_key", license_key)
        .single(),
      lookupCountry(clientIp),
    ]);

    // Rate limit (uses cached settings so very fast)
    const isRateLimited = await checkRateLimit(supabase, clientIp, settings.rateLimitMax, settings.rateLimitWindow);
    if (isRateLimited) {
      return new Response(JSON.stringify({ active: false, reason: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(settings.rateLimitWindow * 60) },
      });
    }

    const { data: license, error } = license_result;

    if (error || !license) {
      // Fire-and-forget log
      supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — License Not Found", ip: clientIp, country,
      }).then(() => {});
      return jsonResponse({ active: false, reason: "License not found" }, 404);
    }

    const app = (license as any).applications;

    if (application_id && license.application_id !== application_id) {
      supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — App Mismatch", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      }).then(() => {});
      return jsonResponse({ active: false, reason: "License does not belong to this application" }, 403);
    }

    if (license.banned) {
      supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — Banned", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      }).then(() => {});
      return jsonResponse({ active: false, reason: "License is banned" }, 200);
    }

    if (app?.suspended || app?.kill_switch) {
      supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — App Disabled", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      }).then(() => {});
      return jsonResponse({ active: false, reason: "Application is disabled" }, 200);
    }

    if (new Date(license.expires_at) < new Date()) {
      supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — Expired", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      }).then(() => {});
      return jsonResponse({ active: false, reason: "License expired" }, 200);
    }

    // ── Success: track last_seen and log "Tool Online" on transitions ──
    const now = new Date();
    const prevSeen = license.last_seen ? new Date(license.last_seen) : null;
    const offlineFor = prevSeen ? (now.getTime() - prevSeen.getTime()) / 60000 : Infinity;
    const effHwid = hwid || (license as any).hwid || null;
    const effDevice = device_name || (license as any).device_name || null;

    // Fire-and-forget: bump last_seen on every successful heartbeat
    supabase.from("licenses").update({
      last_seen: now.toISOString(),
      last_seen_ip: clientIp,
      last_seen_country: country,
      last_seen_hwid: effHwid,
    }).eq("id", (license as any).id).then(() => {});

    // Log "Tool Online" when transitioning from offline (>5 min gap or never seen),
    // and a lightweight "Heartbeat — Active" ping at most every 5 minutes for admin trail
    if (offlineFor >= 5) {
      supabase.from("activity_logs").insert({
        license_key,
        action: prevSeen ? "Tool Online" : "Tool Online — First Connect",
        ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
        hwid: effHwid, device_name: effDevice,
      }).then(() => {});
    } else if (offlineFor >= 1) {
      // Periodic heartbeat trail (every ~1 min minimum) — keeps ActiveSessionsWidget fresh
      supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — Active",
        ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
        hwid: effHwid, device_name: effDevice,
      }).then(() => {});
    }

    return jsonResponse({ active: true, app: app?.name, country, last_seen: now.toISOString() }, 200);

  } catch {
    return jsonResponse({ active: false, reason: "Internal server error" }, 500);
  }
});
