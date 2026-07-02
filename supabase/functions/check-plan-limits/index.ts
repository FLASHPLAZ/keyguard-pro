import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, { apps: number; keys: number; resellers: number; managers: number }> = {
  // Free — very limited
  free: { apps: 1, keys: 25, resellers: 0, managers: 0 },
  // Lifetime — unlimited everything (one-time purchase)
  lifetime: { apps: -1, keys: -1, resellers: -1, managers: -1 },
  // Platform (internal/admin)
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

    let effectivePlan = tenant.plan;
    // Only paid plans with an explicit expiry can expire. Lifetime never expires.
    const expired = !!(tenant.plan_expires_at && new Date(tenant.plan_expires_at) < new Date());
    if (expired && !["free", "lifetime", "platform"].includes(tenant.plan)) {
      effectivePlan = "free";
    }
    // Migrate any legacy plan names to the new two-tier model
    if (!(effectivePlan in PLAN_LIMITS)) {
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