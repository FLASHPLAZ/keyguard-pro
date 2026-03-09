import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_RATE_LIMIT_MAX = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MIN = 5;

async function getHeartbeatSettings(supabase: any) {
  const { data } = await supabase.from("settings").select("key, value");
  let rateLimitMax = DEFAULT_RATE_LIMIT_MAX;
  let rateLimitWindow = DEFAULT_RATE_LIMIT_WINDOW_MIN;
  if (data) {
    for (const row of data) {
      if (row.key === "heartbeat_rate_limit_max") rateLimitMax = parseInt(row.value) || DEFAULT_RATE_LIMIT_MAX;
      if (row.key === "heartbeat_rate_limit_window") rateLimitWindow = parseInt(row.value) || DEFAULT_RATE_LIMIT_WINDOW_MIN;
    }
  }
  return { rateLimitMax, rateLimitWindow };
}

async function lookupCountry(ip: string): Promise<string> {
  if (!ip || ip === "unknown") return "Unknown";
  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=country`, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.country && data.country !== "") return data.country;
    }
  } catch { /* fall through */ }
  try {
    const resp = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) });
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
    await supabase.from("rate_limits").update({ attempt_count: data.attempt_count + 1 }).eq("id", data.id);
  } else {
    await supabase.from("rate_limits").delete().eq("ip", ip).eq("endpoint", "heartbeat").lt("window_start", windowStart);
    await supabase.from("rate_limits").insert({ ip, endpoint: "heartbeat", attempt_count: 1, window_start: new Date().toISOString() });
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { license_key, application_id } = await req.json();

    if (!license_key || typeof license_key !== "string" || license_key.length > 50) {
      return new Response(JSON.stringify({ active: false, reason: "Invalid license_key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const settings = await getHeartbeatSettings(supabase);

    // Rate limit check
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const isRateLimited = await checkRateLimit(supabase, clientIp, settings.rateLimitMax, settings.rateLimitWindow);
    if (isRateLimited) {
      return new Response(JSON.stringify({ active: false, reason: "Too many requests" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(settings.rateLimitWindow * 60) },
      });
    }

    const country = await lookupCountry(clientIp);

    const { data: license, error } = await supabase
      .from("licenses")
      .select("id, banned, status, expires_at, application_id, applications(name, suspended, kill_switch)")
      .eq("license_key", license_key)
      .single();

    if (error || !license) {
      await supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — License Not Found", ip: clientIp, country,
      });
      return new Response(JSON.stringify({ active: false, reason: "License not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const app = (license as any).applications;

    // Application ID check — license must belong to the requesting app
    if (application_id && license.application_id !== application_id) {
      await supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — App Mismatch", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      });
      return new Response(JSON.stringify({ active: false, reason: "License does not belong to this application" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (license.banned) {
      await supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — Banned", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      });
      return new Response(JSON.stringify({ active: false, reason: "License is banned" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app?.suspended || app?.kill_switch) {
      await supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — App Disabled", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      });
      return new Response(JSON.stringify({ active: false, reason: "Application is disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(license.expires_at) < new Date()) {
      await supabase.from("activity_logs").insert({
        license_key, action: "Heartbeat — Expired", ip: clientIp, country,
        application_id: license.application_id, application_name: app?.name,
      });
      return new Response(JSON.stringify({ active: false, reason: "License expired" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ active: true, app: app?.name, country }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch {
    return new Response(JSON.stringify({ active: false, reason: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
