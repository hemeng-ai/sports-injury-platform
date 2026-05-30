"use client";

// 数据分析页面 — 三栏布局：指标选择 | 图表 | 统计结果
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface Indicator {
  id: string;
  name: string;
  unit: string | null;
  category?: { name: string };
}

export default function AnalysisPage() {

  const [, setIndicators] = useState<Indicator[]>([]);
  const [selectedX] = useState("");
  const [selectedY] = useState("");
  const [activeTab, setActiveTab] = useState("descriptive");

  // 分析结果
  const [descriptiveResult, setDescriptiveResult] = useState<Record<string, unknown> | null>(null);
  const [correlationResult, setCorrelationResult] = useState<Record<string, unknown> | null>(null);
  const [trendResult, setTrendResult] = useState<Record<string, unknown> | null>(null);
  const [calculating, setCalculating] = useState(false);

  // 手动数据输入
  const [manualData, setManualData] = useState("");
  const [manualYData, setManualYData] = useState("");

  // 加载指标列表
  useEffect(() => {
    fetch("/api/indicators?limit=100").then((r) => r.json())
      .then((d) => setIndicators(d.indicators || []));
  }, []);

  const parseManualValues = (text: string): number[] => {
    return text.split(/[\s,]+/).map(Number).filter((v) => !Number.isNaN(v) && Number.isFinite(v));
  };

  const runDescriptive = useCallback(async () => {
    const values = parseManualValues(manualData);
    if (values.length === 0) { toast.error("请输入至少一个数值"); return; }
    setCalculating(true);
    try {
      const res = await fetch("/api/analysis/descriptive", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setDescriptiveResult(data);
    } catch { toast.error("计算失败"); }
    setCalculating(false);
  }, [manualData]);

  const runCorrelation = useCallback(async () => {
    let xValues: number[] = [];
    let yValues: number[] = [];

    if (selectedX && manualData) {
      xValues = parseManualValues(manualData);
    }
    if (selectedY && manualYData) {
      yValues = parseManualValues(manualYData);
    }

    if (xValues.length === 0 || yValues.length === 0) {
      toast.error("请输入 X 和 Y 两组数据"); return;
    }
    if (xValues.length !== yValues.length) {
      toast.error("X 和 Y 数据长度必须一致"); return;
    }

    setCalculating(true);
    try {
      const res = await fetch("/api/analysis/correlation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xValues, yValues }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setCorrelationResult(data);
    } catch { toast.error("计算失败"); }
    setCalculating(false);
  }, [manualData, manualYData, selectedX, selectedY]);

  const runTrend = useCallback(async () => {
    const values = parseManualValues(manualData);
    if (values.length < 2) { toast.error("请输入至少 2 个数值"); return; }
    setCalculating(true);
    try {
      const res = await fetch("/api/analysis/trend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setTrendResult(data);
    } catch { toast.error("计算失败"); }
    setCalculating(false);
  }, [manualData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">数据分析</h1>
        <p className="text-sm text-muted-foreground mt-1">描述统计 / 相关性分析 / 趋势分析</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="descriptive">描述统计</TabsTrigger>
          <TabsTrigger value="correlation">相关性分析</TabsTrigger>
          <TabsTrigger value="trend">趋势分析</TabsTrigger>
        </TabsList>

        {/* 描述统计 */}
        <TabsContent value="descriptive" className="mt-4 grid grid-cols-5 gap-6">
          <Card className="col-span-2">
            <CardHeader><CardTitle className="text-lg">数据输入</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>输入数值（空格或逗号分隔）</Label>
                <Input
                  value={manualData}
                  onChange={(e) => setManualData(e.target.value)}
                  placeholder="例如: 85 90 78 92 88"
                />
              </div>
              <Button onClick={runDescriptive} disabled={calculating} className="w-full">
                {calculating ? "计算中..." : "计算描述统计"}
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader><CardTitle className="text-lg">统计结果</CardTitle></CardHeader>
            <CardContent>
              {descriptiveResult ? (
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: "mean", label: "平均值", size: "large" },
                    { key: "max", label: "最大值", size: "small" },
                    { key: "min", label: "最小值", size: "small" },
                    { key: "stdev", label: "标准差", size: "small" },
                    { key: "count", label: "样本数", size: "small" },
                  ] as const).map(({ key, label, size }) => (
                    <div
                      key={key}
                      className={`bg-muted/30 rounded-lg p-4 text-center ${
                        size === "large" ? "col-span-2" : ""
                      }`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className={`font-bold mono-value ${
                        size === "large" ? "text-2xl" : "text-lg"
                      }`}>
                        {typeof descriptiveResult[key] === "number"
                          ? (descriptiveResult[key] as number).toFixed(2)
                          : String(descriptiveResult[key])}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">输入数据后计算结果</p>
              )}
            </CardContent>
          </Card>

          {/* 柱状图 — 带空状态 */}
          <Card className="col-span-5">
            <CardHeader><CardTitle className="text-lg">数据分布</CardTitle></CardHeader>
            <CardContent>
              {descriptiveResult ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(descriptiveResult.values as number[]).map((v, i) => ({ index: i + 1, value: v }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" label={{ value: "序号", position: "bottom" }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg py-16 flex flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">请先在左侧选择指标类别和时间范围</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 相关性分析 */}
        <TabsContent value="correlation" className="mt-4 grid grid-cols-5 gap-6">
          <Card className="col-span-2">
            <CardHeader><CardTitle className="text-lg">数据输入</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>X 轴数据</Label>
                <Input
                  value={manualData}
                  onChange={(e) => setManualData(e.target.value)}
                  placeholder="例如: 85 90 78 92 88"
                />
              </div>
              <div>
                <Label>Y 轴数据</Label>
                <Input
                  value={manualYData}
                  onChange={(e) => setManualYData(e.target.value)}
                  placeholder="例如: 70 80 65 82 76"
                />
              </div>
              <Button onClick={runCorrelation} disabled={calculating} className="w-full">
                {calculating ? "计算中..." : "计算相关性"}
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader><CardTitle className="text-lg">相关性结果</CardTitle></CardHeader>
            <CardContent>
              {correlationResult ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Pearson r</p>
                    <p className={`text-xl font-bold ${Math.abs(correlationResult.coefficient as number) > 0.5 ? "text-green-400" : "text-muted-foreground"}`}>
                      {(correlationResult.coefficient as number).toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">R²</p>
                    <p className="text-xl font-bold">{(correlationResult.rSquared as number).toFixed(4)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">结论</p>
                    <p className="text-lg font-bold">
                      {correlationResult.significant ? "显著性相关" : "相关性较弱"}
                      {(correlationResult.coefficient as number) > 0 ? "（正相关）" : (correlationResult.coefficient as number) < 0 ? "（负相关）" : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">分别输入两组数据后查看相关性</p>
              )}
            </CardContent>
          </Card>

          {/* 散点图 */}
          {correlationResult && (
            <Card className="col-span-5">
              <CardHeader><CardTitle className="text-lg">散点图</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" name="X" />
                    <YAxis dataKey="y" name="Y" />
                    <Tooltip />
                    <Scatter
                      data={correlationResult.points as { x: number; y: number }[]}
                      fill="hsl(var(--primary))"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 趋势分析 */}
        <TabsContent value="trend" className="mt-4 grid grid-cols-5 gap-6">
          <Card className="col-span-2">
            <CardHeader><CardTitle className="text-lg">数据输入</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>时间序列数值</Label>
                <Input
                  value={manualData}
                  onChange={(e) => setManualData(e.target.value)}
                  placeholder="例如: 80 82 85 87 90 92"
                />
              </div>
              <Button onClick={runTrend} disabled={calculating} className="w-full">
                {calculating ? "计算中..." : "计算趋势"}
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader><CardTitle className="text-lg">趋势结果</CardTitle></CardHeader>
            <CardContent>
              {trendResult ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">斜率</p>
                    <p className="text-xl font-bold">{(trendResult.slope as number).toFixed(4)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">R²</p>
                    <p className="text-xl font-bold">{(trendResult.rSquared as number).toFixed(4)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">趋势方向</p>
                    <Badge variant={(trendResult.slope as number) > 0 ? "default" : "destructive"}>
                      {(trendResult.slope as number) > 0 ? "上升趋势 ↑" : "下降趋势 ↓"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">输入时间序列数据后查看趋势</p>
              )}
            </CardContent>
          </Card>

          {/* 趋势折线图 */}
          {trendResult && (
            <Card className="col-span-5">
              <CardHeader><CardTitle className="text-lg">趋势折线图</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" label={{ value: "序号", position: "bottom" }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      data={(trendResult.yValues as number[]).map((y, i) => ({ x: i + 1, y }))}
                      dataKey="y"
                      name="实际值"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      data={trendResult.trendlinePoints as { x: number; y: number }[]}
                      dataKey="y"
                      name="趋势线"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
