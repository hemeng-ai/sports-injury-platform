"use client";

/**
 * Sidebar — 树状侧边栏导航
 * 自研递归 TreeView + TreeNode，权限过滤，移动端 Sheet overlay，localStorage 持久化展开状态
 */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  FolderOpen,
  Folder,
  FileText,
  BarChart3,
  Users,
  Settings,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

/** 节点定义 */
interface NavNode {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  requiredRole?: string;
  children?: NavNode[];
}

/** 侧边栏 Props */
interface SidebarProps {
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

/** 角色层级：数值越大权限越高 */
const ROLE_HIERARCHY: Record<string, number> = {
  VISITOR: 0,
  ADMIN: 1,
  SUPERADMIN: 2,
};

/** 检查用户是否有权限访问某节点 */
function canAccessNode(userRole: string | undefined, requiredRole?: string): boolean {
  if (!requiredRole) return true;
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

/** 导航节点列表 */
const NAV_NODES: NavNode[] = [
  { id: "dashboard", label: "首页", icon: FolderOpen, href: "/dashboard" },
  { id: "files", label: "文件管理", icon: Folder, href: "/files" },
  { id: "indicators", label: "指标体系", icon: FileText, href: "/indicators" },
  { id: "analysis", label: "数据分析", icon: BarChart3, href: "/analysis" },
  { id: "users", label: "用户管理", icon: Users, href: "/users", requiredRole: "ADMIN" },
  { id: "settings", label: "系统设置", icon: Settings, href: "/settings", requiredRole: "ADMIN" },
];

/** localStorage 键名 */
const STORAGE_KEY = "sidebar-expanded";

export default function Sidebar({ userRole, isOpen, onClose, className }: SidebarProps) {
  const pathname = usePathname();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // 初始化：从 localStorage 读取
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch {
        // 解析失败，使用默认
      }
    }
    return new Set<string>();
  });

  // 持久化展开状态到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds]));
    } catch {
      // 存储失败忽略
    }
  }, [expandedIds]);

  // 根据权限过滤节点
  const filteredNodes = NAV_NODES.filter((node) =>
    canAccessNode(userRole, node.requiredRole)
  );

  const handleNodeClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const sidebarContent = (
    <aside className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* 品牌头部 */}
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <Activity className="h-6 w-6 text-primary flex-shrink-0" />
        <span className="font-bold text-sm text-sidebar-foreground truncate">运动损伤资料平台</span>
      </div>

      {/* 移动端标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border lg:hidden">
        <span className="font-semibold text-sm text-sidebar-foreground">导航菜单</span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
          aria-label="关闭侧边栏"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 导航树 */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredNodes.map((node) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              pathname={pathname}
              expandedIds={expandedIds}
              onToggle={(id) =>
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) {
                    next.delete(id);
                  } else {
                    next.add(id);
                  }
                  return next;
                })
              }
              onNavigate={handleNodeClick}
            />
          ))}
        </ul>
      </nav>

      {/* 底部：主题切换 */}
      <div className="p-2 border-t border-sidebar-border">
        <ThemeToggle className="w-full justify-start gap-3 px-3" showLabel />
      </div>
    </aside>
  );

  // 移动端：Sheet overlay
  return (
    <>
      {/* 桌面端：始终显示 */}
      <div className={cn("hidden lg:block w-56 flex-shrink-0", className)}>{sidebarContent}</div>

      {/* 移动端：Sheet overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* 侧边栏面板 */}
          <div className="fixed inset-y-0 left-0 w-64 z-50 animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

/** 单个树节点 */
function TreeNodeItem({
  node,
  pathname,
  expandedIds,
  onToggle,
  onNavigate,
}: {
  node: NavNode;
  pathname: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: () => void;
}) {
  const isActive = pathname.startsWith(node.href);
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = node.icon;

  return (
    <li>
      <Link
        href={node.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 ease-out",
          "border-l-[3px] border-l-transparent",
          isActive
            ? "bg-primary/10 text-primary font-medium border-l-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate">{node.label}</span>
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-0.5 rounded hover:bg-muted"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        )}
      </Link>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <ul className="ml-4 mt-1 space-y-1">
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              pathname={pathname}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
