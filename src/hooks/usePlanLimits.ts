import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanLimits {
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

export type PlanFeature =
  | "resellers"
  | "managers"
  | "webhooks"
  | "bot"
  | "downloads"
  | "analytics"
  | "priority_support";

const PREMIUM_PLANS = ["lifetime", "monthly", "platform"];
const STORAGE_KEY = "gx_plan_limits_v1";

/* ---------- shared store (prevents per-mount flicker across pages) ---------- */
type StoreState = { data: PlanLimits | null; loading: boolean };

function readCache(): PlanLimits | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlanLimits) : null;
  } catch {
    return null;
  }
}

let state: StoreState = { data: readCache(), loading: !readCache() };
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;

function setState(next: Partial<StoreState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function fetchLimits(force = false) {
  if (inFlight && !force) return inFlight;
  inFlight = (async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        setState({ data: null, loading: false });
        return;
      }
      const { data: result, error } = await supabase.functions.invoke("check-plan-limits", { body: {} });
      if (!error && result) {
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result)); } catch { /* ignore */ }
        setState({ data: result as PlanLimits, loading: false });
      } else {
        // keep previously known plan data instead of flashing "free"
        setState({ loading: false });
      }
    } catch {
      setState({ loading: false });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function planIsPremium(plan?: string | null) {
  return PREMIUM_PLANS.includes((plan || "free").toLowerCase());
}

export function usePlanLimits() {
  const { user } = useAuth();
  const store = useSyncExternalStore(subscribe, () => state, () => state);
  const { data, loading } = store;
  const [, force] = useState(0);

  const refresh = useCallback(async () => {
    await fetchLimits(true);
    force((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setState({ data: null, loading: false });
      return;
    }
    if (!state.data) setState({ loading: true });
    fetchLimits();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const onVisible = () => { if (document.visibilityState === "visible") fetchLimits(true); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => fetchLimits(true), 30_000);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const planName = (data?.plan ?? "free").toLowerCase();
  const isPremium = planIsPremium(planName);
  // `ready` = we have real plan data. UI should render everything and only
  // apply locks once ready, so features never flash in and out.
  const ready = !!data;

  const canCreate = (resource: "apps" | "keys" | "resellers" | "managers") => {
    if (!data) return true; // allow while loading
    const limit = data.limits[resource];
    if (limit === "unlimited") return true;
    return data.usage[resource] < limit;
  };

  const hasFeature = (feature: PlanFeature) => {
    if (!ready) return true; // don't lock before we know the plan
    switch (feature) {
      case "resellers":
        return data!.limits.resellers === "unlimited" || (data!.limits.resellers as number) > 0;
      case "managers":
        return data!.limits.managers === "unlimited" || (data!.limits.managers as number) > 0;
      default:
        return isPremium;
    }
  };

  const getLimit = (resource: "apps" | "keys" | "resellers" | "managers") => {
    if (!data) return "—";
    const l = data.limits[resource];
    return l === "unlimited" ? "∞" : l;
  };

  const getUsage = (resource: "apps" | "keys" | "resellers" | "managers") =>
    data?.usage[resource] ?? 0;

  const daysRemaining = (() => {
    if (!data?.plan_expires_at) return null;
    const diff = new Date(data.plan_expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return {
    data,
    loading,
    ready,
    refresh,
    canCreate,
    hasFeature,
    getLimit,
    getUsage,
    planName,
    isPremium,
    daysRemaining,
  };
}
