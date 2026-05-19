// Dashboard 统计数据处理 — 供 API route 和测试使用
import { NextResponse } from "next/server";

export interface DashboardStats {
  totalFiles: number;
  totalIndicators: number;
  recentUploads: number;
  totalUsers: number;
  fileTrend: string;
  indicatorTrend: string;
  uploadTrend: string;
  userTrend: string;
}

export type JwtVerifyFn = (token: string, secret: Uint8Array) => Promise<{
  payload: { role?: string; sub?: string };
}>;

async function defaultJwtVerify(
  token: string,
  secret: Uint8Array,
): Promise<{ payload: { role?: string; sub?: string } }> {
  const { jwtVerify } = await import("jose");
  return jwtVerify(token, secret);
}

async function getSessionFromCookies(
  request: Request,
  _jwtVerify?: JwtVerifyFn,
): Promise<{ role?: string; sub?: string } | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) cookies[key] = valueParts.join("=");
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
