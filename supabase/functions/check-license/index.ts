import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, any>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MINUTES = 5;
const LICENSE_KEY_PATTERN = /^GALACTIC-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}$/;

async function checkRateLimit(supabase: any, ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("rate_limits")
    .select("id, attempt_count")
    .eq("ip", ip)
    .eq("endpoint", "check-license")
    .gte("window_start", windowStart)
    .single();
  if (data) {
    if (data.attempt_count >= RATE_LIMIT_MAX) return true;
    supabase.from("rate_limits").update({ attempt_count: data.attempt_count + 1 }).eq("id", data.id).then(() => {});
  } else {
    supabase.from("rate_limits").delete().eq("ip", ip).eq("endpoint", "check-license").lt("window_start", windowStart)
      .then(() => supabase.from("rate_limits").insert({ ip, endpoint: "check-license", attempt_count: 1, window_start: new Date().toISOString() }))
      .catch(() => {});
  }
  return false;
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
      return jsonResponse({ valid: false, error: "Invalid JSON body" }, 400);
    }

    const license_key = typeof parsed.license_key === "string" ? parsed.license_key.trim().toUpperCase() : parsed.license_key;

    if (!license_key || typeof license_key !== "string" || license_key.length > 50) {
      return jsonResponse({ valid: false, error: "Invalid license_key" }, 400);
    }
    if (!LICENSE_KEY_PATTERN.test(license_key)) {
      return jsonResponse({ valid: false, error: "Invalid license key format" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

    // Rate limit
    const isRateLimited = await checkRateLimit(supabase, clientIp);
    if (isRateLimited) {
      return new Response(JSON.stringify({ valid: false, error: "Too many requests. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(RATE_LIMIT_WINDOW_MINUTES * 60) },
      });
    }

    // Lookup license + app
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*, applications(name, suspended, kill_switch)")
      .eq("license_key", license_key)
      .single();

    if (error || !license) {
      return jsonResponse({ valid: false, error: "License not found" }, 404);
    }

    const app = license.applications;

    // Banned
    if (license.banned) {
      return jsonResponse({ valid: false, error: "License is banned", license_key, application: app?.name || null, status: "banned" }, 403);
    }

    // App disabled
    if (app?.suspended || app?.kill_switch) {
      return jsonResponse({ valid: false, error: "Application is disabled", license_key, application: app?.name || null, status: "disabled" }, 403);
    }

    // Expired
    if (new Date(license.expires_at) < new Date()) {
      return jsonResponse({
        valid: false, error: "License expired", license_key,
        application: app?.name || null, status: "expired",
        expires_at: license.expires_at, expires_readable: formatExpiry(license.expires_at),
      }, 410);
    }

    // Valid
    return jsonResponse({
      valid: true,
      license_key: license.license_key,
      application: app?.name || null,
      status: license.status,
      expires_at: license.expires_at,
      expires_readable: formatExpiry(license.expires_at),
      owner_name: license.owner_name || null,
      is_used: !!license.hwid,
      is_banned: false,
    }, 200);

  } catch (err) {
    console.error("Check-license error:", err);
    return jsonResponse({ valid: false, error: "Internal server error" }, 500);
  }
});
