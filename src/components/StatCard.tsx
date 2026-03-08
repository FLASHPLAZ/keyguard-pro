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
    <div className="stat-card group animate-fade-in hover:glow-primary transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {typeof value === "number" ? animatedValue : value}
          </p>
          {change && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                changeType === "positive" && "text-emerald-400",
                changeType === "negative" && "text-red-400",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="rounded-md bg-primary/10 p-2.5 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
