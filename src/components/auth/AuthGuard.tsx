"use client";

/**
 * AuthGuard — 认证守卫组件
 *
 * 包装受保护内容：
 * - loading → 显示 Skeleton 加载骨架
 * - unauthenticated → 重定向到 /login
 * - authenticated + role 匹配 → 渲染 children
 * - role 不足 → 显示 403 无权限页面（非重定向）
 *
 * Props:
 * - role: 要求的角色（层级匹配，如要求 ADMIN 则 SUPERADMIN 也可通过）
 * - requiredRole: 同 role 的别名，优先级更高（Task 1.3 新增）
 * - fallback: 角色不足时显示的自定义内容
 */
import { useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/types";

const ROLE_HIERARCHY: UserRole[] = ["VISITOR", "ADMIN", "SUPERADMIN"];

interface AuthGuardProps {
  children: ReactNode;
  /** 要求的角色（使用层级匹配，如要求 ADMIN 则 SUPERADMIN 也可通过） */
  role?: UserRole;
  /** requiredRole 是 role 的别名，优先级更高（Task 1.3 新增） */
  requiredRole?: UserRole;
  /** 角色不足时显示的 fallback 内容 */
  fallback?: ReactNode;
}

export default function AuthGuard({
  children,
  role,
  requiredRole,
  fallback,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 确定实际要求的角色：requiredRole 优先于 role
  const effectiveRole = requiredRole || role;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // 加载中 → 显示 Skeleton 骨架屏
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div
          role="status"
          className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
        >
          <span className="sr-only">加载中...</span>
        </div>
      </div>
    );
  }

  // 未认证 → 显示空壳，useEffect 会触发重定向
  if (status === "unauthenticated") {
    return null;
  }

  // 已认证 → 检查角色
  if (effectiveRole) {
    const userRole = (session?.user as { role?: string } | undefined)?.role as
      | UserRole
      | undefined;

    if (
      !userRole ||
      ROLE_HIERARCHY.indexOf(userRole) < ROLE_HIERARCHY.indexOf(effectiveRole)
    ) {
      // 角色不足 → 显示 fallback 或 403 无权限页面（不重定向）
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-2">
          <p className="text-lg font-semibold text-destructive">403 - 权限不足</p>
          <p className="text-muted-foreground">您没有权限访问此内容</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
