import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server is missing Supabase service credentials" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authUser, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authUser.user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin access required" }, 403);

    const { userId } = await req.json().catch(() => ({}));
    if (!userId || userId === authUser.user.id) return json({ error: "Invalid target user" }, 400);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(userId))) {
      return json({ error: "Invalid target user" }, 400);
    }

    const { data: target, error: targetError } = await adminClient.auth.admin.getUserById(userId);
    if (targetError || !target?.user?.email) return json({ error: "Target user not found" }, 404);

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://www.gxauth.xyz"}/dashboard`,
      },
    });
    if (linkError) {
      console.error("Impersonation link error:", linkError);
      return json({ error: "Could not create impersonation link" }, 400);
    }

    await adminClient.from("activity_logs").insert({
      user_id: authUser.user.id,
      action: "Admin generated impersonation link",
      metadata: { target_user_id: userId, target_email: target.user.email },
    } as any);

    return json({ action_link: linkData.properties?.action_link });
  } catch (error) {
    console.error("Impersonate-user error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
