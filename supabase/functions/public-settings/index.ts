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
    .in("key", [
      "maintenance_mode",
      "maintenance_message",
      "app_download_android",
      "app_download_ios",
      "app_version",
      "app_build_android_path",
      "app_build_ios_path",
      "app_build_android_name",
      "app_build_ios_name",
      "app_release_status",
      "app_release_message",
    ]);

  const rows = data || [];
  const map = new Map(rows.map((row: any) => [row.key, row.value]));
  const firstNonEmpty = (key: string) =>
    (rows.find((row: any) => row.key === key && String(row.value || "").trim())?.value as string) || "";

  return json({
    maintenance_mode: map.get("maintenance_mode") === "true",
    maintenance_message: map.get("maintenance_message") || "GX Auth is currently under maintenance. Please check back soon.",
    app_download_android: firstNonEmpty("app_download_android"),
    app_download_ios: firstNonEmpty("app_download_ios"),
    app_version: firstNonEmpty("app_version"),
    app_build_android_name: firstNonEmpty("app_build_android_name"),
    app_build_ios_name: firstNonEmpty("app_build_ios_name"),
    android_available: Boolean(firstNonEmpty("app_build_android_path") || firstNonEmpty("app_download_android")),
    ios_available: Boolean(firstNonEmpty("app_build_ios_path") || firstNonEmpty("app_download_ios")),
    app_release_status: firstNonEmpty("app_release_status") || "live",
    app_release_message: firstNonEmpty("app_release_message"),
  });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
