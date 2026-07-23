import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BODY_BYTES = 32_768;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LICENSE_KEY_PATTERN = /^GALACTIC-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}$/;
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

type BotContext = {
  userId: string;
  tenantId: string;
  isAdmin: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const apiKey = req.headers.get("x-api-key") || "";
    const ctx = await authenticateBotKey(supabase, apiKey);
    const body = await readJsonBody(req);
    const action = String(body.action || "").trim().toLowerCase();

    if (!action) return json({ error: "Missing action" }, 400);

    switch (action) {
      case "profile":
        return json(await profileSummary(supabase, ctx));
      case "list_apps":
        return json(await listApps(supabase, ctx));
      case "create_app":
        return json(await createApp(supabase, ctx, body));
      case "delete_app":
        return json(await deleteApp(supabase, ctx, body));
      case "list_licenses":
        return json(await listLicenses(supabase, ctx, body));
      case "create_license":
        return json(await createLicense(supabase, ctx, body));
      case "delete_license":
        return json(await deleteLicense(supabase, ctx, body));
      case "ban_license":
        return json(await updateLicenseBan(supabase, ctx, body, true));
      case "unban_license":
        return json(await updateLicenseBan(supabase, ctx, body, false));
      case "reset_hwid":
        return json(await resetHwid(supabase, ctx, body));
      case "list_resellers":
        return json(await listResellers(supabase, ctx));
      case "create_reseller":
        return json(await createReseller(supabase, ctx, body));
      case "delete_reseller":
        return json(await deleteManagedUser(supabase, ctx, body, "reseller"));
      case "list_managers":
        return json(await listManagers(supabase, ctx));
      case "create_manager":
        return json(await createManager(supabase, ctx, body));
      case "delete_manager":
        return json(await deleteManagedUser(supabase, ctx, body, "manager"));
      default:
        return json({ error: "Unsupported action" }, 400);
    }
  } catch (error) {
    console.error("Bot manage error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "PAYLOAD_TOO_LARGE") return json({ error: "Request body too large" }, 413);
    if (message === "INVALID_JSON") return json({ error: "Invalid JSON body" }, 400);
    if (message === "UNAUTHORIZED") return json({ error: "Invalid Bot API Key" }, 401);
    if (message === "FORBIDDEN") return json({ error: "Action not allowed for this workspace" }, 403);
    return json({ error: "Internal server error" }, 500);
  }
});

async function authenticateBotKey(supabase: any, apiKey: string): Promise<BotContext> {
  if (!apiKey || apiKey.length < 20) throw new Error("UNAUTHORIZED");
  const { data: keyRow } = await supabase
    .from("settings")
    .select("user_id")
    .eq("key", "bot_api_key")
    .eq("value", apiKey)
    .maybeSingle();
  if (!keyRow?.user_id) throw new Error("UNAUTHORIZED");

  const [{ data: roleRow }, { data: tenant }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", keyRow.user_id).eq("role", "admin").maybeSingle(),
    supabase.from("tenants").select("id").eq("owner_user_id", keyRow.user_id).maybeSingle(),
  ]);
  if (!tenant?.id) throw new Error("FORBIDDEN");
  return { userId: keyRow.user_id, tenantId: tenant.id, isAdmin: !!roleRow };
}

async function profileSummary(supabase: any, ctx: BotContext) {
  const [{ data: tenant }, { count: apps }, { count: licenses }, { count: resellers }, { count: managers }] = await Promise.all([
    supabase.from("tenants").select("id, name, plan, billing_cycle, plan_expires_at, suspended").eq("id", ctx.tenantId).maybeSingle(),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId),
    supabase.from("licenses").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId),
    supabase.from("resellers").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId),
    supabase.from("manager_permissions").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId),
  ]);
  return { success: true, tenant, usage: { apps, licenses, resellers, managers } };
}

async function listApps(supabase: any, ctx: BotContext) {
  const { data, error } = await supabase
    .from("applications")
    .select("id, name, description, suspended, kill_switch, created_at")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return { success: true, apps: data || [] };
}

async function createApp(supabase: any, ctx: BotContext, body: any) {
  const name = cleanText(body.name, 80);
  if (!name) return { success: false, error: "App name is required" };
  const { data, error } = await supabase.from("applications").insert({
    user_id: ctx.userId,
    tenant_id: ctx.tenantId,
    name,
    description: cleanText(body.description, 240) || "",
  }).select("id, name").single();
  if (error) throw error;
  await logAction(supabase, ctx, "Bot created application", { application_id: data.id, application_name: data.name });
  return { success: true, app: data };
}

async function deleteApp(supabase: any, ctx: BotContext, body: any) {
  const appId = requireUuid(body.application_id);
  await assertApp(supabase, ctx, appId);
  const { error } = await supabase.from("applications").delete().eq("id", appId).eq("tenant_id", ctx.tenantId);
  if (error) throw error;
  await logAction(supabase, ctx, "Bot deleted application", { application_id: appId });
  return { success: true, deleted_application_id: appId };
}

