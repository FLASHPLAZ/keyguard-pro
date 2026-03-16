import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  AppWindow,
  Key,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerPermissions } from "@/hooks/useManagerPermissions";

export function ManagerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { permissions } = useManagerPermissions();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/manager", show: true },
    { icon: AppWindow, label: "Applications", path: "/manager/apps", show: true },
    { icon: Key, label: "Licenses", path: "/manager/licenses", show: permissions.can_view_licenses },
    { icon: FileText, label: "API Docs", path: "/manager/api-docs", show: true },
  ].filter(item => item.show);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-lg font-bold tracking-tight text-foreground">Galactic Boosts</span>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Manager Panel</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/manager" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        {!collapsed && user && (
          <div className="mb-2 px-3 py-1">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-12 items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
