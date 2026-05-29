"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import Link from "next/link";
import {
  LayoutDashboard, Files, BarChart3, FileSpreadsheet,
  Settings, Users, LogOut, ChevronLeft, ChevronRight,
  Menu, User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PasswordReminder } from "@/components/auth/PasswordReminder";
import { createClient } from "@/lib/supabase-client";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: "首页", href: "/dashboard", icon: LayoutDashboard },
  { title: "文件管理", href: "/files", icon: Files },
  { title: "指标体系", href: "/indicators", icon: FileSpreadsheet },
  { title: "数据分析", href: "/analysis", icon: BarChart3 },
  { title: "用户管理", href: "/users", icon: Users, minRole: "SUPERADMIN" },
  { title: "系统设置", href: "/settings", icon: Settings, minRole: "ADMIN" },
];

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "超级管理员",
  ADMIN: "管理员",
  VISITOR: "游客",
};

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
      if (supabaseUser) {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          role: (supabaseUser.app_metadata as Record<string, unknown>)?.role as string || "VISITOR",
        });
      }
    });
  }, [supabase]);

  const role = user?.role || "VISITOR";
  const roleLabel = ROLE_LABELS[role] || role;

  const roleHierarchy = ["VISITOR", "ADMIN", "SUPERADMIN"];

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.minRole) return true;
    return roleHierarchy.indexOf(role) >= roleHierarchy.indexOf(item.minRole);
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const sidebar = (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-screen bg-background border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-14 px-4 border-b", collapsed && "justify-center")}>
        {!collapsed && (
          <Link href="/dashboard" className="text-sm font-bold truncate">
            运动损伤资料平台
          </Link>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/10 text-primary font-medium border-l-[3px] border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User Info + Collapse + Sign Out */}
      <div className="border-t p-2 space-y-2">
        {/* User Info */}
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md",
            collapsed && "justify-center",
          )}
        >
          <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user?.email || ""}</p>
              <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full hidden lg:flex"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* Sign Out */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "退出登录"}
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      {sidebar}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "lg:ml-16" : "lg:ml-60",
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 border-b bg-background/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <PasswordReminder />
          <ThemeToggle />
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

