import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BODY_BYTES = 32_768;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !ipnSecret) {
      return json({ error: "Server not configured" }, 500);
    }

    const payload = await readJsonBody(req);
    const providedSignature = req.headers.get("x-nowpayments-sig") || "";
    const expectedSignature = await createSignature(payload, ipnSecret);
    if (!providedSignature || !timingSafeEqual(providedSignature.toLowerCase(), expectedSignature)) {
      return json({ error: "Invalid NOWPayments signature" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const status = String(payload.payment_status || payload.status || "").toLowerCase();
    const isPaid = ["finished", "confirmed"].includes(status);
    const orderId = String(payload.order_id || "");
    if (!orderId) return json({ ok: true, ignored: true, status });

    const match = orderId.match(/^gxauth_(monthly|lifetime)_([^_]+)_/);
    const plan = match?.[1] || "lifetime";
    const userId = match?.[2];
    if (!userId) return json({ error: "Invalid order id" }, 400);

    await adminClient
      .from("payment_transactions")
      .update({
        status: status || "unknown",
        invoice_id: String(payload.invoice_id || payload.id || ""),
        payment_id: String(payload.payment_id || ""),
        pay_currency: String(payload.pay_currency || payload.pay_currency_from || "ltc").toLowerCase(),
        pay_address: payload.pay_address ? String(payload.pay_address) : undefined,
        pay_amount: Number(payload.pay_amount || 0) || null,
        actually_paid: Number(payload.actually_paid || payload.outcome_amount || 0) || null,
        raw_payload: payload,
      } as any)
      .eq("order_id", orderId);

    if (!isPaid) return json({ ok: true, tracked: true, status });

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const patch = {
      plan,
      billing_cycle: plan === "monthly" ? "monthly" : "lifetime",
      plan_started_at: new Date().toISOString(),
      plan_expires_at: plan === "monthly" ? expiry.toISOString() : null,
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
        name: `${plan === "monthly" ? "Monthly" : "Lifetime"} Workspace`,
      } as any);
    }

    await adminClient.from("activity_logs").insert({
      user_id: userId,
      action: `${plan === "monthly" ? "Monthly" : "Lifetime"} activated by NOWPayments`,
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
    console.error("NOWPayments webhook error:", error);
    const status = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE"
      ? 413
      : error instanceof Error && error.message === "INVALID_JSON"
        ? 400
        : 500;
    const message = status === 413 ? "Request body too large" : status === 400 ? "Invalid JSON body" : "Unexpected webhook error";
    return json({ error: message }, status);
  }
});

async function readJsonBody(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
    return parsed;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

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
