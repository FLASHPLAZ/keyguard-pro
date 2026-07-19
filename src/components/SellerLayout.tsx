import { ReactNode } from "react";
import { SellerSidebar } from "./SellerSidebar";
import { AppShell } from "./AppShell";

interface SellerLayoutProps {
  children: ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  return (
    <AppShell sidebar={<SellerSidebar />} panelLabel="Seller Workspace">
      {children}
    </AppShell>
  );
}
