/**
 * GET /api/dashboard/stats
 * 返回仪表盘统计数据（当前阶段返回模拟数据）
 */
import { NextResponse } from "next/server";

/** Dashboard 统计数据 */
interface DashboardStats {
  totalFiles: number;
  totalIndicators: number;
  recentUploads: number;
  totalUsers: number;
  fileTrend: string;
  indicatorTrend: string;
  uploadTrend: string;
  userTrend: string;
}

/** jwtVerify 函数签名（依赖注入接口，方便测试） */
type JwtVerifyFn = (token: string, secret: Uint8Array) => Promise<{
  payload: { role?: string; sub?: string };
}>;

/** 默认的 jwtVerify 实现（懒加载，避免 jsdom 环境报错） */
async function defaultJwtVerify(
  token: string,
  secret: Uint8Array,
): Promise<{ payload: { role?: string; sub?: string } }> {
  // 懒加载 jose（它依赖 TextEncoder，jsdom 中不可用）
  const { jwtVerify } = await import("jose");
  return jwtVerify(token, secret);
}

/**
 * 从 cookie 中提取 session token 并验证 JWT
 */
async function getSessionFromCookies(
  request: Request,
  _jwtVerify?: JwtVerifyFn,
): Promise<{ role?: string; sub?: string } | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};

  cookieHeader.split(";").forEach((pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) {
      cookies[key] = valueParts.join("=");
    }
  });

  const sessionToken =
    cookies["authjs.session-token"] || cookies["__Secure-authjs.session-token"];

  if (!sessionToken) return null;

  const verify = _jwtVerify || defaultJwtVerify;

  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "default-secret-change-me",
    );
    const { payload } = await verify(sessionToken, secret);
    return payload as { role?: string; sub?: string };
  } catch {
    return null;
  }
}

/**
 * 内部处理器（依赖注入版本，方便测试）
 */
export async function handleGet(
  request: Request,
  jwtVerifyFn?: JwtVerifyFn,
): Promise<Response> {
  const session = await getSessionFromCookies(request, jwtVerifyFn);

  if (!session) {
    return NextResponse.json({ error: "未登录，请先登录" }, { status: 401 });
  }

  const stats: DashboardStats = {
    totalFiles: 0,
    totalIndicators: 0,
    recentUploads: 0,
    totalUsers: 0,
    fileTrend: "+0%",
    indicatorTrend: "+0%",
    uploadTrend: "+0%",
    userTrend: "+0%",
  };

  return NextResponse.json(stats);
}

/**
 * Next.js Route Handler（公开接口）
 */
export async function GET(request: Request): Promise<Response> {
  return handleGet(request);
}
