// 指标导出 API — GET /api/indicators/export
// 生成并返回包含所有指标的 Excel 文件（.xlsx）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

/**
 * GET /api/indicators/export — 导出全部指标为 Excel
 * Permission: 所有登录用户
 */
export async function GET(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") || undefined;

  const where: Record<string, unknown> = { deletedAt: null };
  if (categoryId) where.categoryId = categoryId;

  const indicators = await prisma.indicator.findMany({
    where,
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    include: { category: true },
  });

  // 构建 Excel 数据
  const rows = indicators.map((ind) => ({
    "类别": ind.category?.name ?? "-",
    "指标名称": ind.name,
    "描述": ind.description ?? "",
    "单位": ind.unit ?? "",
    "正常范围": ind.normalRange ?? "",
    "风险阈值": ind.riskThreshold ?? "",
    "测试方法": ind.testMethod ?? "",
    "数据来源": ind.dataSource ?? "",
  }));

  // 生成 workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 15 }, // 类别
    { wch: 22 }, // 指标名称
    { wch: 30 }, // 描述
    { wch: 8 },  // 单位
    { wch: 12 }, // 正常范围
    { wch: 12 }, // 风险阈值
    { wch: 20 }, // 测试方法
    { wch: 20 }, // 数据来源
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "指标体系");

  // 在服务端生成 Buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  // 生成文件名（含日期）
  const dateStr = new Date().toISOString().slice(0, 10);
  const categorySuffix = categoryId ? "-filtered" : "";
  const fileName = "indicators-export" + categorySuffix + "-" + dateStr + ".xlsx";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(fileName),
    },
  });
}
