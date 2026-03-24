import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Zap, AlertTriangle, Clock } from "lucide-react";

interface HealthStats {
  avgResponseTime: number;
  successRate: number;
  totalRequests24h: number;
  errorCount24h: number;
  peakHour: string;
}

export function SystemHealthWidget() {
  const [stats, setStats] = useState<HealthStats>({
    avgResponseTime: 0,
    successRate: 100,
    totalRequests24h: 0,
    errorCount24h: 0,
    peakHour: "—",
  });

  useEffect(() => {
    const fetch24hStats = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("activity_logs")
        .select("action, response_time_ms, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!data || data.length === 0) return;

      const total = data.length;
      const errors = data.filter(d =>
        d.action?.includes("Rejected") || d.action?.includes("Banned") || d.action?.includes("Rate Limited")
      ).length;
      const successes = data.filter(d =>
        d.action === "License Login" || d.action === "First Login — HWID Bound"
      ).length;

      const responseTimes = data.filter(d => d.response_time_ms != null).map(d => d.response_time_ms!);
      const avgMs = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

      // Find peak hour
      const hourCounts = new Map<number, number>();
      for (const d of data) {
        const hour = new Date(d.created_at).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      let peakHour = 0;
      let peakCount = 0;
      hourCounts.forEach((count, hour) => {
        if (count > peakCount) { peakCount = count; peakHour = hour; }
      });
      const peakLabel = `${peakHour.toString().padStart(2, "0")}:00`;

      setStats({
        avgResponseTime: avgMs,
        successRate: total > 0 ? Math.round((successes / total) * 100) : 100,
        totalRequests24h: total,
        errorCount24h: errors,
        peakHour: peakLabel,
      });
    };

    fetch24hStats();
    const interval = setInterval(fetch24hStats, 60_000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: "Avg Response", value: `${stats.avgResponseTime}ms`, icon: Zap, color: stats.avgResponseTime < 200 ? "text-emerald-400" : stats.avgResponseTime < 500 ? "text-amber-400" : "text-destructive" },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: Activity, color: stats.successRate > 90 ? "text-emerald-400" : stats.successRate > 70 ? "text-amber-400" : "text-destructive" },
    { label: "Requests (24h)", value: stats.totalRequests24h.toLocaleString(), icon: Clock, color: "text-primary" },
    { label: "Errors (24h)", value: stats.errorCount24h.toLocaleString(), icon: AlertTriangle, color: stats.errorCount24h === 0 ? "text-emerald-400" : "text-destructive" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">System Health (24h)</h3>
        <span className="text-xs text-muted-foreground">Peak: {stats.peakHour}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-md bg-secondary/30 px-3 py-3">
            <item.icon className={`h-5 w-5 shrink-0 ${item.color}`} />
            <div>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
