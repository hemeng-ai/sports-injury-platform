// 修改密码 API — PUT /api/auth/password
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function PUT(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  // 从 session cookie 获取用户 ID
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "无法识别用户身份" }, { status: 401 });
  }

  const body = await request.json();
  const { oldPassword, newPassword } = body;

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "请输入旧密码和新密码" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // 验证旧密码
  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "原密码错误" }, { status: 403 });
  }

  // 更新密码
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });

  return NextResponse.json({ success: true, message: "密码已修改" });
}

async function getUserId(request: Request): Promise<string | null> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:authjs\.session-token|__Secure-authjs\.session-token)=([^;]+)/);
  if (!match) return null;
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "default-secret-change-me");
    const { payload } = await jwtVerify(match[1], secret);
    return (payload as { sub?: string }).sub || null;
  } catch { return null; }
}
