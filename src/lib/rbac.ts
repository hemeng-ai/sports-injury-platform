// RBAC 角色权限控制
import type { UserRole } from "@/types";
import { getUserFromRequest } from "@/lib/session";

const ROLE_HIERARCHY: UserRole[] = ["VISITOR", "ADMIN", "SUPERADMIN"];

export function canAccess(
  userRole: UserRole | null | undefined | string,
  requiredRole: UserRole | string,
): boolean {
  if (!userRole || !requiredRole) return false;
  const userIndex = ROLE_HIERARCHY.indexOf(userRole as UserRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole as UserRole);
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex >= requiredIndex;
}

export function hasMinRole(
  role: UserRole | null | undefined | string,
  minRole: UserRole,
): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY.indexOf(role as UserRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

/**
 * API Route 权限检查
 * 从 Supabase 会话获取角色，验证是否满足最低权限要求
 */
export async function checkApiPermission(
  request: Request,
  minRole: UserRole,
): Promise<Response | null> {
  const user = await getUserFromRequest();

  if (!user) {
    return new Response(JSON.stringify({ error: "未登录，请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!canAccess(user.role, minRole)) {
    return new Response(JSON.stringify({ error: "权限不足" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
