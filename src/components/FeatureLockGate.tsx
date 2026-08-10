import { Link } from "react-router-dom";
import { Lock, ArrowUpRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleLayout } from "@/components/RoleLayout";

interface FeatureLockGateProps {
  title: string;
  description: string;
  perks?: string[];
}

/**
 * Shown in place of a premium page for plans that don't include it.
 * The feature stays visible everywhere — it is simply locked.
 */
export function FeatureLockGate({ title, description, perks = [] }: FeatureLockGateProps) {
  return (
    <RoleLayout>
      <div className="mx-auto max-w-xl py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title} is locked</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {perks.length > 0 && (
          <ul className="mx-auto mt-5 grid gap-2 text-left text-sm text-muted-foreground sm:grid-cols-2">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link to="/pricing">
            <Button className="btn-glow gap-1.5">Upgrade plan <ArrowUpRight className="h-3.5 w-3.5" /></Button>
          </Link>
          <Link to="/dashboard/billing">
            <Button variant="outline">View my plan</Button>
          </Link>
        </div>
      </div>
    </RoleLayout>
  );
}
