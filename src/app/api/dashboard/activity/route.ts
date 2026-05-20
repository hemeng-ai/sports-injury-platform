// Dashboard 活动时间线 API — GET /api/dashboard/activity
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    // 查询最近 5 条文件记录
    const recentFiles = await prisma.file.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        originalName: true,
        createdAt: true,
        uploader: { select: { username: true } },
      },
    });

    // 查询最近 5 条分析记录
    const recentAnalyses = await prisma.analysisRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    });

    // 查询最近 5 条用户注册
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    // 合并并排序
    const activities: Array<{
      id: string;
      type: string;
      description: string;
      user: string;
      time: string;
    }> = [];

    for (const f of recentFiles) {
      activities.push({
        id: `file-${f.id}`,
        type: "upload",
        description: `上传了文件「${f.originalName}」`,
        user: f.uploader?.username || "未知",
        time: f.createdAt.toISOString(),
      });
    }

    for (const a of recentAnalyses) {
      const typeLabel =
        a.type === "DESCRIPTIVE" ? "描述统计" : a.type === "CORRELATION" ? "相关性分析" : "趋势分析";
      activities.push({
        id: `analysis-${a.id}`,
        type: "analysis",
        description: `完成了${typeLabel}`,
        user: a.user?.username || "未知",
        time: a.createdAt.toISOString(),
      });
    }

    for (const u of recentUsers) {
      activities.push({
        id: `user-${u.id}`,
        type: "user",
        description: `新用户「${u.username}」注册`,
        user: u.username,
        time: u.createdAt.toISOString(),
      });
    }

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({ activities: activities.slice(0, 5) });
  } catch {
    return NextResponse.json({ activities: [] });
  }
}
