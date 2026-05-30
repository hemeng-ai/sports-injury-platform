/**
 * 注册 API — POST /api/auth/register
 * 创建 Supabase Auth 用户 + 本地 User 记录
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}


export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { username, email, password } = body;

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return NextResponse.json({ error: "用户名至少 2 位" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "请输入有效的邮箱" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 检查用户名是否已存在
  const existingUsername = await prisma.user.findUnique({
    where: { username: username.trim() },
  });
  if (existingUsername) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  // 创建 Supabase Auth 用户
  const { data: authData, error: authError } =
    await getSupabaseAdmin().auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // 跳过邮箱验证
      app_metadata: { role: "VISITOR" },
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "注册失败" },
      { status: 500 },
    );
  }

  // 创建本地 User 记录
  const localUser = await prisma.user.create({
    data: {
      username: username.trim(),
      email: normalizedEmail,
      supabaseUserId: authData.user.id,
      role: "VISITOR",
      password: "", // 不再存储密码，由 Supabase 管理
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...userWithoutPassword } = localUser;

  return NextResponse.json({
    user: userWithoutPassword,
    message: "注册成功",
  }, { status: 201 });
}
