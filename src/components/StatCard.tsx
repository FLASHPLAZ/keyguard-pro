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
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
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
        <div className="rounded-xl bg-primary/10 p-2.5 transition-all duration-300 group-hover:bg-primary/15 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
