import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 路径白名单：无需认证即可访问
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register"];
// 静态资源白名单前缀
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/public"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源放行
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 公开路径放行
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 检查认证 cookie（NextAuth 使用 authjs.session-token）
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // 未登录 → 重定向到登录页
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 匹配所有路径，除了静态资源和 API 路由（API 自行校验）
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
