import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PlanLimits {
  plan: string;
  usage: { apps: number; keys: number; resellers: number };
  limits: { apps: number | "unlimited"; keys: number | "unlimited"; resellers: number | "unlimited" };
}

export function usePlanLimits() {
  const { session } = useAuth();
  const [data, setData] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("check-plan-limits", {
        body: {},
      });
      if (!error && result) setData(result as PlanLimits);
    } catch {
      // silent
    }
    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => { refresh(); }, [refresh]);

  const canCreate = (resource: "apps" | "keys" | "resellers") => {
    if (!data) return true; // allow while loading
    const limit = data.limits[resource];
    if (limit === "unlimited") return true;
    return data.usage[resource] < limit;
  };

  const getLimit = (resource: "apps" | "keys" | "resellers") => {
    if (!data) return "—";
    const l = data.limits[resource];
    return l === "unlimited" ? "∞" : l;
  };

  const getUsage = (resource: "apps" | "keys" | "resellers") => {
    return data?.usage[resource] ?? 0;
  };

  const planName = data?.plan ?? "free";

  return { data, loading, refresh, canCreate, getLimit, getUsage, planName };
}