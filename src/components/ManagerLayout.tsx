import { ReactNode } from "react";
import { ManagerSidebar } from "./ManagerSidebar";
import { MobileNav } from "./MobileNav";

interface ManagerLayoutProps {
  children: ReactNode;
}

export function ManagerLayout({ children }: ManagerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <ManagerSidebar />
      </div>
      <MobileNav>
        <ManagerSidebar />
      </MobileNav>
      <main className="min-h-screen md:ml-60">
        <div className="p-4 pt-16 md:p-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
