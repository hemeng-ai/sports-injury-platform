import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { canAccess } from "@/lib/rbac";
import type { UserRole } from "@/types";

// 路径白名单：无需认证即可访问
const PUBLIC_PATHS = ["/login"];
// API 白名单前缀（如 /api/auth/*）
const PUBLIC_API_PREFIXES = ["/api/auth/"];
// 公开 API 精确路径
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/register"];
// 静态资源白名单前缀
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/public"];

// 角色路由映射：路径 → 最低角色要求
const ROLE_ROUTES: Record<string, UserRole> = {
  "/users": "SUPERADMIN",
  "/settings": "ADMIN",
};

// 需要 ADMIN+ 角色的 API 前缀
const ADMIN_API_PREFIXES = ["/api/admin/"];

/**
 * 从 cookie 中提取并验证 JWT，返回 payload 或 null
 */
async function verifyToken(
  request: NextRequest,
): Promise<{ role?: string; sub?: string } | null> {
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "default-secret-change-me",
    );
    const { payload } = await jwtVerify(sessionToken, secret);
    return payload as { role?: string; sub?: string };
  } catch {
    return null;
  }
}

/**
 * 检查路径是否匹配白名单
 */
function isPublicPath(pathname: string): boolean {
  // 精确匹配
  if (PUBLIC_PATHS.some((p) => pathname === p)) return true;
  // /api/auth/* 前缀匹配
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

/**
 * 检查是否为 API 路由
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * 检查是否为公开 API 路由
 */
function isPublicApi(pathname: string): boolean {
  // 精确匹配
  if (PUBLIC_API_PATHS.some((p) => pathname === p)) return true;
  // /api/auth/* 前缀匹配
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源放行
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 公开路径放行
  if (isPublicPath(pathname)) {
    // 特殊情况：已登录用户访问 /login → 重定向到 /dashboard
    if (pathname === "/login") {
      const payload = await verifyToken(request);
      if (payload?.role) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // ---- 以下为受保护路径 ----

  // 验证 token
  const payload = await verifyToken(request);

  // 未登录
  if (!payload || !payload.role) {
    // API 路由 → 返回 401 JSON
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "未登录，请先登录" }, { status: 401 });
    }
    // 页面路由 → 重定向到 /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = payload.role as UserRole;

  // 检查角色路由守卫（页面级）
  for (const [routePrefix, requiredRole] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!canAccess(userRole, requiredRole)) {
        // 角色不足 → 重定向到 /login（中间件层无法渲染 403 页面，由 AuthGuard 处理）
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  // 检查 API 角色守卫
  if (isApiRoute(pathname) && !isPublicApi(pathname)) {
    // 检查是否需要 ADMIN 权限
    for (const adminPrefix of ADMIN_API_PREFIXES) {
      if (pathname.startsWith(adminPrefix)) {
        if (!canAccess(userRole, "ADMIN")) {
          return NextResponse.json({ error: "权限不足" }, { status: 403 });
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // 匹配所有路径，除了静态资源和内部 Next.js 路径
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
