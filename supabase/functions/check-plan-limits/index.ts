import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, { apps: number; keys: number; resellers: number; managers: number }> = {
  // Free (a.k.a. Tester) — 1 app, 10 users, no resellers/managers
  free: { apps: 1, keys: 10, resellers: 0, managers: 0 },
  // Developer — 8 apps, 10,000 users, 5 resellers, 2 managers
  developer: { apps: 8, keys: 10000, resellers: 5, managers: 2 },
  // Seller — unlimited everything
  seller: { apps: -1, keys: -1, resellers: -1, managers: -1 },
  // Platform (internal/staff)
  platform: { apps: -1, keys: -1, resellers: -1, managers: -1 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, plan, plan_started_at, plan_expires_at, billing_cycle, suspended")
      .eq("owner_user_id", user.id)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If subscription expired, treat as free
    let effectivePlan = tenant.plan;
    const expired = tenant.plan_expires_at && new Date(tenant.plan_expires_at) < new Date();
    if (expired && tenant.plan !== "free" && tenant.plan !== "platform") {
      effectivePlan = "free";
    }
    const limits = PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.free;

    // Count current usage
    const [appsRes, keysRes, resellersRes, managersRes] = await Promise.all([
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("licenses").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("resellers").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("manager_permissions").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    ]);

    const usage = {
      apps: appsRes.count ?? 0,
      keys: keysRes.count ?? 0,
      resellers: resellersRes.count ?? 0,
      managers: managersRes.count ?? 0,
    };

    const body = await req.json().catch(() => ({}));
    const resource = body.resource as string | undefined; // "apps" | "keys" | "resellers"

    // If a specific resource is requested, check if limit is reached
    if (resource && limits[resource as keyof typeof limits] !== undefined) {
      const limit = limits[resource as keyof typeof limits];
      const current = usage[resource as keyof typeof usage];
      const allowed = limit === -1 || current < limit;
      return new Response(JSON.stringify({
        allowed,
        current,
        limit: limit === -1 ? "unlimited" : limit,
        plan: effectivePlan,
        original_plan: tenant.plan,
        expired,
        plan_expires_at: tenant.plan_expires_at,
        billing_cycle: tenant.billing_cycle,
        suspended: tenant.suspended,
        usage,
        limits: {
          apps: limits.apps === -1 ? "unlimited" : limits.apps,
          keys: limits.keys === -1 ? "unlimited" : limits.keys,
          resellers: limits.resellers === -1 ? "unlimited" : limits.resellers,
          managers: limits.managers === -1 ? "unlimited" : limits.managers,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return full usage + limits
    return new Response(JSON.stringify({
      plan: effectivePlan,
      original_plan: tenant.plan,
      expired,
      plan_started_at: tenant.plan_started_at,
      plan_expires_at: tenant.plan_expires_at,
      billing_cycle: tenant.billing_cycle,
      suspended: tenant.suspended,
      usage,
      limits: {
        apps: limits.apps === -1 ? "unlimited" : limits.apps,
        keys: limits.keys === -1 ? "unlimited" : limits.keys,
        resellers: limits.resellers === -1 ? "unlimited" : limits.resellers,
        managers: limits.managers === -1 ? "unlimited" : limits.managers,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});