// 文件夹操作 API — PUT / DELETE /api/folders/[id]
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

/**
 * PUT /api/folders/[id] — 更新文件夹（重命名 / 移动 / 排序）
 * Permission: Admin+
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, parentId, sortOrder } = body;

    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "文件夹不存在" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name?.trim();
    if (parentId !== undefined) data.parentId = parentId || null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const updated = await prisma.folder.update({ where: { id }, data });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/folders/[id]] 更新失败:", error);
    return NextResponse.json({ error: "更新文件夹失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/folders/[id] — 删除文件夹（级联删除子文件夹 + 文件）
 * Permission: Admin+
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  try {
    const { id } = await params;

    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "文件夹不存在" }, { status: 404 });
    }

    // 获取所有子文件夹 ID（递归）
    const allFolderIds = await getAllDescendantIds(id);

    // 软删除所有子文件夹中的文件
    await prisma.file.updateMany({
      where: { folderId: { in: allFolderIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // 删除所有子文件夹
    await prisma.folder.deleteMany({
      where: { id: { in: allFolderIds } },
    });

    return NextResponse.json({ success: true, message: `已删除文件夹及其 ${allFolderIds.length - 1} 个子文件夹` });
  } catch (error) {
    console.error("[DELETE /api/folders/[id]] 删除失败:", error);
    return NextResponse.json({ error: "删除文件夹失败" }, { status: 500 });
  }
}

/** 递归获取某个文件夹的所有子孙文件夹 ID */
async function getAllDescendantIds(folderId: string): Promise<string[]> {
  const result: string[] = [folderId];
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });
  for (const child of children) {
    const subIds = await getAllDescendantIds(child.id);
    result.push(...subIds);
  }
  return result;
}
