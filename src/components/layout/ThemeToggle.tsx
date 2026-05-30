"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  className?: string;
  /** 是否显示文字标签，侧边栏场景使用 */
  showLabel?: boolean;
}

export default function ThemeToggle({ className, showLabel = false }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = theme === "dark" ? "切换明亮模式" : "切换暗色模式";

  if (!mounted) {
    // 服务端渲染占位，避免 hydration mismatch
      return (
      <Button variant="ghost" size={showLabel ? "default" : "icon"} className={className} disabled>
        <span className={showLabel ? "" : "h-5 w-5"} />
        {showLabel && <span>加载中...</span>}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      className={className}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={label}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-warning" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      {showLabel && <span>{label}</span>}
    </Button>
  );
}
