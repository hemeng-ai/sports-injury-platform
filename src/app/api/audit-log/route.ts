// 操作审计日志 API — GET /api/audit-log（超级管理员可见）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          target: true,
          targetId: true,
          detail: true,
          createdAt: true,
          user: { select: { username: true } },
        },
      }),
      prisma.auditLog.count(),
    ]);

    return NextResponse.json({
      logs,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json({ logs: [], total: 0, totalPages: 0 });
  }
}
