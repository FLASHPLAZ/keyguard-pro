import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fire-and-forget POST to Discord webhook — never blocks or throws.
async function postWebhook(url: string, embed: Record<string, unknown>) {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {
    /* ignore — best-effort */
  }
}

// Resolve the acting user's tenant owner (the "seller" who owns the workspace).
// Returns null if the acting user is not a manager/reseller (they are already the owner).
async function findTenantOwner(supabase: any, userId: string): Promise<string | null> {
  const { data: r } = await supabase
    .from("resellers")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  const tenantId = r?.tenant_id ?? (
    await supabase.from("manager_permissions").select("tenant_id").eq("user_id", userId).maybeSingle()
  ).data?.tenant_id;
  if (!tenantId) return null;
  const { data: t } = await supabase
    .from("tenants")
    .select("owner_user_id")
    .eq("id", tenantId)
    .maybeSingle();
  return t?.owner_user_id ?? null;
}

async function getUserWebhook(supabase: any, userId: string | null): Promise<string> {
  if (!userId) return "";
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "discord_webhook_url")
    .maybeSingle();
  return (data?.value as string | undefined) || "";
}

async function getAdminWebhook(supabase: any): Promise<string> {
  // Prefer env fallback (admin/global) and any settings row owned by an admin.
  const envUrl = Deno.env.get("DISCORD_WEBHOOK_URL") || "";
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const ids = (admins || []).map((r: any) => r.user_id);
  if (ids.length) {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "discord_webhook_url")
      .in("user_id", ids)
      .limit(1)
      .maybeSingle();
    if (data?.value) return data.value as string;
  }
  return envUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, details } = await req.json();
    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Color map for admin/manager/reseller actions
    const colorMap: Record<string, number> = {
      // License actions
      "License keys generated": 0x00cc88,
      "License banned": 0xff0000,
      "License unbanned": 0x00ff00,
      "HWID reset": 0xffaa00,
      "License extended": 0x00aaff,
      "License deleted": 0xff4444,
      // Application actions
      "Application created": 0x00cc88,
      "Application suspended": 0xff6600,
      "Application resumed": 0x00ff00,
      "Kill switch enabled": 0xff0000,
      "Kill switch disabled": 0x00ff00,
      "Application deleted": 0xff4444,
      "Request signing enabled": 0x00aaff,
      "Request signing disabled": 0xffaa00,
      "Signing secret regenerated": 0xffaa00,
      // Settings actions
      "Admin banned license": 0xff0000,
      "Admin unbanned license": 0x00ff00,
      "IP/HWID blacklisted": 0xff0000,
      "Blacklist entry removed": 0xffaa00,
      "Settings updated": 0x00aaff,
      // Manager actions
      "Manager created": 0x00cc88,
      "Manager removed": 0xff4444,
      "Manager permissions updated": 0x00aaff,
      // Reseller actions
      "Reseller created": 0x00cc88,
      "Reseller updated": 0x00aaff,
      "Reseller deleted": 0xff4444,
      "Reseller generated keys": 0x00cc88,
      "Reseller banned license": 0xff0000,
      "Reseller unbanned license": 0x00ff00,
      "Reseller HWID reset": 0xffaa00,
      "Reseller deleted license": 0xff4444,
      "Reseller bulk ban": 0xff0000,
      "Reseller bulk delete": 0xff4444,
      // Manager license actions
      "Manager created licenses": 0x00cc88,
      "Manager banned license": 0xff0000,
      "Manager unbanned license": 0x00ff00,
      "Manager reset HWID": 0xffaa00,
    };

    // Get actor profile for footer
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, role")
      .eq("user_id", user.id)
      .maybeSingle();

    const actorName = profile?.username || user.email || "Unknown";
    const actorRole = profile?.role || "user";

    // Pick a category emoji based on action prefix for prettier embeds.
    const lower = action.toLowerCase();
    let icon = "🛠️";
    if (lower.includes("license") || lower.includes("hwid") || lower.includes("key")) icon = "🔑";
    else if (lower.includes("application") || lower.includes("kill switch") || lower.includes("signing")) icon = "📦";
    else if (lower.includes("manager")) icon = "👤";
    else if (lower.includes("reseller")) icon = "💼";
    else if (lower.includes("blacklist") || lower.includes("banned")) icon = "🚫";
    else if (lower.includes("settings")) icon = "⚙️";

    const color = colorMap[action] || 0x8b5cf6; // violet fallback

    const fields = Object.entries(details || {})
      .filter(([_, v]) => v != null && v !== "")
      .map(([k, v]) => ({ name: `\`${k}\``, value: String(v).slice(0, 1024), inline: true }));

    // Always include actor identity in the embed body so multi-tenant admins can trace.
    fields.unshift(
      { name: "`Actor`", value: `${actorName}`, inline: true },
      { name: "`Role`", value: actorRole, inline: true },
      { name: "`Email`", value: user.email || "—", inline: true },
    );

    const embed = {
      title: `${icon}  ${action}`,
      color,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: `GX Auth • Activity Log` },
    };

    // Fan out to: acting user's own webhook, their tenant owner's webhook (if
    // they are a manager/reseller), and the global admin webhook. Dedupe.
    const [userHook, adminHook, ownerId] = await Promise.all([
      getUserWebhook(supabase, user.id),
      getAdminWebhook(supabase),
      findTenantOwner(supabase, user.id),
    ]);
    const ownerHook = ownerId && ownerId !== user.id ? await getUserWebhook(supabase, ownerId) : "";
    const targets = Array.from(new Set([userHook, ownerHook, adminHook].filter(Boolean)));

    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await Promise.all(targets.map((url) => postWebhook(url, embed)));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