async function listLicenses(supabase: any, ctx: BotContext, body: any) {
  let query = supabase
    .from("licenses")
    .select("id, license_key, status, banned, expires_at, hwid, owner_email, application_id, applications(name)")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Number(body.limit || 25), 50));
  if (body.application_id) query = query.eq("application_id", requireUuid(body.application_id));
  const { data, error } = await query;
  if (error) throw error;
  return { success: true, licenses: data || [] };
}

async function createLicense(supabase: any, ctx: BotContext, body: any) {
  const appId = requireUuid(body.application_id);
  await assertApp(supabase, ctx, appId);
  const days = Math.min(Math.max(Number(body.days || 30), 1), 36500);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const licenseKey = generateLicenseKey();
  const { data, error } = await supabase.from("licenses").insert({
    license_key: licenseKey,
    application_id: appId,
    user_id: ctx.userId,
    tenant_id: ctx.tenantId,
    expires_at: expiresAt,
    owner_email: cleanText(body.owner_email, 160) || null,
    owner_name: cleanText(body.owner_name, 120) || null,
  } as any).select("id, license_key, expires_at").single();
  if (error) throw error;
  await logAction(supabase, ctx, "Bot created license", { license_key: licenseKey, application_id: appId });
  return { success: true, license: data };
}

async function deleteLicense(supabase: any, ctx: BotContext, body: any) {
  const license = await assertLicense(supabase, ctx, body.license_key);
  const { error } = await supabase.from("licenses").delete().eq("id", license.id).eq("tenant_id", ctx.tenantId);
  if (error) throw error;
  await logAction(supabase, ctx, "Bot deleted license", { license_key: license.license_key, application_id: license.application_id });
  return { success: true, deleted_license_key: license.license_key };
}

async function updateLicenseBan(supabase: any, ctx: BotContext, body: any, banned: boolean) {
  const license = await assertLicense(supabase, ctx, body.license_key);
  const { error } = await supabase
    .from("licenses")
    .update({ banned, status: banned ? "banned" : "active" })
    .eq("id", license.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw error;
  await logAction(supabase, ctx, banned ? "Bot banned license" : "Bot unbanned license", { license_key: license.license_key });
  return { success: true, license_key: license.license_key, banned };
}

async function resetHwid(supabase: any, ctx: BotContext, body: any) {
  const license = await assertLicense(supabase, ctx, body.license_key);
  const { error } = await supabase
    .from("licenses")
    .update({ hwid: null, ip: null, status: "unused" })
    .eq("id", license.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw error;
  await supabase.from("license_ips").delete().eq("license_id", license.id);
  await logAction(supabase, ctx, "Bot reset HWID", { license_key: license.license_key });
  return { success: true, license_key: license.license_key, previous_hwid: license.hwid || null };
}

async function listResellers(supabase: any, ctx: BotContext) {
  const { data, error } = await supabase
    .from("resellers")
    .select("id, user_id, username, email, credits, allowed_apps, total_generated, created_at")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return { success: true, resellers: data || [] };
}

async function createReseller(supabase: any, ctx: BotContext, body: any) {
  const username = cleanText(body.username, 60);
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  if (!username || !email || password.length < 8) return { success: false, error: "username, valid email, and 8+ char password are required" };
  const allowedApps = Array.isArray(body.allowed_apps) ? body.allowed_apps.filter((id: string) => UUID_PATTERN.test(String(id))) : [];
  for (const appId of allowedApps) await assertApp(supabase, ctx, appId);
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { username },
  });
  if (createError) return { success: false, error: createError.message };
  const userId = newUser.user.id;
  const { error } = await supabase.from("resellers").insert({
    username, email, credits: Number(body.credits || 10), admin_id: ctx.userId, user_id: userId, tenant_id: ctx.tenantId, allowed_apps: allowedApps,
  });
  if (error) {
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    throw error;
  }
  await supabase.from("profiles").update({ role: "reseller" }).eq("user_id", userId);
  await supabase.from("user_roles").delete().eq("user_id", userId);
  await supabase.from("user_roles").insert({ user_id: userId, role: "reseller" });
  await logAction(supabase, ctx, "Bot created reseller", { email, username });
  return { success: true, reseller: { user_id: userId, username, email } };
}

async function listManagers(supabase: any, ctx: BotContext) {
  const { data, error } = await supabase
    .from("manager_permissions")
    .select("id, user_id, can_create_apps, can_edit_apps, can_delete_apps, can_view_licenses, created_at")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const userIds = (data || []).map((row: any) => row.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, username, email").in("user_id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles || []).map((row: any) => [row.user_id, row]));
  return {
    success: true,
    managers: (data || []).map((row: any) => ({
      ...row,
      profile: profileMap.get(row.user_id) || null,
    })),
  };
}

