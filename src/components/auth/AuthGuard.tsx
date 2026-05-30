"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { UserRole } from "@/types";

interface AuthGuardProps {
  children: React.ReactNode;
  minRole?: UserRole;
}

/**
 * 认证守卫 — 检查登录状态和角色权限
 * 未登录 → 跳转 /login
 * 角色不足 → 显示 403 占位
 */
export function AuthGuard({ children, minRole }: AuthGuardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) {
        router.push("/login");
        return;
      }

      if (minRole) {
        const userRole = (user.app_metadata as Record<string, unknown>)?.role as string;
        const hierarchy = ["VISITOR", "ADMIN", "SUPERADMIN"];
        if (hierarchy.indexOf(userRole) < hierarchy.indexOf(minRole)) {
          setAuthorized(false);
          return;
        }
      }

      setAuthorized(true);
    });
  }, [router, supabase, minRole]);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">验证中...</div>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-lg font-semibold text-destructive">403 — 权限不足</p>
        <p className="text-muted-foreground">您没有访问此页面的权限</p>
      </div>
    );
  }

  return <>{children}</>;
}
