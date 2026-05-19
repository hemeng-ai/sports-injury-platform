// 统计分析工具 — Excel 原生统计逻辑
// 实现：描述统计、Pearson 相关性、简单线性趋势

/** 描述统计结果 */
export interface DescriptiveStats {
  mean: number;
  max: number;
  min: number;
  stdev: number;
  count: number;
  sum: number;
  values: number[];
}

/** 相关性分析结果 */
export interface CorrelationResult {
  method: "pearson";
  coefficient: number; // r 值 (-1 ~ 1)
  rSquared: number;    // R² 值
  xValues: number[];
  yValues: number[];
  points: { x: number; y: number }[];
  significant: boolean; // |r| > 0.5 视为有意义
}

/** 趋势分析结果 */
export interface TrendResult {
  slope: number;
  intercept: number;
  trendlinePoints: { x: number; y: number }[];
  xValues: number[];
  yValues: number[];
  rSquared: number;
}

/** 计算描述统计 */
export function calculateDescriptive(values: number[]): DescriptiveStats | null {
  if (!values || values.length === 0) return null;

  const nums = values.filter((v) => !Number.isNaN(v) && Number.isFinite(v));
  if (nums.length === 0) return null;

  const count = nums.length;
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const max = Math.max(...nums);
  const min = Math.min(...nums);

  const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (count - 1);
  const stdev = Math.sqrt(variance);

  return { mean, max, min, stdev, count, sum, values: nums };
}

/** Pearson 相关系数（类似 Excel CORREL / PEARSON） */
export function calculateCorrelation(
  xValues: number[],
  yValues: number[],
): CorrelationResult | null {
  if (xValues.length !== yValues.length || xValues.length < 3) return null;

  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
  const sumY2 = yValues.reduce((acc, y) => acc + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return null;

  const r = numerator / denominator;
  const rSquared = r * r;

  const points = xValues.map((x, i) => ({ x, y: yValues[i] }));

  return {
    method: "pearson",
    coefficient: Math.round(r * 10000) / 10000,
    rSquared: Math.round(rSquared * 10000) / 10000,
    xValues, yValues, points,
    significant: Math.abs(r) > 0.5,
  };
}

/** 简单线性趋势（最小二乘法，类似 Excel TREND） */
export function calculateTrend(values: number[]): TrendResult | null {
  if (!values || values.length < 2) return null;

  const nums = values.filter((v) => !Number.isNaN(v) && Number.isFinite(v));
  if (nums.length < 2) return null;

  const xValues = nums.map((_, i) => i + 1); // 时间索引 1, 2, 3...
  const n = nums.length;

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = nums.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * nums[i], 0);
  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // 计算 R²
  const meanY = sumY / n;
  const ssRes = nums.reduce((acc, y, i) => acc + (y - (slope * xValues[i] + intercept)) ** 2, 0);
  const ssTot = nums.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  const trendlinePoints = xValues.map((x) => ({
    x,
    y: Math.round((slope * x + intercept) * 10000) / 10000,
  }));

  return {
    slope: Math.round(slope * 10000) / 10000,
    intercept: Math.round(intercept * 10000) / 10000,
    trendlinePoints,
    xValues,
    yValues: nums,
    rSquared: Math.round(rSquared * 10000) / 10000,
  };
}

/** 从 JSON 数组中提取指定列的数值 */
export function extractColumn(data: Record<string, unknown>[], column: string): number[] {
  return data.map((row) => {
    const v = row[column];
    return typeof v === "number" ? v : Number(v);
  }).filter((v) => !Number.isNaN(v) && Number.isFinite(v));
}
