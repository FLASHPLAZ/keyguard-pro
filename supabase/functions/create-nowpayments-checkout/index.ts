import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { amount: number; label: string }> = {
  monthly: { amount: 3.99, label: "Monthly Access" },
  lifetime: { amount: 24.99, label: "Lifetime Access" },
};

const LITOSHI_PER_LTC = 100_000_000;
const INVOICE_EXPIRY_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const manualLtcAddress = Deno.env.get("MANUAL_LTC_ADDRESS") || Deno.env.get("LTC_PAYMENT_ADDRESS");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!manualLtcAddress || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Litecoin payments are not configured yet" }, 500);
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
    const payCurrency = "ltc";
    const orderId = `gxauth_${plan === "monthly" ? "monthly" : "lifetime"}_${authUser.user.id}_${Date.now()}`;
    const paymentId = `manual_ltc_${crypto.randomUUID()}`;
    const ltcUsdRate = await getLtcUsdRate();
    const uniqueOffset = crypto.getRandomValues(new Uint32Array(1))[0] % 5000 + 1;
    const expectedLitoshi = Math.ceil((amount / ltcUsdRate) * LITOSHI_PER_LTC) + uniqueOffset;
    const payAmount = Number((expectedLitoshi / LITOSHI_PER_LTC).toFixed(8));
    const expiresAt = new Date(Date.now() + INVOICE_EXPIRY_MS).toISOString();
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("owner_user_id", authUser.user.id)
      .maybeSingle();

    const { error: transactionError } = await adminClient.from("payment_transactions").insert({
      user_id: authUser.user.id,
      tenant_id: tenant?.id || null,
      plan,
      provider: "manual_ltc",
      status: "waiting_payment",
      order_id: orderId,
      payment_id: paymentId,
      payment_url: null,
      pay_address: manualLtcAddress,
      pay_amount: payAmount,
      price_amount: amount,
      price_currency: "usd",
      pay_currency: payCurrency,
      ltc_usd_rate: ltcUsdRate,
      amount_offset_litoshi: uniqueOffset,
      expires_at: expiresAt,
      raw_payload: {
        gateway: "auto_ltc",
        expected_litoshi: expectedLitoshi,
        note: "Send the exact LTC amount. GX Auth scans the Litecoin blockchain and activates after confirmations.",
      },
    } as any);
    if (transactionError) {
      return json({ error: `Payment tracking is not ready: ${transactionError.message}` }, 500);
    }

    await adminClient.from("activity_logs").insert({
      user_id: authUser.user.id,
      action: "Manual Litecoin payment invoice created",
      metadata: { order_id: orderId, payment_id: paymentId, pay_currency: payCurrency, amount_usd: amount, pay_amount: payAmount },
    } as any);

    return json({
      payment_id: paymentId,
      order_id: orderId,
      plan,
      amount,
      pay_currency: payCurrency,
      pay_address: manualLtcAddress,
      pay_amount: payAmount,
      payment_status: "waiting_payment",
      expires_at: expiresAt,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

async function getLtcUsdRate() {
  const override = Number(Deno.env.get("LTC_USD_RATE_OVERRIDE") || "");
  if (Number.isFinite(override) && override > 0) return override;

  const headers: Record<string, string> = {};
  const demoKey = Deno.env.get("COINGECKO_DEMO_API_KEY");
  const proKey = Deno.env.get("COINGECKO_PRO_API_KEY");
  if (demoKey) headers["x-cg-demo-api-key"] = demoKey;
  if (proKey) headers["x-cg-pro-api-key"] = proKey;

  const baseUrl = proKey ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
  const response = await fetch(`${baseUrl}/simple/price?ids=litecoin&vs_currencies=usd`, { headers });
  const data = await response.json().catch(() => ({}));
  const rate = Number(data?.litecoin?.usd);
  if (!response.ok || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Could not fetch live Litecoin price. Try again in a minute.");
  }
  return rate;
}

function json(body: Record<string, unknown>, status = 200) {
  const responseStatus = body.error ? 200 : status;
  return new Response(JSON.stringify(body), {
    status: responseStatus,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
