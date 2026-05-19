/**
 * 注册 API — POST /api/auth/register
 *
 * 接收 username/password/role?，默认创建 VISITOR。
 * 仅 SuperAdmin 可以创建 ADMIN 及以上角色用户。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types";

const VALID_ROLES: UserRole[] = ["VISITOR", "ADMIN", "SUPERADMIN"];

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

  const { username, password, role: requestedRole } = body;

  // 参数校验
  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return NextResponse.json(
      { error: "缺少必填字段：username（至少 3 位字符）" },
      { status: 400 }
    );
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "缺少必填字段：password（至少 6 位字符）" },
      { status: 400 }
    );
  }

  // 检查用户名是否已存在
  const existing = await prisma.user.findUnique({
    where: { username: username.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "用户名已存在" },
      { status: 409 }
    );
  }

  // 确定最终角色：默认 VISITOR
  let finalRole: UserRole = "VISITOR";

  if (requestedRole && VALID_ROLES.includes(requestedRole as UserRole)) {
    // 若请求 Admin 或 SuperAdmin，需要当前登录用户为 SuperAdmin
    if ((requestedRole as UserRole) !== "VISITOR") {
      const session = await auth();
      const currentRole = (session?.user as { role?: string } | undefined)
        ?.role as UserRole | undefined;

      if (!currentRole || currentRole !== "SUPERADMIN") {
        // 非 SuperAdmin 尝试创建高权限用户 → 降级为 VISITOR
        finalRole = "VISITOR";
      } else {
        finalRole = requestedRole as UserRole;
      }
    }
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password as string, 12);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      password: hashedPassword,
      role: finalRole,
    },
  });

  // 返回用户信息（不含密码）
  const { password: _pw, ...userWithoutPassword } = user;

  return NextResponse.json(
    {
      user: userWithoutPassword,
      message: "注册成功",
    },
    { status: 201 }
  );
}
