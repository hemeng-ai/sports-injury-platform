// 全局类型定义

/** 用户角色 */
export type UserRole = "VISITOR" | "ADMIN" | "SUPERADMIN";

/** 文件夹类型 */
export type FolderType = "INJURY" | "INDICATOR" | "ANALYSIS";

/** 分析类型 */
export type AnalysisType = "DESCRIPTIVE" | "CORRELATION" | "TREND";

/** 用户信息（不含密码） */
export interface UserInfo {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

/** 文件夹节点 */
export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  type: FolderType;
  children: FolderNode[];
  files?: FileInfo[];
  createdAt: string;
}

/** 文件信息 */
export interface FileInfo {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  tags: string[];
  folderId: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** 指标分类 */
export interface IndicatorCategoryInfo {
  id: string;
  name: string;
  description: string | null;
  indicators: IndicatorInfo[];
}

/** 指标信息 */
export interface IndicatorInfo {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  normalRange: string;
  riskThreshold: string | null;
  testMethod: string | null;
  dataSource: string | null;
  categoryId: string;
}

/** Excel 解析预览 */
export interface ExcelPreview {
  name: string;
  sheets: SheetPreview[];
}

export interface SheetPreview {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

/** 分析请求 / 响应 */
export interface DescriptiveRequest {
  indicatorId: string;
  values: number[];
}

export interface DescriptiveResult {
  mean: number;
  median: number;
  max: number;
  min: number;
  stdDev: number;
  count: number;
  values: number[];
}

export interface CorrelationRequest {
  indicatorA: string;
  valuesA: number[];
  indicatorB: string;
  valuesB: number[];
}

export interface CorrelationResult {
  coefficient: number; // Pearson r
  pValue: number | null;
  significance: "strong" | "moderate" | "weak" | "none";
}

export interface TrendRequest {
  indicatorId: string;
  dataPoints: { date: string; value: number }[];
}

export interface TrendResult {
  slope: number;
  intercept: number;
  rSquared: number;
  trend: "increasing" | "decreasing" | "stable";
}
