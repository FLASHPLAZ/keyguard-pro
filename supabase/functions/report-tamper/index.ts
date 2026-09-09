import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveClientIp } from "../_shared/client-ip.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const LICENSE_KEY_PATTERN = /^GALACTIC-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}$/;
const MAX_BODY_BYTES = 14_000_000; // ~10MB image once base64-decoded
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EVENT_TYPES = new Set([
  "debugger_detected",
  "injection_detected",
  "memory_tamper",
  "clock_tamper",
  "file_tamper",
  "vm_detected",
  "unknown_module",
  "manual_report",
]);

const SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const SCOPES = new Set(["none", "window", "fullscreen"]);

function decodeBase64(input: string): Uint8Array | null {
  try {
    const clean = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
    const bin = atob(clean.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function geoLookup(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country_name/`);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text && text.length < 60 && !text.startsWith("{") ? text : null;
  } catch {
    return null;
  }
}

async function postWebhook(url: string, embed: Record<string, unknown>) {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {
    /* best effort */
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonResponse({ success: false, error: "Payload too large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const licenseKey = typeof body.license_key === "string" ? body.license_key.trim().toUpperCase() : "";
  if (!LICENSE_KEY_PATTERN.test(licenseKey)) {
    return jsonResponse({ success: false, error: "Invalid license key" }, 400);
  }

  const eventType = typeof body.event_type === "string" && EVENT_TYPES.has(body.event_type)
    ? body.event_type
    : "manual_report";
  const severity = typeof body.severity === "string" && SEVERITIES.has(body.severity) ? body.severity : "critical";
  const scope = typeof body.screenshot_scope === "string" && SCOPES.has(body.screenshot_scope)
    ? body.screenshot_scope
    : "none";
  const detailText = typeof body.details === "string" ? body.details.slice(0, 1000) : "";
  const hwid = typeof body.hwid === "string" ? body.hwid.slice(0, 128) : null;
  const deviceName = typeof body.device_name === "string" ? body.device_name.slice(0, 128) : null;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const clientIp = resolveClientIp(req);

  const { data: license } = await supabase
    .from("licenses")
    .select("id, tenant_id, user_id, license_key, banned, application_id, applications(name)")
    .eq("license_key", licenseKey)
    .maybeSingle();

  if (!license) return jsonResponse({ success: false, error: "Unknown license key" }, 404);

  const appName = (license as any).applications?.name ?? null;

  // 1. Store evidence image (private bucket) if provided
  let evidencePath: string | null = null;
  if (scope !== "none" && typeof body.screenshot_base64 === "string" && body.screenshot_base64.length > 0) {
    const bytes = decodeBase64(body.screenshot_base64);
    if (bytes && bytes.length <= MAX_IMAGE_BYTES) {
      const path = `${license.tenant_id}/${license.id}/${Date.now()}-${eventType}.png`;
      const { error: upErr } = await supabase.storage
        .from("tamper-evidence")
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (!upErr) evidencePath = path;
    }
  }

  // 2. Instant permanent ban (reversible from the admin panel)
  if (!license.banned) {
    await supabase
      .from("licenses")
      .update({ banned: true, status: "banned", notes: `Auto-banned: ${eventType}` })
      .eq("id", license.id);
  }

  const country = await geoLookup(clientIp);

  // 3. Alert record
  const { data: event } = await supabase
    .from("security_events")
    .insert({
      tenant_id: license.tenant_id,
      application_id: license.application_id,
      application_name: appName,
      license_id: license.id,
      license_key: license.license_key,
      event_type: eventType,
      severity,
      action_taken: "permanent_ban",
      details: { message: detailText, reported_at: new Date().toISOString() },
      ip: clientIp,
      country,
      hwid,
      device_name: deviceName,
      evidence_path: evidencePath,
      evidence_scope: scope,
    })
    .select("id")
    .maybeSingle();

  // 4. Activity log
  await supabase.from("activity_logs").insert({
    tenant_id: license.tenant_id,
    license_key: license.license_key,
    application_id: license.application_id,
    application_name: appName,
    action: "Tamper Detected — Auto Ban",
    ip: clientIp,
    hwid,
    country,
    device_name: deviceName,
    metadata: { event_type: eventType, severity, evidence: Boolean(evidencePath) },
  });

  // 5. Discord alerts (platform admin + workspace owner), best effort
  const embed = {
    title: "🚨 Tamper Detected — License Permanently Banned",
    color: 0xdb52eb,
    fields: [
      { name: "License", value: `\`${license.license_key}\``, inline: false },
      { name: "Application", value: appName || "Unknown", inline: true },
      { name: "Detection", value: eventType, inline: true },
      { name: "Severity", value: severity, inline: true },
      { name: "IP", value: clientIp, inline: true },
      { name: "Country", value: country || "Unknown", inline: true },
      { name: "Device", value: deviceName || hwid || "Unknown", inline: true },
      { name: "Evidence", value: evidencePath ? `Captured (${scope})` : "None", inline: false },
      ...(detailText ? [{ name: "Details", value: detailText.slice(0, 900), inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
  };

  const targets = new Set<string>();
  const adminHook = Deno.env.get("DISCORD_WEBHOOK_URL") || "";
  if (adminHook) targets.add(adminHook);
  const { data: owner } = await supabase
    .from("tenants")
    .select("owner_user_id")
    .eq("id", license.tenant_id)
    .maybeSingle();
  if (owner?.owner_user_id) {
    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", owner.owner_user_id)
      .eq("key", "discord_webhook_url")
      .maybeSingle();
    if (setting?.value) targets.add(setting.value as string);
  }
  await Promise.all([...targets].map((url) => postWebhook(url, embed)));

  return jsonResponse({
    success: true,
    event_id: event?.id ?? null,
    action_taken: "permanent_ban",
    evidence_stored: Boolean(evidencePath),
  }, 200);
});
