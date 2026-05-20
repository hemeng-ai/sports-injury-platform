"use client";

/**
 * DashboardShell — 认证后的仪表盘布局壳
 * 左侧固定侧边栏 + 右侧内容区（顶部面包屑 + 滚动内容）
 * 响应式：移动端 Sidebar 通过 Sheet overlay 显示
 */
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/Sidebar";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user as { name?: string; role?: string } | undefined;
  const userRole = user?.role;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧固定侧边栏（桌面端始终显示 + 移动端 Sheet overlay，由 Sidebar 内部处理） */}
      <Sidebar
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        className="h-full overflow-y-auto"
      />

      {/* 右侧内容区 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 顶部：面包屑 + 移动端菜单按钮 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开导航菜单"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Breadcrumb />
        </div>

        {/* 滚动内容区 */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6 w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
