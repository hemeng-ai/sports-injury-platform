// 趋势分析 API — POST /api/analysis/trend
import { NextRequest, NextResponse } from "next/server";
import { checkApiPermission } from "@/lib/rbac";
import { calculateTrend } from "@/lib/statistics";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { values } = body;

    if (!Array.isArray(values) || values.length < 2) {
      return NextResponse.json({ error: "请提供至少 2 个数值" }, { status: 400 });
    }

    const result = calculateTrend(values);
    if (!result) {
      return NextResponse.json({ error: "无法计算趋势" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
