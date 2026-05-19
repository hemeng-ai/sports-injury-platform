/**
 * 文件详情 API — GET/DELETE /api/files/[id]
 *
 * Task 1.5: 单个文件查询 + 软删除
 * - GET: 查看文件详情（所有登录用户）
 * - DELETE: 软删除（Admin+）
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

/**
 * GET /api/files/[id] — 获取单个文件信息
 * Permission: 所有登录用户
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const permissionError = await checkApiPermission(request, "VISITOR");
  if (permissionError) return permissionError;

  try {
    const file = await prisma.file.findUnique({
      where: { id: params.id },
    });

    // 文件不存在或已被软删除
    if (!file || file.deletedAt) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error("[GET /api/files/[id]] 查询失败:", error);
    return NextResponse.json({ error: "查询文件信息失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/files/[id] — 软删除文件（设置 deletedAt）
 * Permission: ADMIN+
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const permissionError = await checkApiPermission(request, "ADMIN");
  if (permissionError) return permissionError;

  try {
    // 先检查文件是否存在且未被删除
    const existing = await prisma.file.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "文件不存在或已被删除" }, { status: 404 });
    }

    // 软删除：设置 deletedAt
    await prisma.file.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "文件已删除",
    });
  } catch (error) {
    console.error("[DELETE /api/files/[id]] 删除失败:", error);
    return NextResponse.json({ error: "文件删除失败" }, { status: 500 });
  }
}
