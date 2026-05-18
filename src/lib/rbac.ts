// RBAC 角色权限控制工具函数（Task 1.3 完整实现）
import type { UserRole } from "@/types";

/** 权限操作类型 */
export type RbacAction = "read" | "write" | "delete" | "manage_users";

/** 角色 → 允许的操作映射 */
const ROLE_PERMISSIONS: Record<UserRole, RbacAction[]> = {
  VISITOR: ["read"],
  ADMIN: ["read", "write", "delete"],
  SUPERADMIN: ["read", "write", "delete", "manage_users"],
};

/**
 * 检查用户是否有权限执行指定操作
 */
export function canAccess(role: UserRole | null | undefined, action: RbacAction): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

/**
 * 检查用户是否至少具有指定角色
 */
export function hasMinRole(
  role: UserRole | null | undefined,
  minRole: UserRole
): boolean {
  if (!role) return false;
  const roleHierarchy: UserRole[] = ["VISITOR", "ADMIN", "SUPERADMIN"];
  return roleHierarchy.indexOf(role) >= roleHierarchy.indexOf(minRole);
}

/**
 * API 路由权限守卫（在 API handler 开头调用）
 * 返回 null 表示通过，返回 Response 表示拒绝
 */
export function guardRole(
  role: UserRole | null | undefined,
  action: RbacAction
): Response | null {
  if (!canAccess(role, action)) {
    return new Response(JSON.stringify({ error: "无权限执行此操作" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
