// 指标分类 API — GET 列表 / POST 创建
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

/**
 * GET /api/indicators/categories — 获取所有分类
 */

export async function GET(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  const categories = await prisma.indicatorCategory.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { indicators: { where: { deletedAt: null } } } } },
  });

  return NextResponse.json(categories);
}

/**
 * POST /api/indicators/categories — 创建分类
 * Permission: Admin+
 */

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  const body = await request.json();
  const { name, description } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "请输入分类名称" }, { status: 400 });
  }

  try {
    const cat = await prisma.indicatorCategory.create({
      data: { name: name.trim(), description: description || null },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json({ error: "分类可能已存在" }, { status: 409 });
  }
}
