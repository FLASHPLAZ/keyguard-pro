import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LITOSHI_PER_LTC = 100_000_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const address = Deno.env.get("MANUAL_LTC_ADDRESS") || Deno.env.get("LTC_PAYMENT_ADDRESS");
    if (!supabaseUrl || !serviceRoleKey || !address) {
      return json({ error: "Litecoin tracker is not configured" }, 500);
    }

    const minConfirmations = Number(Deno.env.get("LTC_CONFIRMATIONS") || 2);
    const tolerance = Number(Deno.env.get("PAYMENT_TOLERANCE_LITOSHI") || 2);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const syncSecret = Deno.env.get("SYNC_LTC_SECRET");
    const providedSecret = req.headers.get("x-sync-secret") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const isTrustedCron = !!syncSecret && providedSecret === syncSecret;
    if (!isTrustedCron) {
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: authUser, error: authError } = await adminClient.auth.getUser(token);
      if (authError || !authUser.user) return json({ error: "Unauthorized" }, 401);
    }

    const { data: invoices, error } = await adminClient
      .from("payment_transactions")
      .select("id, user_id, tenant_id, plan, status, order_id, payment_id, pay_address, pay_amount, price_amount, created_at, expires_at, raw_payload")
      .eq("provider", "manual_ltc")
      .in("status", ["waiting_payment", "partially_detected", "waiting_confirmations", "waiting_admin_review"])
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) return json({ error: error.message }, 500);
    if (!invoices?.length) return json({ checked: 0, confirmed: 0, message: "No pending Litecoin invoices" });

    const chain = await fetchLitecoinAddress(address);
    const receivedOutputs = extractReceivedOutputs(chain, address);
    const usedTxHashes = new Set(
      (await adminClient
        .from("payment_transactions")
        .select("detected_tx_hash")
        .in("status", ["confirmed", "finished"])
        .not("detected_tx_hash", "is", null))
        .data
        ?.map((row: any) => row.detected_tx_hash)
        .filter(Boolean) || [],
    );

    let confirmed = 0;
    let detected = 0;
    let expired = 0;
    const now = new Date();

    for (const invoice of invoices as any[]) {
      const expected = Math.round(Number(invoice.pay_amount || 0) * LITOSHI_PER_LTC);
      if (!expected) continue;

      const expiresAt = invoice.expires_at ? new Date(invoice.expires_at) : null;
      if (expiresAt && expiresAt < now && !["waiting_confirmations", "partially_detected"].includes(String(invoice.status))) {
        await adminClient.from("payment_transactions").update({ status: "expired" }).eq("id", invoice.id);
        expired++;
        continue;
      }

      const createdAt = new Date(invoice.created_at);
      const match = receivedOutputs.find((output) => {
        if (usedTxHashes.has(output.hash)) return false;
        if (Math.abs(output.value - expected) > tolerance) return false;
        if (output.received && new Date(output.received).getTime() < createdAt.getTime() - 5 * 60 * 1000) return false;
        return true;
      });

      if (!match) continue;

      if (match.confirmations < minConfirmations) {
        await adminClient.from("payment_transactions").update({
          status: "waiting_confirmations",
          detected_tx_hash: match.hash,
          confirmations: match.confirmations,
          actually_paid: match.value / LITOSHI_PER_LTC,
          raw_payload: mergeRawPayload(invoice.raw_payload, { detected_tx_hash: match.hash, confirmations: match.confirmations }),
        } as any).eq("id", invoice.id);
        detected++;
        continue;
      }

      const tenantId = await resolveTenantId(adminClient, invoice);
      if (!tenantId) {
        await adminClient.from("payment_transactions").update({
          status: "detected_needs_admin",
          detected_tx_hash: match.hash,
          confirmations: match.confirmations,
          actually_paid: match.value / LITOSHI_PER_LTC,
        } as any).eq("id", invoice.id);
        detected++;
        continue;
      }

      const activation = activationPatch(invoice.plan);
      const [{ error: tenantError }, { error: paymentError }] = await Promise.all([
        adminClient.from("tenants").update(activation).eq("id", tenantId),
        adminClient.from("payment_transactions").update({
          status: "confirmed",
          detected_tx_hash: match.hash,
          confirmations: match.confirmations,
          actually_paid: match.value / LITOSHI_PER_LTC,
          confirmed_at: new Date().toISOString(),
          raw_payload: mergeRawPayload(invoice.raw_payload, {
            detected_tx_hash: match.hash,
            confirmations: match.confirmations,
            auto_confirmed: true,
            activation,
          }),
        } as any).eq("id", invoice.id),
      ]);

      if (tenantError || paymentError) {
        await adminClient.from("payment_transactions").update({
          status: "detected_needs_admin",
          detected_tx_hash: match.hash,
          confirmations: match.confirmations,
          actually_paid: match.value / LITOSHI_PER_LTC,
          raw_payload: mergeRawPayload(invoice.raw_payload, { activation_error: tenantError?.message || paymentError?.message }),
        } as any).eq("id", invoice.id);
        detected++;
        continue;
      }

      await adminClient.from("activity_logs").insert({
        user_id: invoice.user_id,
        action: "Litecoin payment auto-confirmed",
        metadata: {
          order_id: invoice.order_id,
          payment_id: invoice.payment_id,
          tx_hash: match.hash,
          confirmations: match.confirmations,
          amount_ltc: match.value / LITOSHI_PER_LTC,
          plan: invoice.plan,
        },
      } as any);
      usedTxHashes.add(match.hash);
      confirmed++;
    }

    return json({ checked: invoices.length, outputs: receivedOutputs.length, detected, confirmed, expired });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected tracker error" }, 500);
  }
});

