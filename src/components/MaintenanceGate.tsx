import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const fallback = {
      enabled: localStorage.getItem("gxauth_maintenance_mode") === "true",
      message: localStorage.getItem("gxauth_maintenance_message") || "GX Auth is currently under maintenance. Please check back soon.",
    };

    async function loadMaintenance() {
      try {
        const { data, error } = await supabase.functions.invoke("public-settings");
        if (!error && data) {
          if (!mounted) return;
          setMaintenance({
            enabled: Boolean((data as any)?.maintenance_mode),
            message: (data as any)?.maintenance_message || fallback.message,
          });
          return;
        }
      } catch {
        // Continue to database fallback below.
      }

      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["maintenance_mode", "maintenance_message"]);
      const map = new Map((data || []).map((row: any) => [row.key, row.value]));
      if (!mounted) return;
      setMaintenance({
        enabled: map.has("maintenance_mode") ? map.get("maintenance_mode") === "true" : fallback.enabled,
        message: (map.get("maintenance_message") as string) || fallback.message,
      });
    }

    loadMaintenance().catch(() => {
      if (mounted) setMaintenance(fallback.enabled ? fallback : { enabled: false, message: "" });
    });
    return () => { mounted = false; };
  }, []);

  if (maintenance?.enabled && role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md rounded-lg border border-border/70 bg-card/90 p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Maintenance Mode</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{maintenance.message}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
