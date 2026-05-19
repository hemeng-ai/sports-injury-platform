/**
 * 登录 API — POST /api/auth/login
 *
 * 接收 username/password，bcrypt 验证后返回用户信息（不含密码）。
 * Session 建立由前端调用 NextAuth signIn("credentials") 完成。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "请求体格式错误，需要合法 JSON" },
      { status: 400 }
    );
  }

  const { username, password } = body;

  // 参数校验
  if (!username || typeof username !== "string" || username.trim().length === 0) {
    return NextResponse.json(
      { error: "缺少必填字段：username" },
      { status: 400 }
    );
  }

  if (!password || typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { error: "缺少必填字段：password" },
      { status: 400 }
    );
  }

  // 查询用户
  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  if (!user) {
    return NextResponse.json(
      { error: "用户名或密码错误" },
      { status: 401 }
    );
  }

  // 验证密码
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return NextResponse.json(
      { error: "用户名或密码错误" },
      { status: 401 }
    );
  }

  // 返回用户信息（不含密码）
  const { password: _pw, ...userWithoutPassword } = user;

  return NextResponse.json(
    {
      user: userWithoutPassword,
      message: "登录成功",
    },
    { status: 200 }
  );
}
