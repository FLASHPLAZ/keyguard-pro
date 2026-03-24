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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerPermissions } from "@/hooks/useManagerPermissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ManagerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { permissions } = useManagerPermissions();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/manager", show: true },
    { icon: AppWindow, label: "Applications", path: "/manager/apps", show: true },
    { icon: Key, label: "Licenses", path: "/manager/licenses", show: permissions.can_view_licenses || permissions.can_create_licenses || permissions.can_ban_licenses || permissions.can_reset_hwid },
    { icon: FileText, label: "API Docs", path: "/manager/api-docs", show: true },
  ].filter(item => item.show);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive =
      location.pathname === item.path ||
      (item.path !== "/manager" && location.pathname.startsWith(item.path));

    const link = (
      <Link
        to={item.path}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
        )}
        <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isActive && "scale-110")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="bg-popover border-border">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <div className="relative flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-foreground truncate">Galactic Boosts</span>
              <div className="flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary/60" />
                <span className="text-[10px] text-muted-foreground">Manager Panel</span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        <div className="border-t border-border p-2 space-y-1">
          {!collapsed && user && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/30 px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                {user.email?.charAt(0) || "U"}
              </div>
              <p className="text-xs text-muted-foreground truncate flex-1">{user.email}</p>
            </div>
          )}
          {collapsed && user && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center py-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase cursor-default">
                    {user.email?.charAt(0) || "U"}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover border-border">{user.email}</TooltipContent>
            </Tooltip>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-10 items-center justify-center border-t border-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
