import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server not configured" }, 500);

    const payload = await req.json();
    const status = String(payload.status || payload.payment_status || payload.result || "").toLowerCase();
    const orderId = String(payload.order_id || payload.orderId || "");
    const isPaid = ["paid", "completed", "confirmed", "success", "100"].some((value) => status.includes(value));
    if (!orderId || !isPaid) return json({ ok: true, ignored: true });

    const match = orderId.match(/^gxauth_lifetime_([^_]+)_/);
    const userId = match?.[1];
    if (!userId) return json({ error: "Invalid order id" }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const patch = {
      plan: "lifetime",
      billing_cycle: "lifetime",
      plan_started_at: new Date().toISOString(),
      plan_expires_at: null,
      suspended: false,
    };

    const { data: existingTenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (existingTenant?.id) {
      await adminClient.from("tenants").update(patch).eq("id", existingTenant.id);
    } else {
      await adminClient.from("tenants").insert({
        ...patch,
        owner_user_id: userId,
        name: "Lifetime Workspace",
      } as any);
    }

    await adminClient.from("activity_logs").insert({
      user_id: userId,
      action: "Lifetime activated by OxaPay",
      metadata: { order_id: orderId, oxapay: payload },
    } as any);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
