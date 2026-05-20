"use client";

/**
 * Navbar — 顶部导航栏
 * 左侧品牌 + 右侧主题切换
 */
import { Activity } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* 左侧：品牌 */}
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-foreground">
            运动损伤资料平台
          </span>
        </div>

        {/* 右侧：主题切换 */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
