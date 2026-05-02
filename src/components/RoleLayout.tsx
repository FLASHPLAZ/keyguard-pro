import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "./DashboardLayout";
import { SellerLayout } from "./SellerLayout";
import { ManagerLayout } from "./ManagerLayout";
import { ResellerLayout } from "./ResellerLayout";

interface RoleLayoutProps {
  children: ReactNode;
}

export function RoleLayout({ children }: RoleLayoutProps) {
  const { role } = useAuth();

  if (role === "seller") return <SellerLayout>{children}</SellerLayout>;
  if (role === "manager") return <ManagerLayout>{children}</ManagerLayout>;
  if (role === "reseller") return <ResellerLayout>{children}</ResellerLayout>;
  return <DashboardLayout>{children}</DashboardLayout>;
}