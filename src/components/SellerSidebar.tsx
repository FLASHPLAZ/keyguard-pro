import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  AppWindow,
  Key,
  Users,
  ScrollText,
  Shield,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bot,
  Sparkles,
  Code2,
  Crown,
  Mail,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { usePlanLimits } from "@/hooks/usePlanLimits";
import { BrandLogo } from "@/components/BrandLogo";

type SellerNavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  locked: boolean;
};

function useSellerNavItems(): SellerNavItem[] {
  const { hasFeature } = usePlanLimits();

  // Every feature is always visible. Items the current plan doesn't include
  // render with a lock badge and route to billing instead of being hidden.
  return [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", locked: false },
    { icon: AppWindow, label: "Applications", path: "/dashboard/apps", locked: false },
    { icon: Key, label: "Licenses", path: "/dashboard/licenses", locked: false },
    { icon: Mail, label: "Client Emails", path: "/dashboard/clients", locked: false },
    { icon: Users, label: "Resellers", path: "/dashboard/resellers", locked: !hasFeature("resellers") },
    { icon: ShieldCheck, label: "Managers", path: "/dashboard/managers", locked: !hasFeature("managers") },
    { icon: ScrollText, label: "Logs", path: "/dashboard/logs", locked: false },
    { icon: Code2, label: "API Docs", path: "/dashboard/api-docs", locked: false },
    { icon: Bot, label: "Bot Guide", path: "/dashboard/bot-guide", locked: !hasFeature("bot") },
    { icon: Crown, label: "Plan & Billing", path: "/dashboard/billing", locked: false },
    { icon: Settings, label: "Settings", path: "/dashboard/settings", locked: false },
  ];
}

export function SellerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const navItems = useSellerNavItems();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavItem = ({ item }: { item: SellerNavItem }) => {
    const isActive =
      location.pathname === item.path ||
      (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

    const link = (
      <Link
        to={item.locked ? "/dashboard/billing" : item.path}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          item.locked && "opacity-70"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
        )}
        <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isActive && "scale-110")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {item.locked && !collapsed && <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        {item.locked && collapsed && (
          <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-muted-foreground" />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="bg-popover border-border">
            {item.locked ? `${item.label} — upgrade to unlock` : item.label}
          </TooltipContent>
        </Tooltip>
      );
    }
    if (item.locked) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="bg-popover border-border">
            Included in Monthly & Lifetime plans
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar/95 shadow-[18px_0_55px_-40px_hsl(0_0%_0%/0.85)] backdrop-blur-xl transition-all duration-300",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <div className="relative flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <BrandLogo size="sm" showText={false} />
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-foreground truncate">GX Auth</span>
              <div className="flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary/60" />
                <span className="text-[10px] text-muted-foreground">Workspace</span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-2 space-y-1">
          {!collapsed && user && (
            <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-secondary/35 px-3 py-2">
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
              <TooltipContent side="right" className="bg-popover border-border">
                {user.email}
              </TooltipContent>
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
          className="flex h-10 items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
