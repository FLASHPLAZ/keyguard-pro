import { ReactNode } from "react";
import { ManagerSidebar } from "./ManagerSidebar";
import { AppShell } from "./AppShell";

interface ManagerLayoutProps {
  children: ReactNode;
}

export function ManagerLayout({ children }: ManagerLayoutProps) {
  return (
    <AppShell sidebar={<ManagerSidebar />} panelLabel="Manager Console">
      {children}
    </AppShell>
  );
}
