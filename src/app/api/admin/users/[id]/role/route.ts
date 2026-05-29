// 用户角色管理 API — PATCH /api/admin/users/[id]/role
// 仅 SUPERADMIN 可变更其他用户的角色
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";

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

export const runtime = "nodejs";

const ALLOWED_ROLES = ["ADMIN", "VISITOR"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: targetUserId } = await params;

  // 1. 验证请求者身份（必须是 SUPERADMIN）
  const operator = await getUserFromRequest();
  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (operator.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "仅超级管理员可变更用户角色" }, { status: 403 });
  }

  // 2. 解析请求体
  let body: { role?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }
  if (!body.role || !(ALLOWED_ROLES as readonly string[]).includes(body.role)) {
    return NextResponse.json(
      { error: `无效的角色值，允许: ${ALLOWED_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  // 3. 查询目标用户
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, role: true, supabaseUserId: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // 禁止修改自己的角色
  const operatorPrismaUser = await prisma.user.findFirst({
    where: { OR: [{ email: operator.email }, { supabaseUserId: operator.id }] },
    select: { id: true },
  });
  if (targetUserId === operatorPrismaUser?.id) {
    return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
  }

  // 禁止修改其他 SUPERADMIN 的角色
  if (targetUser.role === "SUPERADMIN") {
    return NextResponse.json({ error: "不能修改其他超级管理员的角色" }, { status: 403 });
  }

  if (targetUser.role === body.role) {
    return NextResponse.json({ message: "角色未变更", user: targetUser });
  }

  // 4. 更新 Prisma 中的角色
  const oldRole = targetUser.role;
  const newRole = body.role;

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole as "ADMIN" | "VISITOR" },
      select: { id: true, username: true, role: true, createdAt: true },
    }),
    prisma.auditLog.create({
      data: {
        userId: operatorPrismaUser!.id,
        action: "MODIFY",
        target: "USER",
        targetId: targetUserId,
        detail: `角色变更: ${targetUser.username} (${oldRole} → ${newRole})`,
      },
    }),
  ]);

  // 5. 同步角色到 Supabase app_metadata
  if (targetUser.supabaseUserId) {
    await getSupabaseAdmin().auth.admin.updateUserById(targetUser.supabaseUserId, {
      app_metadata: { role: newRole },
    });
  }

  return NextResponse.json({ message: "角色已更新", user: updatedUser });
}
