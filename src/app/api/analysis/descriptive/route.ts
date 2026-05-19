// 描述统计 API — POST /api/analysis/descriptive
import { NextRequest, NextResponse } from "next/server";
import { checkApiPermission } from "@/lib/rbac";
import { calculateDescriptive } from "@/lib/statistics";

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "VISITOR");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { values } = body; // number[]

    if (!Array.isArray(values) || values.length === 0) {
      return NextResponse.json({ error: "请提供数值数组" }, { status: 400 });
    }

    const result = calculateDescriptive(values);
    if (!result) {
      return NextResponse.json({ error: "无法计算统计量" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
