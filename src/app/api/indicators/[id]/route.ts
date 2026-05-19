// 指标操作 API — GET / PUT / DELETE /api/indicators/[id]
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

/**
 * GET /api/indicators/[id] — 获取单个指标
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  const { id } = await params;
  const indicator = await prisma.indicator.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!indicator || indicator.deletedAt) {
    return NextResponse.json({ error: "指标不存在" }, { status: 404 });
  }
  return NextResponse.json(indicator);
}

/**
 * PUT /api/indicators/[id] — 编辑指标
 * Permission: Admin+
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  const { id } = await params;
  const existing = await prisma.indicator.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "指标不存在" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, unit, normalRange, riskThreshold, testMethod, dataSource, categoryId } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name?.trim();
  if (description !== undefined) data.description = description;
  if (unit !== undefined) data.unit = unit;
  if (normalRange !== undefined) data.normalRange = normalRange;
  if (riskThreshold !== undefined) data.riskThreshold = riskThreshold;
  if (testMethod !== undefined) data.testMethod = testMethod;
  if (dataSource !== undefined) data.dataSource = dataSource;
  if (categoryId !== undefined) data.categoryId = categoryId;

  const updated = await prisma.indicator.update({
    where: { id },
    data,
    include: { category: true },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/indicators/[id] — 软删除指标
 * Permission: Admin+
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  const { id } = await params;
  const existing = await prisma.indicator.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "指标不存在" }, { status: 404 });
  }

  await prisma.indicator.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
