import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { amount: number; label: string }> = {
  monthly: { amount: 3.99, label: "Monthly Access" },
  lifetime: { amount: 24.99, label: "Lifetime Access" },
};

const PAY_CURRENCIES = new Set(["ltc", "btc", "eth", "usdttrc20", "usdterc20", "trx", "doge", "sol"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "NOWPayments is not configured yet" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Please sign in before checkout" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authUser, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authUser.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || "lifetime").toLowerCase();
    if (!PLANS[plan]) return json({ error: "Invalid plan selected" }, 400);
    const amount = PLANS[plan].amount;
    const planLabel = PLANS[plan].label;
    const payCurrency = String(body.payCurrency || "ltc").toLowerCase();
    if (!PAY_CURRENCIES.has(payCurrency)) return json({ error: "Unsupported payment currency" }, 400);
    const origin = req.headers.get("origin") || "https://www.gxauth.xyz";
    const orderId = `gxauth_${plan === "monthly" ? "monthly" : "lifetime"}_${authUser.user.id}_${Date.now()}`;
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("owner_user_id", authUser.user.id)
      .maybeSingle();

    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: `GX Auth ${planLabel}`,
        ipn_callback_url: `${supabaseUrl}/functions/v1/nowpayments-webhook`,
        success_url: `${origin}/dashboard/billing?payment=success`,
        cancel_url: `${origin}/pricing?payment=cancelled`,
        is_fixed_rate: true,
      }),
    });

    const invoice = await response.json();
    if (!response.ok || invoice.error) {
      return json({ error: invoice.error || invoice.message || "Could not create NOWPayments invoice" }, 400);
    }

    const { error: transactionError } = await adminClient.from("payment_transactions").insert({
      user_id: authUser.user.id,
      tenant_id: tenant?.id || null,
      plan,
      status: "created",
      order_id: orderId,
      invoice_id: String(invoice.id || ""),
      payment_url: invoice.invoice_url,
      price_amount: amount,
      price_currency: "usd",
      pay_currency: payCurrency,
      raw_payload: invoice,
    } as any);
    if (transactionError) {
      return json({ error: `Payment tracking is not ready: ${transactionError.message}` }, 500);
    }

    await adminClient.from("activity_logs").insert({
      user_id: authUser.user.id,
      action: "NOWPayments invoice created",
      metadata: { order_id: orderId, invoice_id: invoice.id, pay_currency: payCurrency },
    } as any);

    return json({
      payment_url: invoice.invoice_url,
      invoice_id: invoice.id,
      order_id: orderId,
      plan,
      amount,
      pay_currency: payCurrency,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
