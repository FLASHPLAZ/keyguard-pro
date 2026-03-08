import { ReactNode } from "react";
import { ResellerSidebar } from "./ResellerSidebar";

interface ResellerLayoutProps {
  children: ReactNode;
}

export function ResellerLayout({ children }: ResellerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ResellerSidebar />
      <main className="ml-60 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
