import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !ipnSecret) {
      return json({ error: "Server not configured" }, 500);
    }

    const payload = await req.json();
    const providedSignature = req.headers.get("x-nowpayments-sig") || "";
    const expectedSignature = await createSignature(payload, ipnSecret);
    if (!providedSignature || !timingSafeEqual(providedSignature.toLowerCase(), expectedSignature)) {
      return json({ error: "Invalid NOWPayments signature" }, 401);
    }

    const status = String(payload.payment_status || payload.status || "").toLowerCase();
    const isPaid = ["finished", "confirmed"].includes(status);
    const orderId = String(payload.order_id || "");
    if (!orderId || !isPaid) return json({ ok: true, ignored: true, status });

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
      action: "Lifetime activated by NOWPayments",
      metadata: {
        order_id: orderId,
        invoice_id: payload.invoice_id,
        payment_id: payload.payment_id,
        payment_status: status,
        pay_currency: payload.pay_currency,
        actually_paid: payload.actually_paid,
      },
    } as any);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).sort().reduce((result, key) => {
      result[key] = sortObject((value as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>);
  }
  return value;
}

async function createSignature(payload: unknown, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.trim()),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const data = new TextEncoder().encode(JSON.stringify(sortObject(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
