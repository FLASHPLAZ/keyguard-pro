import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export function StatCard({ title, value, icon: Icon, change, changeType = "neutral" }: StatCardProps) {
  const numericValue = typeof value === "number" ? value : 0;
  const animatedValue = useAnimatedCounter(numericValue);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/70 bg-card/90 p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/35 hover:-translate-y-0.5">
      {/* Top accent */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 via-55% to-accent/40 opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.025] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {typeof value === "number" ? animatedValue : value}
          </p>
          {change && (
            <p
              className={cn(
                "mt-1.5 text-xs font-medium",
                changeType === "positive" && "text-emerald-400",
                changeType === "negative" && "text-red-400",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="rounded-md border border-primary/15 bg-primary/10 p-2.5 transition-all duration-300 group-hover:bg-primary/15 group-hover:scale-105">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
