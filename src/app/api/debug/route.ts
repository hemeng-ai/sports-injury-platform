// Debug: 测试 Supabase 会话状态
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const user = await getUserFromRequest();

  return NextResponse.json({
    authenticated: !!user,
    user: user || null,
    cookies: request.headers.get("cookie")?.substring(0, 200) || "NONE",
  });
}
