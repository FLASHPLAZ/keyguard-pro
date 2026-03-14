import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "reseller" | "manager";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Role-based redirect
  if (requiredRole && role !== requiredRole) {
    if (role === "reseller") return <Navigate to="/reseller" replace />;
    if (role === "manager") return <Navigate to="/manager" replace />;
    if (role === "admin") return <Navigate to="/" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
