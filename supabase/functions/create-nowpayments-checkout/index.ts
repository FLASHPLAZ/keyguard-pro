import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const payCurrency = String(body.payCurrency || "ltc").toLowerCase();
    const origin = req.headers.get("origin") || "https://www.gxauth.xyz";
    const orderId = `gxauth_lifetime_${authUser.user.id}_${Date.now()}`;

    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: 49,
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: "GX Auth Lifetime Access",
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

    await adminClient.from("activity_logs").insert({
      user_id: authUser.user.id,
      action: "NOWPayments invoice created",
      metadata: { order_id: orderId, invoice_id: invoice.id, pay_currency: payCurrency },
    } as any);

    return json({
      payment_url: invoice.invoice_url,
      invoice_id: invoice.id,
      order_id: orderId,
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
