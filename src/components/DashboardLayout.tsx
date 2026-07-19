import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { AppShell } from "./AppShell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppShell sidebar={<DashboardSidebar />} panelLabel="Owner Area">
      {children}
    </AppShell>
  );
}
