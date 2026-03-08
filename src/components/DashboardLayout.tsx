import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { MobileNav } from "./MobileNav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardSidebar />
      </div>
      <MobileNav>
        <DashboardSidebar />
      </MobileNav>
      <main className="min-h-screen md:ml-60">
        <div className="p-4 pt-16 md:p-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
