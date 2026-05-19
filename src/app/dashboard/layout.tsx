/**
 * Dashboard 布局 — /dashboard/*
 * 对所有已认证页面提供 Navbar + Sidebar + Breadcrumb + 内容区
 */
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
