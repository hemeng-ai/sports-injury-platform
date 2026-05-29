/**
 * 登录 API — POST /api/auth/login
 * 使用 Supabase Auth + 自定义角色同步
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

  const { email, password } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  // 1. Supabase Auth 登录
  const { data: authData, error: authError } =
    await getSupabaseAdmin().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "邮箱或密码不正确" },
      { status: 401 },
    );
  }

  // 2. 查找本地 User 记录获取角色
  const localUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.trim().toLowerCase() },
        { supabaseUserId: authData.user.id },
      ],
    },
  });

  const role = localUser?.role || "VISITOR";

  // 3. 确保 supabaseUserId 关联
  if (localUser && !localUser.supabaseUserId) {
    await prisma.user.update({
      where: { id: localUser.id },
      data: { supabaseUserId: authData.user.id },
    });
  }

  // 4. 同步角色到 app_metadata
  await getSupabaseAdmin().auth.admin.updateUserById(authData.user.id, {
    app_metadata: { role },
  });

  // 5. 返回 session（access_token + refresh_token 让客户端设置 cookie）
  return NextResponse.json({
    user: {
      id: localUser?.id || authData.user.id,
      email: authData.user.email,
      username: localUser?.username || email.split("@")[0],
      role,
    },
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
    },
    message: "登录成功",
  });
}
