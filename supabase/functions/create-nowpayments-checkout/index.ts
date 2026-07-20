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
    const orderId = `gxauth_${plan === "monthly" ? "monthly" : "lifetime"}_${authUser.user.id}_${Date.now()}`;
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("owner_user_id", authUser.user.id)
      .maybeSingle();

    const response = await fetch("https://api.nowpayments.io/v1/payment", {
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
        is_fixed_rate: true,
      }),
    });

    const payment = await response.json();
    if (!response.ok || payment.error) {
      return json({ error: payment.error || payment.message || "Could not create NOWPayments payment" }, 400);
    }
    if (!payment.pay_address || !payment.pay_amount) {
      return json({ error: "NOWPayments did not return a Litecoin address. Check your NOWPayments currencies/settings." }, 400);
    }

    const { error: transactionError } = await adminClient.from("payment_transactions").insert({
      user_id: authUser.user.id,
      tenant_id: tenant?.id || null,
      plan,
      status: String(payment.payment_status || "waiting").toLowerCase(),
      order_id: orderId,
      payment_id: String(payment.payment_id || ""),
      payment_url: null,
      pay_address: String(payment.pay_address || ""),
      pay_amount: Number(payment.pay_amount || 0),
      price_amount: amount,
      price_currency: "usd",
      pay_currency: payCurrency,
      raw_payload: payment,
    } as any);
    if (transactionError) {
      return json({ error: `Payment tracking is not ready: ${transactionError.message}` }, 500);
    }

    await adminClient.from("activity_logs").insert({
      user_id: authUser.user.id,
      action: "NOWPayments payment created",
      metadata: { order_id: orderId, payment_id: payment.payment_id, pay_currency: payCurrency },
    } as any);

    return json({
      payment_id: payment.payment_id,
      order_id: orderId,
      plan,
      amount,
      pay_currency: payCurrency,
      pay_address: payment.pay_address,
      pay_amount: payment.pay_amount,
      payment_status: payment.payment_status || "waiting",
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
