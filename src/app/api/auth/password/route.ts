// 修改密码 API — PUT /api/auth/password
// 通过 Supabase Auth 更新密码
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkApiPermission } from "@/lib/rbac";
import { getUserFromRequest } from "@/lib/session";

export const runtime = "nodejs";

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

export async function PUT(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  const user = await getUserFromRequest();
  if (!user) {
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

  // 通过 Supabase Admin API 更新密码
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(
    user.id,
    { password: newPassword },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "密码已修改" });
}
