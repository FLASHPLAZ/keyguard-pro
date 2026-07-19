import { ReactNode } from "react";
import { ResellerSidebar } from "./ResellerSidebar";
import { AppShell } from "./AppShell";

interface ResellerLayoutProps {
  children: ReactNode;
}

export function ResellerLayout({ children }: ResellerLayoutProps) {
  return (
    <AppShell sidebar={<ResellerSidebar />} panelLabel="Reseller Console">
      {children}
    </AppShell>
  );
}
