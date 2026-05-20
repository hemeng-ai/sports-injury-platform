// Dashboard 统计数据处理 — 供 API route 和测试使用
//
// 注意：JWT 解密统一使用 @auth/core/jwt 的 decode()，禁止自定义 HKDF 派生。
// 详细原理见 src/lib/session.ts 顶部注释。
import { NextResponse } from "next/server";
import { decode } from "@auth/core/jwt";

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

export type JwtVerifyFn = (token: string) => Promise<Record<string, unknown> | null>;

async function defaultJwtVerify(
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const payload = await decode({
      token,
      secret: process.env.AUTH_SECRET!,
      salt: "authjs.session-token",
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getSessionFromCookies(
  request: Request,
  _jwtDecrypt?: JwtVerifyFn,
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

  const verify = _jwtDecrypt || defaultJwtVerify;
  const payload = await verify(sessionToken);
  return payload as { role?: string; sub?: string } | null;
}

export async function handleGet(
  request: Request,
  jwtDecryptFn?: JwtVerifyFn,
): Promise<Response> {
  const session = await getSessionFromCookies(request, jwtDecryptFn);
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
