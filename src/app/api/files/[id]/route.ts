// 文件详情 API —— GET/DELETE /api/files/[id]
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";
import { removeFile } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const permissionError = await checkApiPermission(request, "VISITOR");
  if (permissionError) return permissionError;

  const { id } = await params;

  try {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file || file.deletedAt) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }
    return NextResponse.json(file);
  } catch (error) {
    console.error("[GET /api/files/[id]] 查询失败:", error);
    return NextResponse.json({ error: "查询文件信息失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const permissionError = await checkApiPermission(request, "ADMIN");
  if (permissionError) return permissionError;

  const { id } = await params;

  try {
    const existing = await prisma.file.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "文件不存在或已被删除" }, { status: 404 });
    }

    // 软删除数据库记录
    await prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 同步清理 Supabase Storage 中的文件
    await removeFile(existing.path).catch((e) => {
      console.error("[DELETE /api/files/[id]] Storage清理失败:", e);
    });

    return NextResponse.json({ success: true, message: "文件已删除" });
  } catch (error) {
    console.error("[DELETE /api/files/[id]] 删除失败:", error);
    return NextResponse.json({ error: "文件删除失败" }, { status: 500 });
  }
}