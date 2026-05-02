import { ReactNode } from "react";
import { SellerSidebar } from "./SellerSidebar";
import { MobileNav } from "./MobileNav";

interface SellerLayoutProps {
  children: ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <SellerSidebar />
      </div>
      <MobileNav>
        <SellerSidebar />
      </MobileNav>
      <main className="min-h-screen md:ml-60 transition-all duration-300">
        <div className="p-4 pt-16 md:p-8 md:pt-8 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}