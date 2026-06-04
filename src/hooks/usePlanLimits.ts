import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PlanLimits {
  plan: string;
  original_plan?: string;
  expired?: boolean;
  plan_started_at?: string | null;
  plan_expires_at?: string | null;
  billing_cycle?: string;
  suspended?: boolean;
  usage: { apps: number; keys: number; resellers: number; managers: number };
  limits: {
    apps: number | "unlimited";
    keys: number | "unlimited";
    resellers: number | "unlimited";
    managers: number | "unlimited";
  };
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

  const canCreate = (resource: "apps" | "keys" | "resellers" | "managers") => {
    if (!data) return true; // allow while loading
    const limit = data.limits[resource];
    if (limit === "unlimited") return true;
    return data.usage[resource] < limit;
  };

  const getLimit = (resource: "apps" | "keys" | "resellers" | "managers") => {
    if (!data) return "—";
    const l = data.limits[resource];
    return l === "unlimited" ? "∞" : l;
  };

  const getUsage = (resource: "apps" | "keys" | "resellers" | "managers") => {
    return data?.usage[resource] ?? 0;
  };

  const planName = data?.plan ?? "free";

  const daysRemaining = (() => {
    if (!data?.plan_expires_at) return null;
    const diff = new Date(data.plan_expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return { data, loading, refresh, canCreate, getLimit, getUsage, planName, daysRemaining };
}