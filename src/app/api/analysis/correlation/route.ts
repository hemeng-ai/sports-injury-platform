// 相关性分析 API — POST /api/analysis/correlation
import { NextRequest, NextResponse } from "next/server";
import { checkApiPermission } from "@/lib/rbac";
import { calculateCorrelation } from "@/lib/statistics";

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { xValues, yValues } = body;

    if (!Array.isArray(xValues) || !Array.isArray(yValues)) {
      return NextResponse.json({ error: "请提供两组数值数组" }, { status: 400 });
    }
    if (xValues.length !== yValues.length) {
      return NextResponse.json({ error: "两组数据长度不一致" }, { status: 400 });
    }

    const result = calculateCorrelation(xValues, yValues);
    if (!result) {
      return NextResponse.json({ error: "数据不足（至少需要 3 对数据点）" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
