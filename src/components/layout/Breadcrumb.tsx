"use client";

/**
 * Breadcrumb — 面包屑导航组件
 * 使用 usePathname() 自动解析当前路径并生成中文面包屑
 */
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

/** 路径到中文的映射表 */
const PATH_LABELS: Record<string, string> = {
  dashboard: "首页",
  files: "文件管理",
  indicators: "指标体系",
  analysis: "数据分析",
  users: "用户管理",
  settings: "系统设置",
};

/**
 * 将路径段转为中文显示标签
 * 在映射表中的使用中文，否则使用原始值
 */
function getLabel(segment: string): string {
  return PATH_LABELS[segment] || segment;
}

export default function Breadcrumb() {
  const pathname = usePathname();

  // 分割路径，过滤空字符串；过滤掉 "dashboard" 段（它等同于首页链接）
  const segments = pathname.split("/").filter(Boolean).filter(s => s !== "dashboard");

  // 如果没有路径段（根路径或 /dashboard），只显示首页
  if (segments.length === 0) {
    return (
      <nav aria-label="面包屑导航" className="flex items-center gap-2 px-4 py-2">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">首页</span>
      </nav>
    );
  }

  return (
    <nav aria-label="面包屑导航" className="flex items-center gap-1 px-4 py-2 text-sm">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>首页</span>
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const label = getLabel(segment);
        // 构建累积路径
        const href = "/" + segments.slice(0, index + 1).join("/");

        return (
          <span key={index} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
