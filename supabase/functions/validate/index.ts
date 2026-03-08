import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX = 10; // max attempts per window
const RATE_LIMIT_WINDOW_MINUTES = 5; // window size in minutes

async function sendDiscordWebhook(action: string, details: Record<string, any>) {
  const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!webhookUrl) return;

  const colorMap: Record<string, number> = {
    "License validated": 0x00ff00,       // green
    "HWID bound + validated": 0x00ff00,  // green
    "Unknown key - rejected": 0xff0000,  // red
    "Banned license - rejected": 0xff0000,
    "App disabled - rejected": 0xff6600, // orange
    "Expired license - rejected": 0xffaa00, // yellow
    "HWID mismatch - rejected": 0xff0000,
    "Rate limited": 0xff0000,
  };

  const embed = {
    title: `🔑 ${action}`,
    color: colorMap[action] || 0x808080,
    fields: Object.entries(details)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => ({ name: k, value: String(v), inline: true })),
    timestamp: new Date().toISOString(),
    footer: { text: "Galactic License System" },
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {
    // silently fail - don't break validation over webhook
  }
}

async function checkRateLimit(supabase: any, ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

  // Get current count for this IP in the window
  const { data } = await supabase
    .from("rate_limits")
    .select("id, attempt_count")
    .eq("ip", ip)
    .eq("endpoint", "validate")
    .gte("window_start", windowStart)
    .single();

  if (data) {
    if (data.attempt_count >= RATE_LIMIT_MAX) {
      return true; // rate limited
    }
    await supabase
      .from("rate_limits")
      .update({ attempt_count: data.attempt_count + 1 })
      .eq("id", data.id);
  } else {
    // Clean old entries and create new window
    await supabase
      .from("rate_limits")
      .delete()
      .eq("ip", ip)
      .eq("endpoint", "validate")
      .lt("window_start", windowStart);

    await supabase
      .from("rate_limits")
      .insert({ ip, endpoint: "validate", attempt_count: 1, window_start: new Date().toISOString() });
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { license_key, hwid } = await req.json();

    if (!license_key) {
      return new Response(JSON.stringify({ valid: false, error: "Missing license_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    // Rate limit check
    const isRateLimited = await checkRateLimit(supabase, clientIp);
    if (isRateLimited) {
      await sendDiscordWebhook("Rate limited", { IP: clientIp, Key: license_key, HWID: hwid || "N/A" });
      return new Response(JSON.stringify({ valid: false, error: "Too many requests. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(RATE_LIMIT_WINDOW_MINUTES * 60) },
      });
    }

    // Find license
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*, applications(name, suspended, kill_switch)")
      .eq("license_key", license_key)
      .single();

    if (error || !license) {
      await supabase.from("activity_logs").insert({
        license_key,
        action: "Unknown key - rejected",
        ip: clientIp,
        hwid: hwid || null,
      });
      await sendDiscordWebhook("Unknown key - rejected", { Key: license_key, IP: clientIp, HWID: hwid || "N/A" });
      return new Response(JSON.stringify({ valid: false, error: "License not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const app = license.applications;

    // Check if banned
    if (license.banned) {
      await supabase.from("activity_logs").insert({
        license_key,
        application_id: license.application_id,
        application_name: app?.name,
        action: "Banned license - rejected",
        ip: clientIp,
        hwid: hwid || license.hwid,
        user_id: license.user_id,
      });
      await sendDiscordWebhook("Banned license - rejected", { Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid });
      return new Response(JSON.stringify({ valid: false, error: "License is banned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check app status
    if (app?.suspended || app?.kill_switch) {
      await supabase.from("activity_logs").insert({
        license_key,
        application_id: license.application_id,
        application_name: app?.name,
        action: "App disabled - rejected",
        ip: clientIp,
        hwid: hwid || license.hwid,
        user_id: license.user_id,
      });
      await sendDiscordWebhook("App disabled - rejected", { Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid });
      return new Response(JSON.stringify({ valid: false, error: "Application is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(license.expires_at) < new Date()) {
      await supabase.from("licenses").update({ status: "expired" }).eq("id", license.id);
      await supabase.from("activity_logs").insert({
        license_key,
        application_id: license.application_id,
        application_name: app?.name,
        action: "Expired license - rejected",
        ip: clientIp,
        hwid: hwid || license.hwid,
        user_id: license.user_id,
      });
      await sendDiscordWebhook("Expired license - rejected", { Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid, "Expired At": license.expires_at });
      return new Response(JSON.stringify({ valid: false, error: "License expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HWID binding
    if (license.hwid && hwid && license.hwid !== hwid) {
      await supabase.from("activity_logs").insert({
        license_key,
        application_id: license.application_id,
        application_name: app?.name,
        action: "HWID mismatch - rejected",
        ip: clientIp,
        hwid: hwid,
        user_id: license.user_id,
      });
      await sendDiscordWebhook("HWID mismatch - rejected", { Key: license_key, App: app?.name, IP: clientIp, "Sent HWID": hwid, "Bound HWID": license.hwid });
      return new Response(JSON.stringify({ valid: false, error: "HWID mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bind HWID on first use
    const updates: Record<string, any> = {
      status: "active",
      last_used: new Date().toISOString(),
      ip: clientIp,
    };
    if (!license.hwid && hwid) {
      updates.hwid = hwid;
    }

    await supabase.from("licenses").update(updates).eq("id", license.id);

    const action = !license.hwid && hwid ? "HWID bound + validated" : "License validated";

    await supabase.from("activity_logs").insert({
      license_key,
      application_id: license.application_id,
      application_name: app?.name,
      action,
      ip: clientIp,
      hwid: hwid || license.hwid,
      user_id: license.user_id,
    });

    await sendDiscordWebhook(action, {
      Key: license_key,
      App: app?.name,
      IP: clientIp,
      HWID: hwid || license.hwid,
      Expires: license.expires_at,
    });

    return new Response(
      JSON.stringify({
        valid: true,
        expires: license.expires_at,
        hwid: updates.hwid || license.hwid,
        app: app?.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
