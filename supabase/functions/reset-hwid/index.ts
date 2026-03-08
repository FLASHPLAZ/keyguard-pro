import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { license_key } = await req.json();

    if (!license_key || typeof license_key !== "string" || license_key.length > 50) {
      return new Response(JSON.stringify({ success: false, error: "Invalid license_key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate: require admin Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ success: false, error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find and reset HWID
    const { data: license, error: findError } = await supabase
      .from("licenses")
      .select("id, hwid, license_key, application_id, applications(name)")
      .eq("license_key", license_key)
      .single();

    if (findError || !license) {
      return new Response(JSON.stringify({ success: false, error: "License not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!license.hwid) {
      return new Response(JSON.stringify({ success: false, error: "No HWID bound to this license" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const previousHwid = license.hwid;
    await supabase.from("licenses").update({ hwid: null }).eq("id", license.id);

    // Log the action
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "HWID reset via API",
      license_key,
      application_id: license.application_id,
      application_name: (license as any).applications?.name,
    });

    // Discord notification
    const { data: settingsData } = await supabase.from("settings").select("key, value");
    let webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL") || "";
    if (settingsData) {
      const found = settingsData.find((s: any) => s.key === "discord_webhook_url" && s.value);
      if (found) webhookUrl = found.value;
    }

    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "🔄 HWID Reset via API",
              color: 0xffaa00,
              fields: [
                { name: "License Key", value: license_key, inline: true },
                { name: "Previous HWID", value: previousHwid, inline: true },
                { name: "App", value: (license as any).applications?.name || "Unknown", inline: true },
              ],
              timestamp: new Date().toISOString(),
              footer: { text: "Galactic Boosts License System" },
            }],
          }),
        });
      } catch { /* silent */ }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "HWID reset successfully",
      license_key,
      previous_hwid: previousHwid,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
