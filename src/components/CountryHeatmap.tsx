import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryData {
  country: string;
  count: number;
}

const SESSION_TIMEOUT_MINUTES = 30;

export function CountryHeatmap() {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCountryData = useCallback(async () => {
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MINUTES * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("activity_logs")
      .select("license_key, country")
      .in("action", ["License Login", "First Login — HWID Bound", "Heartbeat — Active"])
      .gte("created_at", cutoff)
      .not("country", "is", null);

    if (error) {
      console.error("Failed to fetch country data:", error);
      setLoading(false);
      return;
    }

    // Deduplicate by license_key, keep latest
    const uniqueByKey = new Map<string, string>();
    for (const row of data || []) {
      if (row.license_key && row.country && row.country !== "Unknown") {
        uniqueByKey.set(row.license_key, row.country);
      }
    }

    // Count per country
    const countMap = new Map<string, number>();
    for (const country of uniqueByKey.values()) {
      countMap.set(country, (countMap.get(country) || 0) + 1);
    }

    const sorted = Array.from(countMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    setCountries(sorted);
    setTotalSessions(uniqueByKey.size);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCountryData();
    const interval = setInterval(fetchCountryData, 30_000);

    const channel = supabase
      .channel("country-heatmap")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
        fetchCountryData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchCountryData]);

  const maxCount = countries.length > 0 ? countries[0].count : 1;

  function getHeatColor(count: number): string {
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-primary/90 text-primary-foreground";
    if (ratio > 0.5) return "bg-primary/60 text-foreground";
    if (ratio > 0.25) return "bg-primary/35 text-foreground";
    return "bg-primary/15 text-foreground";
  }

  function getBarWidth(count: number): string {
    return `${Math.max((count / maxCount) * 100, 8)}%`;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 glow-hover animate-fade-in-up" style={{ animationDelay: "250ms" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Sessions by Country</h3>
        </div>
        <span className="text-xs text-muted-foreground">Last {SESSION_TIMEOUT_MINUTES} min</span>
      </div>

      {/* Total */}
      <div className="flex items-baseline gap-2 mb-5">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {loading ? "—" : totalSessions}
        </span>
        <span className="text-sm text-muted-foreground">
          across {countries.length} {countries.length === 1 ? "country" : "countries"}
        </span>
      </div>

      {/* Country bars */}
      <div className="space-y-2.5 max-h-[280px] overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 rounded-md bg-secondary/30 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && countries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No active sessions with country data
          </p>
        )}

        {!loading && countries.map((item, idx) => (
          <div key={item.country} className="group relative" style={{ animationDelay: `${idx * 40}ms` }}>
            <div className="flex items-center gap-3">
              {/* Country name */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate font-medium">{item.country}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 h-7 rounded-md bg-secondary/30 overflow-hidden relative">
                <div
                  className={cn("h-full rounded-md transition-all duration-700 ease-out flex items-center justify-end pr-2", getHeatColor(item.count))}
                  style={{ width: getBarWidth(item.count) }}
                >
                  <span className="text-xs font-semibold">{item.count}</span>
                </div>
              </div>

              {/* Percentage */}
              <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                {totalSessions > 0 ? `${Math.round((item.count / totalSessions) * 100)}%` : "0%"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Heat legend */}
      {countries.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Low</span>
          <div className="h-2 w-5 rounded-sm bg-primary/15" />
          <div className="h-2 w-5 rounded-sm bg-primary/35" />
          <div className="h-2 w-5 rounded-sm bg-primary/60" />
          <div className="h-2 w-5 rounded-sm bg-primary/90" />
          <span className="text-xs text-muted-foreground ml-1">High</span>
        </div>
      )}
    </div>
  );
}
