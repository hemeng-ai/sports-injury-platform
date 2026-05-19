"use client";

/**
 * Dashboard 首页 — /dashboard
 *
 * 展示 4 张统计卡片：文件总数 / 指标总数 / 最近上传 / 用户数
 */
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Files, BarChart3, Upload, Users } from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  totalFiles: number;
  totalIndicators: number;
  recentUploads: number;
  totalUsers: number;
  fileTrend: string;
  indicatorTrend: string;
  uploadTrend: string;
  userTrend: string;
}

/** 骨架卡片加载占位 */
function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted rounded mb-2" />
        <div className="h-3 w-12 bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

/** 卡片配置 */
const CARD_CONFIGS: {
  key: keyof DashboardStats;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  trendKey: keyof DashboardStats;
}[] = [
  { key: "totalFiles", title: "文件总数", icon: Files, trendKey: "fileTrend" },
  { key: "totalIndicators", title: "指标总数", icon: BarChart3, trendKey: "indicatorTrend" },
  { key: "recentUploads", title: "最近上传", icon: Upload, trendKey: "uploadTrend" },
  { key: "totalUsers", title: "用户数", icon: Users, trendKey: "userTrend" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) {
          throw new Error("获取统计数据失败");
        }
        const data = await res.json();
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          toast.error("获取统计数据失败");
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  // 加载中：显示骨架
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
        {CARD_CONFIGS.map((config) => (
          <StatCardSkeleton key={config.key} />
        ))}
      </div>
    );
  }

  // 无数据时也返回空
  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {CARD_CONFIGS.map((config) => {
        const Icon = config.icon;
        const value = stats[config.key] as number;
        const trend = stats[config.trendKey] as string;

        return (
          <Card key={config.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {config.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {trend}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