async function fetchLitecoinAddress(address: string) {
  const token = Deno.env.get("BLOCKCYPHER_TOKEN");
  const url = new URL(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full`);
  url.searchParams.set("limit", Deno.env.get("LTC_SCAN_LIMIT") || "50");
  if (token) url.searchParams.set("token", token);
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Could not read Litecoin blockchain data");
  }
  return data;
}

function extractReceivedOutputs(chain: any, address: string) {
  const outputs: Array<{ hash: string; value: number; confirmations: number; received?: string }> = [];
  for (const tx of chain?.txs || []) {
    for (const output of tx.outputs || []) {
      if (!Array.isArray(output.addresses) || !output.addresses.includes(address)) continue;
      outputs.push({
        hash: String(tx.hash),
        value: Number(output.value || 0),
        confirmations: Number(tx.confirmations || 0),
        received: tx.received || tx.confirmed || undefined,
      });
    }
  }
  return outputs.sort((a, b) => Number(new Date(a.received || 0)) - Number(new Date(b.received || 0)));
}

async function resolveTenantId(adminClient: any, invoice: any) {
  if (invoice.tenant_id) return invoice.tenant_id;
  const { data } = await adminClient
    .from("tenants")
    .select("id")
    .eq("owner_user_id", invoice.user_id)
    .maybeSingle();
  return data?.id || null;
}

function activationPatch(plan: string) {
  const monthlyExpiry = new Date();
  monthlyExpiry.setDate(monthlyExpiry.getDate() + 30);
  return {
    plan,
    billing_cycle: plan,
    plan_started_at: new Date().toISOString(),
    plan_expires_at: plan === "monthly" ? monthlyExpiry.toISOString() : null,
    suspended: false,
  };
}

function mergeRawPayload(raw: unknown, patch: Record<string, unknown>) {
  const base = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return { ...base, ...patch };
}

function json(body: Record<string, unknown>, status = 200) {
  const responseStatus = body.error ? 200 : status;
  return new Response(JSON.stringify(body), {
    status: responseStatus,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
