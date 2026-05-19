// 文件夹管理 API — GET 树 / POST 创建
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

/**
 * GET /api/folders — 获取完整文件夹树
 * 返回指定类型的嵌套树结构
 * Permission: 所有登录用户
 */
export async function GET(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") as string) || undefined;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;

  // 一次性查所有文件夹，在内存中构建树
  const folders = await prisma.folder.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { files: { where: { deletedAt: null } } } } },
  });

  // 构建树：先建 Map，再组织父子关系
  const map = new Map<string, Record<string, unknown>>();
  const roots: Record<string, unknown>[] = [];

  for (const f of folders) {
    map.set(f.id, {
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      type: f.type,
      sortOrder: f.sortOrder,
      fileCount: f._count.files,
      createdAt: f.createdAt,
      children: [],
    });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      const parent = map.get(f.parentId)!;
      (parent.children as unknown[]).push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json(roots);
}

/**
 * POST /api/folders — 创建文件夹
 * Body: { name, parentId?, type }
 * Permission: Admin+
 */
export async function POST(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, parentId, type } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "请输入文件夹名称" }, { status: 400 });
    }

    // 计算当前层级最大 sortOrder
    const maxOrder = await prisma.folder.findFirst({
      where: { parentId: parentId || null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        type: type || "INJURY",
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("[POST /api/folders] 创建失败:", error);
    return NextResponse.json({ error: "创建文件夹失败" }, { status: 500 });
  }
}
