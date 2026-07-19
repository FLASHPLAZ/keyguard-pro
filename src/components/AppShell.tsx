import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Activity, CheckCircle2, Shield, Terminal } from "lucide-react";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/contexts/AuthContext";

interface AppShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  panelLabel: string;
}

const sectionNames: Record<string, string> = {
  admin: "Admin Command",
  apps: "Applications",
  licenses: "Licenses",
  resellers: "Resellers",
  managers: "Managers",
  logs: "Activity Logs",
  settings: "Settings",
  dashboard: "Workspace",
  reseller: "Reseller Console",
  manager: "Manager Console",
};

function getSectionTitle(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0] || "admin";
  return sectionNames[segment] || "GX Auth";
}

export function AppShell({ children, sidebar, panelLabel }: AppShellProps) {
  const { user } = useAuth();
  const location = useLocation();
  const title = getSectionTitle(location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.28)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.18)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="hidden md:block">{sidebar}</div>
      <MobileNav>{sidebar}</MobileNav>

      <main className="min-h-screen transition-all duration-300 md:ml-60">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 pt-16 md:px-8 md:pt-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Shield className="h-3.5 w-3.5" />
                {panelLabel}
              </div>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/75 px-3 py-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Protected changes
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/75 px-3 py-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Live telemetry
              </div>
              <div className="flex max-w-[220px] items-center gap-2 rounded-md border border-border/70 bg-card/75 px-3 py-2 text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{user?.email || "Signed in"}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
