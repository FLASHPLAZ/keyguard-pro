import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get Discord webhook URL from settings or env
    let webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL") || "";
    const { data: settingsData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "discord_webhook_url")
      .maybeSingle();
    if (settingsData?.value) webhookUrl = settingsData.value;

    if (!webhookUrl) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
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

    // Get username from profile for footer
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, role")
      .eq("user_id", user.id)
      .maybeSingle();

    const actorName = profile?.username || user.email || "Unknown";
    const actorRole = profile?.role || "user";

    const embed = {
      title: `🛠️ ${action}`,
      color: colorMap[action] || 0x808080,
      fields: Object.entries(details || {})
        .filter(([_, v]) => v != null && v !== "")
        .map(([k, v]) => ({ name: k, value: String(v), inline: true })),
      timestamp: new Date().toISOString(),
      footer: { text: `${actorName} (${actorRole}) • Galactic Boosts` },
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

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
