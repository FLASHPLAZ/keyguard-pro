import { ReactNode } from "react";
import { ResellerSidebar } from "./ResellerSidebar";
import { MobileNav } from "./MobileNav";

interface ResellerLayoutProps {
  children: ReactNode;
}

export function ResellerLayout({ children }: ResellerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <ResellerSidebar />
      </div>
      <MobileNav>
        <ResellerSidebar />
      </MobileNav>
      <main className="min-h-screen md:ml-60">
        <div className="p-4 pt-16 md:p-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
