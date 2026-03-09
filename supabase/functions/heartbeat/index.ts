import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX = 60;       // 60 requests per window
const RATE_LIMIT_WINDOW_MIN = 5; // 5 minute window

async function checkRateLimit(supabase: any, ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("rate_limits")
    .select("id, attempt_count")
    .eq("ip", ip)
    .eq("endpoint", "heartbeat")
    .gte("window_start", windowStart)
    .single();

  if (data) {
    if (data.attempt_count >= RATE_LIMIT_MAX) return true;
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
    const { license_key } = await req.json();

    if (!license_key || typeof license_key !== "string" || license_key.length > 50) {
      return new Response(JSON.stringify({ active: false, reason: "Invalid license_key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit check
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const isRateLimited = await checkRateLimit(supabase, clientIp);
    if (isRateLimited) {
      return new Response(JSON.stringify({ active: false, reason: "Too many requests" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(RATE_LIMIT_WINDOW_MIN * 60) },
      });
    }

    const { data: license, error } = await supabase
      .from("licenses")
      .select("id, banned, status, expires_at, application_id, applications(suspended, kill_switch)")
      .eq("license_key", license_key)
      .single();

    if (error || !license) {
      return new Response(JSON.stringify({ active: false, reason: "License not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const app = (license as any).applications;

    if (license.banned) {
      return new Response(JSON.stringify({ active: false, reason: "License is banned" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app?.suspended || app?.kill_switch) {
      return new Response(JSON.stringify({ active: false, reason: "Application is disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(license.expires_at) < new Date()) {
      return new Response(JSON.stringify({ active: false, reason: "License expired" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ active: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch {
    return new Response(JSON.stringify({ active: false, reason: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
