// RBAC 角色权限控制工具函数（Task 1.3 完整实现）
import type { UserRole } from "@/types";
import { jwtVerify } from "jose";

/** 角色层级顺序：VISITOR < ADMIN < SUPERADMIN */
const ROLE_HIERARCHY: UserRole[] = ["VISITOR", "ADMIN", "SUPERADMIN"];

/**
 * 基于角色层级比较的权限检查
 * userRole >= requiredRole 即可访问（向下兼容）
 * 纯函数，无副作用
 */
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

/**
 * 检查用户是否至少具有指定角色（与 canAccess 语义相同）
 * 纯函数，无副作用
 */
export function hasMinRole(
  role: UserRole | null | undefined | string,
  minRole: UserRole,
): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY.indexOf(role as UserRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

/**
 * API 路由权限守卫（在 API handler 开头调用）
 * 从 Request cookie 中提取 session token，验证 JWT，检查角色
 *
 * @param request — Web API Request 对象
 * @param minRole — 访问所需的最低角色
 * @returns null 表示通过；Response 表示拒绝（401 未认证 / 403 权限不足）
 */
export async function checkApiPermission(
  request: Request,
  minRole: UserRole,
): Promise<Response | null> {
  // 提取 session token cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const sessionToken =
    cookies["authjs.session-token"] || cookies["__Secure-authjs.session-token"];

  // 无 token → 401 未认证
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: "未登录，请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 验证 JWT
  let payload: { role?: string; sub?: string };
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "default-secret-change-me");
    const result = await jwtVerify(sessionToken, secret);
    payload = result.payload as { role?: string; sub?: string };
  } catch {
    // JWT 验证失败（过期、签名错误等）→ 401
    return new Response(JSON.stringify({ error: "登录已过期，请重新登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 检查角色
  const userRole = payload.role;
  if (!userRole || !canAccess(userRole, minRole)) {
    return new Response(JSON.stringify({ error: "权限不足，无法访问此资源" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 通过
  return null;
}

/**
 * 解析 cookie 字符串为键值对（纯辅助函数）
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;

  cookieHeader.split(";").forEach((pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) {
      result[key] = valueParts.join("=");
    }
  });
  return result;
}
