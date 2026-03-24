import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HourlyData {
  hour: string;
  success: number;
  rejected: number;
}

export function HourlyTrendsChart() {
  const [data, setData] = useState<HourlyData[]>([]);

  useEffect(() => {
    const fetchHourly = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("action, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(1000);

      if (!logs) return;

      const hourMap = new Map<string, { success: number; rejected: number }>();
      // Init all 24 hours
      for (let i = 0; i < 24; i++) {
        const d = new Date();
        d.setHours(d.getHours() - 23 + i, 0, 0, 0);
        const label = d.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false });
        hourMap.set(label, { success: 0, rejected: 0 });
      }

      for (const log of logs) {
        const h = new Date(log.created_at).toLocaleTimeString("en-US", { hour: "2-digit", hour12: false });
        const entry = hourMap.get(h);
        if (!entry) continue;
        if (log.action === "License Login" || log.action === "First Login — HWID Bound") {
          entry.success++;
        } else if (log.action?.includes("Rejected") || log.action?.includes("Banned")) {
          entry.rejected++;
        }
      }

      setData(Array.from(hourMap.entries()).map(([hour, vals]) => ({ hour, ...vals })));
    };

    fetchHourly();
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Hourly Trends (24h)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
          <XAxis dataKey="hour" stroke="hsl(215, 12%, 50%)" fontSize={10} interval={3} />
          <YAxis stroke="hsl(215, 12%, 50%)" fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "6px", color: "hsl(210, 20%, 92%)" }} />
          <Area type="monotone" dataKey="success" stackId="1" stroke="hsl(142, 72%, 45%)" fill="hsl(142, 72%, 45%)" fillOpacity={0.3} name="Success" />
          <Area type="monotone" dataKey="rejected" stackId="1" stroke="hsl(0, 72%, 55%)" fill="hsl(0, 72%, 55%)" fillOpacity={0.3} name="Rejected" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
