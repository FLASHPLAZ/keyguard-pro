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
      <main className="min-h-screen md:ml-60 transition-all duration-300">
        <div className="p-4 pt-16 md:p-8 md:pt-8 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
