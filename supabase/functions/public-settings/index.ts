import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ maintenance_mode: false });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await adminClient
    .from("settings")
    .select("key, value")
    .in("key", ["maintenance_mode", "maintenance_message"]);

  const map = new Map((data || []).map((row: any) => [row.key, row.value]));
  return json({
    maintenance_mode: map.get("maintenance_mode") === "true",
    maintenance_message: map.get("maintenance_message") || "GX Auth is currently under maintenance. Please check back soon.",
  });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
