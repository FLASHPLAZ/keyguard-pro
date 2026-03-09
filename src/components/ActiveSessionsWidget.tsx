import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Wifi, WifiOff, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface ActiveSession {
  license_key: string;
  ip: string | null;
  country: string | null;
  device_name: string | null;
  application_name: string | null;
  last_seen: string;
}

const SESSION_TIMEOUT_MINUTES = 5;

export function ActiveSessionsWidget() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const animatedCount = useAnimatedCounter(sessions.length);

  const fetchActiveSessions = useCallback(async () => {
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MINUTES * 60 * 1000).toISOString();

    // Get recent login/heartbeat activity within the timeout window
    const { data, error } = await supabase
      .from("activity_logs")
      .select("license_key, ip, country, device_name, application_name, created_at")
      .in("action", ["License Login", "First Login — HWID Bound", "Heartbeat — Active"])
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch active sessions:", error);
      setLoading(false);
      return;
    }

    // Deduplicate by license_key — keep the most recent entry per key
    const seen = new Map<string, ActiveSession>();
    for (const row of data || []) {
      if (row.license_key && !seen.has(row.license_key)) {
        seen.set(row.license_key, {
          license_key: row.license_key,
          ip: row.ip,
          country: row.country,
          device_name: row.device_name,
          application_name: row.application_name,
          last_seen: row.created_at,
        });
      }
    }

    setSessions(Array.from(seen.values()));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActiveSessions();

    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveSessions, 30_000);

    // Realtime subscription for instant updates
    const channel = supabase
      .channel("active-sessions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          fetchActiveSessions();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchActiveSessions]);

  const statusColor = sessions.length > 0
    ? "text-emerald-400"
    : "text-muted-foreground";

  const statusBg = sessions.length > 0
    ? "bg-emerald-500/10 border-emerald-500/20"
    : "bg-muted/50 border-border";

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-md p-2", sessions.length > 0 ? "bg-emerald-500/10" : "bg-muted")}>
            <Activity className={cn("h-4 w-4", statusColor)} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
          statusBg, statusColor
        )}>
          {sessions.length > 0 ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>No sessions</span>
            </>
          )}
        </div>
      </div>

      {/* Big Counter */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className={cn("text-4xl font-bold tracking-tight", statusColor)}>
          {loading ? "—" : animatedCount}
        </span>
        <span className="text-sm text-muted-foreground">
          active in last {SESSION_TIMEOUT_MINUTES} min
        </span>
      </div>

      {/* Live Pulse Indicator */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs text-muted-foreground">Real-time monitoring active</span>
        </div>
      )}

      {/* Session List */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-md bg-secondary/30 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && sessions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active sessions right now
          </p>
        )}
        {!loading && sessions.map((session) => {
          const ago = Math.round((Date.now() - new Date(session.last_seen).getTime()) / 60000);
          return (
            <div
              key={session.license_key}
              className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2.5 transition-all duration-200 hover:bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-foreground truncate">
                  {session.license_key}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {session.application_name && (
                    <span className="text-xs text-primary font-medium">{session.application_name}</span>
                  )}
                  {session.device_name && (
                    <span className="text-xs text-muted-foreground">· {session.device_name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                {session.country && session.country !== "Unknown" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {session.country}
                  </span>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {ago === 0 ? "just now" : `${ago}m ago`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
