// Debug: 测试 session token 解密
import { NextRequest, NextResponse } from "next/server";
import { decryptSessionToken, getSessionFromRequest } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const results: Record<string, unknown> = {};

  // 1. 读取 cookie
  const cookieHeader = request.headers.get("cookie") || "";
  results.cookieHeader = cookieHeader.substring(0, 200);

  // 2. 手动解析
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) cookies[key] = valueParts.join("=");
  });
  const token = cookies["authjs.session-token"] || cookies["__Secure-authjs.session-token"];
  results.tokenFound = !!token;
  results.tokenPreview = token ? token.substring(0, 50) + "..." : "NONE";

  // 3. 测试解密
  if (token) {
    try {
      const payload = await decryptSessionToken(token);
      results.decryptSuccess = !!payload;
      results.payload = payload;
    } catch (e) {
      results.decryptError = (e as Error).message;
    }
  }

  // 4. 测试 getSessionFromRequest
  const session = await getSessionFromRequest(request);
  results.sessionFromRequest = session;

  return NextResponse.json(results);
}
