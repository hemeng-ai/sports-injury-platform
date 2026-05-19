// 指标体系 API — GET 列表 / POST 创建
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

/**
 * GET /api/indicators — 获取指标列表
 * Query: ?categoryId=&search=&page=&limit=
 * Permission: 所有登录用户
 */

export async function GET(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const where: Record<string, unknown> = { deletedAt: null };

  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [indicators, total] = await Promise.all([
    prisma.indicator.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true },
    }),
    prisma.indicator.count({ where }),
  ]);

  return NextResponse.json({ indicators, total, page, limit, totalPages: Math.ceil(total / limit) });
}

/**
 * POST /api/indicators — 创建指标
 * Permission: Admin+
 */

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, description, unit, normalRange, riskThreshold, testMethod, dataSource, categoryId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "请输入指标名称" }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "请选择指标分类" }, { status: 400 });
    }

    const indicator = await prisma.indicator.create({
      data: {
        name: name.trim(),
        description: description || null,
        unit: unit || null,
        normalRange: normalRange || null,
        riskThreshold: riskThreshold || null,
        testMethod: testMethod || null,
        dataSource: dataSource || null,
        categoryId,
      },
      include: { category: true },
    });

    return NextResponse.json(indicator, { status: 201 });
  } catch (error) {
    console.error("[POST /api/indicators] 创建失败:", error);
    return NextResponse.json({ error: "创建指标失败" }, { status: 500 });
  }
}
