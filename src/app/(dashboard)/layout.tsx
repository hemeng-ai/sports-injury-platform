/**
 * (dashboard) 路由组布局 — 所有功能页共享
 * 左侧 Sidebar + 右侧内容区（面包屑 + 滚动内容）
 */
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
