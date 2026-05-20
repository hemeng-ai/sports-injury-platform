// RBAC 角色权限控制工具函数
import type { UserRole } from "@/types";
import { getSessionFromRequest } from "@/lib/session";

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

export async function checkApiPermission(
  request: Request,
  minRole: UserRole,
): Promise<Response | null> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return new Response(JSON.stringify({ error: "未登录，请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userRole = session.role as string | undefined;
  if (!userRole || !canAccess(userRole, minRole)) {
    return new Response(JSON.stringify({ error: "权限不足，无法访问此资源" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
