import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") || "android").toLowerCase() === "ios" ? "ios" : "android";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server not configured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const pathKey = platform === "ios" ? "app_build_ios_path" : "app_build_android_path";
  const linkKey = platform === "ios" ? "app_download_ios" : "app_download_android";

  const { data } = await admin.from("settings").select("key, value").in("key", [pathKey, linkKey]);
  const rows = data || [];
  const pick = (key: string) =>
    (rows.find((row: any) => row.key === key && String(row.value || "").trim())?.value as string) || "";

  const storagePath = pick(pathKey);
  if (storagePath) {
    const filename = storagePath.split("/").pop() || `gxauth-${platform}`;
    const { data: signed, error } = await admin.storage
      .from("app-builds")
      .createSignedUrl(storagePath, 300, { download: filename });
    if (error || !signed?.signedUrl) {
      return json({ error: "Build file is unavailable right now" }, 404);
    }
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: signed.signedUrl } });
  }

  const fallback = pick(linkKey);
  if (fallback) {
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: fallback } });
  }

  return json({ error: `The ${platform === "ios" ? "iOS" : "Android"} build is not published yet` }, 404);
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
