import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase-middleware";

// ==================== 路径配置 ====================

const PUBLIC_PATHS = ["/login"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/public"];

const ROLE_ROUTES: Record<string, string> = {
  "/users": "SUPERADMIN",
  "/settings": "ADMIN",
};
const ADMIN_API_PREFIXES = ["/api/admin/"];

const ROLE_HIERARCHY = ["VISITOR", "ADMIN", "SUPERADMIN"];

// ==================== 角色工具 ====================

function hasMinRole(userRole: string | undefined, required: string): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(required);
}

// ==================== IP 白名单 ====================

/** 从请求中提取真实客户端 IP */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for 格式: "client, proxy1, proxy2"
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1"; // 本地开发默认
}

/** 判断 IP 是否匹配 CIDR（支持 /32 单个 IP 和子网） */
function ipMatchesCidr(ip: string, cidr: string): boolean {
  if (cidr === ip) return true;
  if (!cidr.includes("/")) return false;

  const [rangeIp, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);

  const ipToNum = (addr: string): number =>
    addr.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;

  return (ipToNum(ip) & mask) === (ipToNum(rangeIp) & mask);
}

/** 检查 IP 是否在白名单中 */
function isIpAllowed(ip: string, allowlist: string): boolean {
  // 本地开发环境始终放行
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;

  const entries = allowlist
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    // 未配置白名单 => 仅在本地开发时放行
    return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
  }

  return entries.some((entry) => ipMatchesCidr(ip, entry));
}

/** 判断当前路径是否需要 IP 白名单保护 */
function isAdminRoute(pathname: string): boolean {
  // 页面级管理路由
  for (const routePrefix of Object.keys(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) return true;
  }
  // API 管理员路由
  for (const prefix of ADMIN_API_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

// ==================== 中间件主逻辑 ====================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源放行
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return updateSession(request).response;
  }

  // ---------- IP 白名单检查（管理员路由最先拦截，无需查询数据库）----------
  if (isAdminRoute(pathname)) {
    const clientIp = getClientIp(request);
    const allowlist = process.env.ALLOWED_ADMIN_IPS || "";
    if (!isIpAllowed(clientIp, allowlist)) {
      const isApi = pathname.startsWith("/api/");
      if (isApi) {
        return Response.json({ error: "IP 不在白名单中" }, { status: 403 });
      }
      return Response.json({ error: "IP 不在白名单中" }, { status: 403 });
    }
  }

  // 获取 Supabase 会话
  const { supabase, response } = updateSession(request);
  const { data: { user } } = await supabase.auth.getUser();

  const isApi = pathname.startsWith("/api/");
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  // 公开路径直接放行
  if (isPublic) {
    if (pathname === "/login" && user) {
      return Response.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // 未登录处理
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

  for (const [routePrefix, requiredRole] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!hasMinRole(userRole, requiredRole)) {
        return Response.redirect(new URL("/login", request.url));
      }
    }
  }

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