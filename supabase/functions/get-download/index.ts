import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body.email || "").trim().toLowerCase();
    const license_key = String(body.license_key || "").trim().toUpperCase();
    if (!email || !license_key) return json({ error: "Email and license key are required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lic } = await supabase
      .from("licenses")
      .select("id, license_key, owner_email, banned, banned_by_admin, expires_at, application_id, tenant_id")
      .eq("license_key", license_key)
      .maybeSingle();

    if (!lic) return json({ error: "Invalid license key" }, 404);
    if (lic.owner_email && lic.owner_email.toLowerCase() !== email) {
      return json({ error: "Email does not match this license. Use the buyer email saved on this license, or ask the seller to update it." }, 403);
    }
    if (lic.banned || lic.banned_by_admin) return json({ error: "License is banned" }, 403);
    if (lic.expires_at && new Date(lic.expires_at) < new Date()) return json({ error: "License expired" }, 403);

    const { data: app } = await supabase
      .from("applications")
      .select("id, name, download_url, suspended, kill_switch")
      .eq("id", lic.application_id)
      .maybeSingle();
    if (!app) return json({ error: "Application not found" }, 404);
    if (app.suspended || app.kill_switch) return json({ error: "Application is unavailable" }, 403);

    // Paid sellers can use the download portal.
    if (lic.tenant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("plan, suspended")
        .eq("id", lic.tenant_id)
        .maybeSingle();
      if (!tenant || tenant.suspended) return json({ error: "Seller account unavailable" }, 403);
      if (!["monthly", "lifetime", "platform"].includes(tenant.plan)) {
        return json({ error: "Download portal is not enabled by the seller (premium plan required)" }, 403);
      }
    }

    if (!app.download_url) return json({ error: "No download available for this product yet. Please contact the seller." }, 404);

    await supabase.from("licenses").update({
      owner_email: lic.owner_email || email,
      download_verified_at: new Date().toISOString(),
      download_verified_email: email,
    } as any).eq("id", lic.id);

    // Log access (best-effort)
    await supabase.from("activity_logs").insert({
      action: "Download link accessed",
      license_key: lic.license_key,
      application_id: app.id,
      application_name: app.name,
      metadata: { verified_email: email },
    } as any).then(() => {}, () => {});

    return json({
      success: true,
      application: app.name,
      download_url: app.download_url,
    });
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
