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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(`Supabase admin 配置缺失: URL=${!!url}, KEY=${!!key}`);
    }
    _supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
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
    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.signInWithPassword({
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
    const { error: updateError } = await admin.auth.admin.updateUserById(
      authData.user.id,
      { app_metadata: { role } },
    );
    if (updateError) {
      console.error("[POST /api/auth/login] 角色同步失败:", updateError.message);
    }

    // 5. 返回 session
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
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/auth/login] 登录异常:", errMsg);
    console.error("[POST /api/auth/login] 堆栈:", error instanceof Error ? error.stack : "无堆栈");
    return NextResponse.json(
      { error: "登录服务异常: " + errMsg },
      { status: 500 },
    );
  }
}