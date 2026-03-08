import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_RATE_LIMIT_MAX = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 5;
const DEFAULT_IP_THRESHOLD = 5;

interface AdminSettings {
  rateLimitMax: number;
  rateLimitWindow: number;
  discordWebhookUrl: string;
  ipChangeThreshold: number;
  autoBanEnabled: boolean;
}

async function getAdminSettings(supabase: any): Promise<AdminSettings> {
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

  return { rateLimitMax, rateLimitWindow, discordWebhookUrl, ipChangeThreshold, autoBanEnabled };
}

async function sendDiscordWebhook(webhookUrl: string, action: string, details: Record<string, any>) {
  if (!webhookUrl) return;

  const colorMap: Record<string, number> = {
    "License validated": 0x00ff00,
    "HWID bound + validated": 0x00ff00,
    "Unknown key - rejected": 0xff0000,
    "Banned license - rejected": 0xff0000,
    "App disabled - rejected": 0xff6600,
    "Expired license - rejected": 0xffaa00,
    "HWID mismatch - rejected": 0xff0000,
    "Rate limited": 0xff0000,
    "Auto-banned (IP sharing)": 0xff0000,
  };

  const embed = {
    title: `🔑 ${action}`,
    color: colorMap[action] || 0x808080,
    fields: Object.entries(details)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => ({ name: k, value: String(v), inline: true })),
    timestamp: new Date().toISOString(),
    footer: { text: "Galactic Boosts License System" },
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {
    // silently fail
  }
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
    await supabase
      .from("rate_limits")
      .update({ attempt_count: data.attempt_count + 1 })
      .eq("id", data.id);
  } else {
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

async function trackIpAndCheckSharing(
  supabase: any,
  licenseId: string,
  ip: string,
  threshold: number,
  autoBan: boolean
): Promise<{ shouldBan: boolean; uniqueIpCount: number }> {
  // Upsert the IP record for this license
  await supabase
    .from("license_ips")
    .upsert(
      { license_id: licenseId, ip, last_seen: new Date().toISOString() },
      { onConflict: "license_id,ip" }
    );

  // Count unique IPs for this license
  const { count } = await supabase
    .from("license_ips")
    .select("id", { count: "exact", head: true })
    .eq("license_id", licenseId);

  const uniqueIpCount = count || 0;

  if (autoBan && uniqueIpCount >= threshold) {
    return { shouldBan: true, uniqueIpCount };
  }

  return { shouldBan: false, uniqueIpCount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { license_key, hwid } = await req.json();

    if (!license_key || typeof license_key !== "string" || license_key.length > 50) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid license_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (hwid && (typeof hwid !== "string" || hwid.length > 100)) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid hwid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

    // Load admin-configurable settings
    const settings = await getAdminSettings(supabase);

    // Rate limit check
    const isRateLimited = await checkRateLimit(supabase, clientIp, settings.rateLimitMax, settings.rateLimitWindow);
    if (isRateLimited) {
      await sendDiscordWebhook(settings.discordWebhookUrl, "Rate limited", { IP: clientIp, Key: license_key, HWID: hwid || "N/A" });
      return new Response(JSON.stringify({ valid: false, error: "Too many requests. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(settings.rateLimitWindow * 60) },
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
        license_key, action: "Unknown key - rejected", ip: clientIp, hwid: hwid || null,
      });
      await sendDiscordWebhook(settings.discordWebhookUrl, "Unknown key - rejected", { Key: license_key, IP: clientIp, HWID: hwid || "N/A" });
      return new Response(JSON.stringify({ valid: false, error: "License not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const app = license.applications;

    if (license.banned) {
      await supabase.from("activity_logs").insert({
        license_key, application_id: license.application_id, application_name: app?.name,
        action: "Banned license - rejected", ip: clientIp, hwid: hwid || license.hwid, user_id: license.user_id,
      });
      await sendDiscordWebhook(settings.discordWebhookUrl, "Banned license - rejected", { Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid });
      return new Response(JSON.stringify({ valid: false, error: "License is banned" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app?.suspended || app?.kill_switch) {
      await supabase.from("activity_logs").insert({
        license_key, application_id: license.application_id, application_name: app?.name,
        action: "App disabled - rejected", ip: clientIp, hwid: hwid || license.hwid, user_id: license.user_id,
      });
      await sendDiscordWebhook(settings.discordWebhookUrl, "App disabled - rejected", { Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid });
      return new Response(JSON.stringify({ valid: false, error: "Application is disabled" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(license.expires_at) < new Date()) {
      await supabase.from("licenses").update({ status: "expired" }).eq("id", license.id);
      await supabase.from("activity_logs").insert({
        license_key, application_id: license.application_id, application_name: app?.name,
        action: "Expired license - rejected", ip: clientIp, hwid: hwid || license.hwid, user_id: license.user_id,
      });
      await sendDiscordWebhook(settings.discordWebhookUrl, "Expired license - rejected", { Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid, "Expired At": license.expires_at });
      return new Response(JSON.stringify({ valid: false, error: "License expired" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (license.hwid && hwid && license.hwid !== hwid) {
      await supabase.from("activity_logs").insert({
        license_key, application_id: license.application_id, application_name: app?.name,
        action: "HWID mismatch - rejected", ip: clientIp, hwid, user_id: license.user_id,
      });
      await sendDiscordWebhook(settings.discordWebhookUrl, "HWID mismatch - rejected", { Key: license_key, App: app?.name, IP: clientIp, "Sent HWID": hwid, "Bound HWID": license.hwid });
      return new Response(JSON.stringify({ valid: false, error: "HWID mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-sharing: track unique IPs per license and auto-ban if threshold exceeded
    const { shouldBan, uniqueIpCount } = await trackIpAndCheckSharing(
      supabase, license.id, clientIp, settings.ipChangeThreshold, settings.autoBanEnabled
    );

    if (shouldBan) {
      await supabase.from("licenses").update({ banned: true, status: "banned" }).eq("id", license.id);
      await supabase.from("activity_logs").insert({
        license_key, application_id: license.application_id, application_name: app?.name,
        action: "Auto-banned (IP sharing)", ip: clientIp, hwid: hwid || license.hwid, user_id: license.user_id,
      });
      await sendDiscordWebhook(settings.discordWebhookUrl, "Auto-banned (IP sharing)", {
        Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid,
        "Unique IPs": uniqueIpCount, Threshold: settings.ipChangeThreshold,
      });
      return new Response(JSON.stringify({ valid: false, error: "License banned for sharing" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valid — update license
    const updates: Record<string, any> = {
      status: "active", last_used: new Date().toISOString(), ip: clientIp,
    };
    if (!license.hwid && hwid) updates.hwid = hwid;

    await supabase.from("licenses").update(updates).eq("id", license.id);

    const action = !license.hwid && hwid ? "HWID bound + validated" : "License validated";
    await supabase.from("activity_logs").insert({
      license_key, application_id: license.application_id, application_name: app?.name,
      action, ip: clientIp, hwid: hwid || license.hwid, user_id: license.user_id,
    });
    await sendDiscordWebhook(settings.discordWebhookUrl, action, {
      Key: license_key, App: app?.name, IP: clientIp, HWID: hwid || license.hwid, Expires: license.expires_at,
    });

    return new Response(
      JSON.stringify({ valid: true, expires: license.expires_at, hwid: updates.hwid || license.hwid, app: app?.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