async function createManager(supabase: any, ctx: BotContext, body: any) {
  const username = cleanText(body.username, 60);
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  if (!username || !email || password.length < 8) return { success: false, error: "username, valid email, and 8+ char password are required" };
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { username },
  });
  if (createError) return { success: false, error: createError.message };
  const userId = newUser.user.id;
  await supabase.from("profiles").update({ role: "manager" }).eq("user_id", userId);
  await supabase.from("user_roles").delete().eq("user_id", userId);
  await supabase.from("user_roles").insert({ user_id: userId, role: "manager" });
  const { error } = await supabase.from("manager_permissions").insert({
    user_id: userId,
    tenant_id: ctx.tenantId,
    can_create_apps: body.can_create_apps ?? true,
    can_edit_apps: body.can_edit_apps ?? true,
    can_delete_apps: body.can_delete_apps ?? true,
    can_view_licenses: body.can_view_licenses ?? true,
  } as any);
  if (error) {
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    throw error;
  }
  await logAction(supabase, ctx, "Bot created manager", { email, username });
  return { success: true, manager: { user_id: userId, username, email } };
}

async function deleteManagedUser(supabase: any, ctx: BotContext, body: any, type: "reseller" | "manager") {
  const userId = requireUuid(body.user_id);
  const table = type === "reseller" ? "resellers" : "manager_permissions";
  const { data: row } = await supabase.from(table).select("user_id").eq("user_id", userId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!row) throw new Error("FORBIDDEN");
  await supabase.from(table).delete().eq("user_id", userId).eq("tenant_id", ctx.tenantId);
  await supabase.from("user_roles").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("user_id", userId);
  await supabase.auth.admin.deleteUser(userId).catch(() => {});
  await logAction(supabase, ctx, `Bot deleted ${type}`, { target_user_id: userId });
  return { success: true, deleted_user_id: userId, type };
}

async function assertApp(supabase: any, ctx: BotContext, appId: string) {
  const { data } = await supabase.from("applications").select("id").eq("id", appId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!data) throw new Error("FORBIDDEN");
  return data;
}

async function assertLicense(supabase: any, ctx: BotContext, key: string) {
  const licenseKey = String(key || "").trim().toUpperCase();
  if (!LICENSE_KEY_PATTERN.test(licenseKey)) throw new Error("INVALID_JSON");
  const { data } = await supabase
    .from("licenses")
    .select("id, license_key, hwid, application_id")
    .eq("license_key", licenseKey)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!data) throw new Error("FORBIDDEN");
  return data;
}

async function logAction(supabase: any, ctx: BotContext, action: string, metadata: Record<string, unknown>) {
  await supabase.from("activity_logs").insert({
    user_id: ctx.userId,
    tenant_id: ctx.tenantId,
    action,
    license_key: metadata.license_key || null,
    application_id: metadata.application_id || null,
    application_name: metadata.application_name || null,
    metadata,
  } as any).then(() => {}, () => {});
  await sendDiscordLog(supabase, ctx, action, metadata);
}

async function sendDiscordLog(supabase: any, ctx: BotContext, action: string, metadata: Record<string, unknown>) {
  const category = categoryForAction(action);
  const [{ data: ownerHook }, { data: admins }] = await Promise.all([
    supabase.from("settings").select("value").eq("user_id", ctx.userId).eq("key", "discord_webhook_url").maybeSingle(),
    supabase.from("user_roles").select("user_id").eq("role", "admin"),
  ]);
  const adminIds = (admins || []).map((row: any) => row.user_id);
  const adminUrls = adminIds.length
    ? (await supabase
        .from("settings")
        .select("value")
        .in("user_id", adminIds)
        .in("key", ["discord_webhook_url", `admin_webhook_${category}`, "admin_webhook_activity"])
        .limit(10)).data?.map((row: any) => row.value).filter(Boolean) || []
    : [];
  const envUrl = Deno.env.get("DISCORD_WEBHOOK_URL") || "";
  const targets = Array.from(new Set([ownerHook?.value, ...adminUrls, envUrl].filter(Boolean)));
  if (!targets.length) return;

  const fields = Object.entries(metadata)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => ({ name: `\`${key}\``, value: String(value).slice(0, 1024), inline: true }));
  const embed = {
    title: `Bot API - ${action}`,
    color: 0x5c72ff,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: "GX Auth Bot API" },
  };
  await Promise.all(targets.map((url) => postWebhook(url, embed)));
}

async function postWebhook(url: string, embed: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {
    // best effort
  }
}

function categoryForAction(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("application") || lower.includes("app")) return "apps";
  if (lower.includes("license") || lower.includes("hwid") || lower.includes("key")) return "licenses";
  if (lower.includes("reseller") || lower.includes("manager")) return "team";
  return "activity";
}

function requireUuid(value: unknown) {
  const id = String(value || "").trim();
  if (!UUID_PATTERN.test(id)) throw new Error("INVALID_JSON");
  return id;
}

function generateLicenseKey() {
  const segment = () => Array.from({ length: 5 }, () => CHARSET[crypto.getRandomValues(new Uint32Array(1))[0] % CHARSET.length]).join("");
  return `GALACTIC-${segment()}-${segment()}-${segment()}-${segment()}`;
}

function cleanText(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function cleanEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

async function readJsonBody(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
    return parsed;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
