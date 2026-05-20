"use client";

/**
 * DashboardShell — 认证后的仪表盘布局壳
 * 包含 Navbar + Sidebar + Breadcrumb + 内容区
 * 响应式：移动端 Sidebar 通过 Sheet overlay 显示
 */
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user as { name?: string; role?: string } | undefined;
  const userRole = user?.role;
  const userName = user?.name;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* 桌面端侧边栏（始终渲染，通过 CSS 控制显隐） */}
        <Sidebar userName={userName} userRole={userRole} />

        {/* 主内容区 */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* 面包屑 + 移动端菜单按钮 */}
          <div className="flex items-center gap-2 px-2 pt-2">
            {/* 移动端：侧边栏切换按钮 */}
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

          {/* 内容区 */}
          <div className="flex-1">{children}</div>
        </main>
      </div>

      {/* 移动端：Sheet overlay 侧边栏 */}
      <Sidebar
        userName={userName}
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}
