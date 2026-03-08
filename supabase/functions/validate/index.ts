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

    // Find license
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*, applications(name, suspended, kill_switch)")
      .eq("license_key", license_key)
      .single();

    if (error || !license) {
      return new Response(JSON.stringify({ valid: false, error: "License not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if banned
    if (license.banned) {
      return new Response(JSON.stringify({ valid: false, error: "License is banned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check app status
    const app = license.applications;
    if (app?.suspended || app?.kill_switch) {
      return new Response(JSON.stringify({ valid: false, error: "Application is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(license.expires_at) < new Date()) {
      await supabase.from("licenses").update({ status: "expired" }).eq("id", license.id);
      return new Response(JSON.stringify({ valid: false, error: "License expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HWID binding
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    if (license.hwid && hwid && license.hwid !== hwid) {
      // Log failed attempt
      await supabase.from("activity_logs").insert({
        license_key,
        application_id: license.application_id,
        application_name: app?.name,
        action: "HWID mismatch - rejected",
        ip: clientIp,
        hwid: hwid,
        user_id: license.user_id,
      });
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

    // Log validation
    await supabase.from("activity_logs").insert({
      license_key,
      application_id: license.application_id,
      application_name: app?.name,
      action: !license.hwid && hwid ? "HWID bound + validated" : "License validated",
      ip: clientIp,
      hwid: hwid || license.hwid,
      user_id: license.user_id,
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
