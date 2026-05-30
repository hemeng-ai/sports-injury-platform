// Dashboard 统计数据 — 由中间件保证认证，此处直接查数据库
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface DashboardStats {
  totalFiles: number;
  totalIndicators: number;
  recentUploads: number;
  totalUsers: number;
  fileTrend: string;
  indicatorTrend: string;
  uploadTrend: string;
  userTrend: string;
}

export async function handleGet(): Promise<Response> {
  try {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const thisWeekStart = new Date(now - week);
    const lastWeekStart = new Date(now - 2 * week);
    const lastWeekEnd = new Date(now - week);

    const [
      totalFiles, totalIndicators, totalUsers,
      recentUploads, lastWeekFiles,
      thisWeekIndicators, lastWeekIndicators,
      thisWeekUsers, lastWeekUsers,
    ] = await Promise.all([
      prisma.file.count({ where: { deletedAt: null } }),
      prisma.indicator.count({ where: { deletedAt: null } }),
      prisma.user.count(),
      prisma.file.count({ where: { deletedAt: null, createdAt: { gte: thisWeekStart } } }),
      prisma.file.count({ where: { deletedAt: null, createdAt: { gte: lastWeekStart, lt: lastWeekEnd } } }),
      prisma.indicator.count({ where: { deletedAt: null, createdAt: { gte: thisWeekStart } } }),
      prisma.indicator.count({ where: { deletedAt: null, createdAt: { gte: lastWeekStart, lt: lastWeekEnd } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeekStart } } }),
      prisma.user.count({ where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } } }),
    ]);

    const calcTrend = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const pct = Math.round(((current - previous) / previous) * 100);
      return pct >= 0 ? "+" + pct + "%" : pct + "%";
    };

    const stats: DashboardStats = {
      totalFiles,
      totalIndicators,
      recentUploads,
      totalUsers,
      fileTrend: calcTrend(recentUploads, lastWeekFiles),
      indicatorTrend: calcTrend(thisWeekIndicators, lastWeekIndicators),
      uploadTrend: calcTrend(recentUploads, lastWeekFiles),
      userTrend: calcTrend(thisWeekUsers, lastWeekUsers),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[dashboard-stats] 查询失败:", error);
    return NextResponse.json({
      totalFiles: 0, totalIndicators: 0, recentUploads: 0, totalUsers: 0,
      fileTrend: "0%", indicatorTrend: "0%", uploadTrend: "0%", userTrend: "0%",
    });
  }
}