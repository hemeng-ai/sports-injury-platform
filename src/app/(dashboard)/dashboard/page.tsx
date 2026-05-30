"use client";

/**
 * Dashboard 首页 — /dashboard
 *
 * v0.2.0: 统计卡片三栏布局 + 数字滚动动画 + Sparkline + 引导区 + 最近活动时间线
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PasswordReminder } from "@/components/auth/PasswordReminder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Upload, Users, FileText, PlusCircle, UserPlus, Clock } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
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

interface Activity {
  id: string;
  type: string;
  description: string;
  user: string;
  role?: string;
  time: string;
}

/** 角色对应头像背景色 */
const ROLE_AVATAR_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-destructive/10 text-destructive",
  ADMIN: "bg-primary/10 text-primary",
  VISITOR: "bg-muted text-muted-foreground",
};

/** 数字滚动动画 hook */
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [target, duration]);

  return value;
}

/** 生成 demo sparkline 数据（模拟历史趋势） */
function generateSparklineData(peak: number, points = 8) {
  return Array.from({ length: points }, (_, i) => ({
    x: i,
    y: Math.max(0, Math.round((Math.sin(i * 0.8) + 1) * peak * 0.5 + Math.random() * peak * 0.3)),
  }));
}

/** 骨架卡片 */
function StatCardSkeleton() {
  return (
    <Card className="pointer-events-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-3 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
            <div className="h-8 w-14 bg-muted rounded" />
            <div className="h-3 w-12 bg-muted rounded" />
          </div>
          <div className="flex-shrink-0 animate-pulse" style={{ width: 80, height: 40 }}>
            <div className="w-full h-full bg-muted rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 统计卡片配置 */
const CARD_CONFIGS: {
  key: keyof DashboardStats;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  trendKey: keyof DashboardStats;
  sparklineColor: string;
}[] = [
  { key: "totalFiles", title: "文件总数", icon: FileText, trendKey: "fileTrend", sparklineColor: "#0EA5E9" },
  { key: "totalIndicators", title: "指标总数", icon: BarChart3, trendKey: "indicatorTrend", sparklineColor: "#F59E0B" },
  { key: "recentUploads", title: "最近上传", icon: Upload, trendKey: "uploadTrend", sparklineColor: "#06B6D4" },
  { key: "totalUsers", title: "用户数", icon: Users, trendKey: "userTrend", sparklineColor: "#38BDF8" },
];

/** 引导卡片配置 */
const GUIDE_CARDS = [
  {
    icon: Upload,
    title: "上传第一个损伤资料文件",
    description: "上传损伤影像、病例报告、文献资料",
    buttonLabel: "立即上传",
    href: "/files",
  },
  {
    icon: PlusCircle,
    title: "创建评估指标体系",
    description: "建立运动损伤评估指标体系",
    buttonLabel: "新建指标",
    href: "/indicators",
  },
  {
    icon: UserPlus,
    title: "邀请团队成员",
    description: "分配角色权限，协作管理",
    buttonLabel: "管理用户",
    href: "/users",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activity"),
      ]);

      if (!statsRes.ok) throw new Error("获取统计数据失败");
      const statsData = await statsRes.json();
      setStats(statsData);

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.activities || []);
      }
    } catch {
      toast.error("获取统计数据失败");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allZero = stats
    ? stats.totalFiles === 0 && stats.totalIndicators === 0 && stats.recentUploads === 0 && stats.totalUsers === 0
    : false;

  return (
    <div className="space-y-6">
      <PasswordReminder />

      {/* ==================== 统计卡片 ==================== */}
      <div className="grid grid-cols-4 gap-4">
        {CARD_CONFIGS.map((config) => (
          loading ? (
            <StatCardSkeleton key={config.key} />
          ) : stats ? (
            <StatCard key={config.key} config={config} stats={stats} />
          ) : null
        ))}
      </div>

      {/* ==================== 引导区（全部为 0 时显示） ==================== */}
      {allZero && (
        <div>
          <h2 className="text-lg font-semibold mt-4 mb-4">快速开始</h2>
          <div className="grid grid-cols-3 gap-4">
            {GUIDE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.href} className="hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={() => router.push(card.href)}>
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{card.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-1">
                      {card.buttonLabel}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== 最近活动 ==================== */}
      <div>
        <h2 className="text-lg font-semibold mt-4 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          最近活动
        </h2>
        {activities.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ROLE_AVATAR_COLORS[act.role || ""] || ROLE_AVATAR_COLORS.VISITOR}`}>
                      <ActivityIcon type={act.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        <span className="font-medium">{act.user}</span>
                        <span className="text-muted-foreground"> {act.description}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatRelativeTime(act.time)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Clock className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">暂无活动记录</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/** 单张统计卡片 */
function StatCard({
  config,
  stats,
}: {
  config: (typeof CARD_CONFIGS)[number];
  stats: DashboardStats;
}) {
  const rawValue = stats[config.key] as number;
  const trend = stats[config.trendKey] as string;
  const animatedValue = useCountUp(rawValue);
  const Icon = config.icon;
  const sparklineData = generateSparklineData(Math.max(rawValue, 5));

  return (
    <Card className="hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          {/* 左侧：图标 + 标题 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{config.title}</span>
            </div>
            <div className="stat-number text-3xl font-bold leading-tight tracking-tight">
              {animatedValue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          </div>

          {/* 右侧：迷你折线图 */}
          <div className="flex-shrink-0" style={{ width: 80, height: 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={config.sparklineColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 活动类型图标 */
function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "upload":
      return <Upload className="h-4 w-4 text-primary" />;
    case "analysis":
      return <BarChart3 className="h-4 w-4 text-warning" />;
    case "user":
      return <Users className="h-4 w-4 text-chart-3" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

/** 相对时间格式化 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} 天前`;
  return new Date(isoString).toLocaleDateString("zh-CN");
}
