import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase-middleware";

// 路径白名单：无需认证即可访问
const PUBLIC_PATHS = ["/login"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/public"];

// 角色路由映射：路径 → 最低角色要求
const ROLE_ROUTES: Record<string, string> = {
  "/users": "SUPERADMIN",
  "/settings": "ADMIN",
};
const ADMIN_API_PREFIXES = ["/api/admin/"];

const ROLE_HIERARCHY = ["VISITOR", "ADMIN", "SUPERADMIN"];

function hasMinRole(userRole: string | undefined, required: string): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(required);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源放行
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return updateSession(request).response;
  }

  // 获取 Supabase 会话
  const { supabase, response } = updateSession(request);
  const { data: { user } } = await supabase.auth.getUser();

  const isApi = pathname.startsWith("/api/");
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  // 公开路径直接放行（已登录用户访问 /login 重定向到 /dashboard）
  if (isPublic) {
    if (pathname === "/login" && user) {
      return Response.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // 受保护路径：未登录处理
  if (!user) {
    if (isApi) {
      return Response.json({ error: "未登录，请先登录" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // 角色检查
  const userRole = (user.app_metadata as Record<string, unknown>)?.role as string | undefined;

  // 页面级角色守卫
  for (const [routePrefix, requiredRole] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!hasMinRole(userRole, requiredRole)) {
        return Response.redirect(new URL("/login", request.url));
      }
    }
  }

  // API 管理员前缀守卫
  if (isApi) {
    for (const adminPrefix of ADMIN_API_PREFIXES) {
      if (pathname.startsWith(adminPrefix)) {
        if (!hasMinRole(userRole, "ADMIN")) {
          return Response.json({ error: "权限不足" }, { status: 403 });
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
