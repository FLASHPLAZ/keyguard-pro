import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const merchantApiKey = Deno.env.get("OXAPAY_MERCHANT_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!merchantApiKey || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Payment gateway is not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Please sign in before checkout" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authUser, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authUser.user) return json({ error: "Unauthorized" }, 401);

    const origin = req.headers.get("origin") || "https://www.gxauth.xyz";
    const orderId = `gxauth_lifetime_${authUser.user.id}_${Date.now()}`;
    const response = await fetch("https://api.oxapay.com/v1/payment/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "merchant_api_key": merchantApiKey,
      },
      body: JSON.stringify({
        amount: 49,
        currency: "USD",
        lifetime: 60,
        order_id: orderId,
        email: authUser.user.email,
        description: "GX Auth Lifetime Access",
        thanks_message: "Thanks for upgrading to GX Auth Lifetime.",
        return_url: `${origin}/dashboard/billing`,
        callback_url: `${supabaseUrl}/functions/v1/oxapay-webhook`,
      }),
    });

    const invoice = await response.json();
    if (!response.ok || invoice.error) {
      return json({ error: invoice.error || invoice.message || "Could not create checkout" }, 400);
    }

    await adminClient.from("activity_logs").insert({
      user_id: authUser.user.id,
      action: "OxaPay checkout created",
      metadata: { order_id: orderId, invoice },
    } as any);

    return json({
      payment_url: invoice.payment_url || invoice.payLink || invoice.data?.payment_url,
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
