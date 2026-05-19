// Excel 解析引擎 — 基于 SheetJS (xlsx)
// 用于上传 Excel 后自动解析 Sheet、表头、数据列，识别指标类型
import * as XLSX from "xlsx";
import { readFile, unlink } from "fs/promises";

/** 解析后的单一 Sheet 信息 */
export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
  numericColumns: string[];
  textColumns: string[];
  rowCount: number;
}

/** Excel 解析完整结果 */
export interface ParsedExcel {
  fileName: string;
  sheetNames: string[];
  sheets: ParsedSheet[];
  suggestedIndicatorMappings: SuggestedMapping[];
}

/** 指标映射建议 */
export interface SuggestedMapping {
  columnName: string;
  suggestedCategory: string;
  confidence: "high" | "medium" | "low";
  sampleValues: unknown[];
}

/** 已知指标关键词 → 分类映射 */
const INDICATOR_KEYWORDS: Record<string, string> = {
  // 力量指标
  "lsi": "力量指标",
  "strength": "力量指标",
  "force": "力量指标",
  "torque": "力量指标",
  "peak": "力量指标",
  "quad": "力量指标",
  "hamstring": "力量指标",
  "acl_lsi": "力量指标",
  // 平衡指标
  "ybt": "平衡指标",
  "balance": "平衡指标",
  "sebt": "平衡指标",
  "star": "平衡指标",
  // ROM 指标
  "rom": "ROM指标",
  "range": "ROM指标",
  "flexion": "ROM指标",
  "extension": "ROM指标",
  "motion": "ROM指标",
  // 疼痛指标
  "pain": "疼痛指标",
  "vas": "疼痛指标",
  "nprs": "疼痛指标",
  "score": "疼痛指标",
  "painscore": "疼痛指标",
  // 柔韧性
  "flexibility": "柔韧性指标",
  "stretch": "柔韧性指标",
  // 步态
  "gait": "步态指标",
  "walk": "步态指标",
  "step": "步态指标",
  "stride": "步态指标",
  "cadence": "步态指标",
  // 爆发力
  "power": "爆发力指标",
  "jump": "爆发力指标",
  "hop": "爆发力指标",
  // 关节活动度
  "abduction": "关节活动度",
  "adduction": "关节活动度",
  "rotation": "关节活动度",
};

/**
 * 解析 Excel 文件，返回所有 Sheet 的数据和指标映射建议
 * @param filePath — Excel 文件的本地路径
 * @param originalName — 原始文件名（用于元数据）
 * @returns 解析结果
 */
export async function parseExcelFile(
  filePath: string,
  originalName: string,
): Promise<ParsedExcel> {
  // 读取文件 Buffer
  const buffer = await readFile(filePath);

  // 解析工作簿
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const sheets: ParsedSheet[] = [];
  const allSuggestions: SuggestedMapping[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON（第一行作为表头）
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
    });

    if (rawData.length === 0) {
      sheets.push({
        name: sheetName,
        headers: [],
        rows: [],
        numericColumns: [],
        textColumns: [],
        rowCount: 0,
      });
      continue;
    }

    // 提取表头
    const headers = Object.keys(rawData[0]);

    // 分析每列的数据类型
    const numericColumns: string[] = [];
    const textColumns: string[] = [];

    for (const header of headers) {
      const values = rawData.map((row) => row[header]).filter((v) => v !== null && v !== undefined);

      // 判断数值列：超过 70% 的非空值可以转为数字
      let numericCount = 0;
      for (const v of values) {
        const num = Number(v);
        if (!Number.isNaN(num)) numericCount++;
      }
      const numericRatio = values.length > 0 ? numericCount / values.length : 0;
      if (numericRatio > 0.7) {
        numericColumns.push(header);
      } else {
        textColumns.push(header);
      }

      // 生成指标映射建议
      const lowerHeader = header.toLowerCase().replace(/[\s_-]/g, "");
      const suggestedCategory = guessIndicatorCategory(lowerHeader);

      // 数值列 + 有匹配分类 → 高置信度；数值列 + 无匹配 → 中置信度
      const isNumeric = numericRatio > 0.7;
      const confidence = isNumeric && suggestedCategory !== "其他"
        ? "high"
        : isNumeric
        ? "medium"
        : "low";

      allSuggestions.push({
        columnName: header,
        suggestedCategory,
        confidence,
        sampleValues: values.slice(0, 5),
      });
    }

    sheets.push({
      name: sheetName,
      headers,
      rows: rawData,
      numericColumns,
      textColumns,
      rowCount: rawData.length,
    });
  }

  // 清理临时文件（解析完成后删除上传的 Excel）
  try { await unlink(filePath); } catch { /* 忽略清理错误 */ }

  return {
    fileName: originalName,
    sheetNames: workbook.SheetNames,
    sheets,
    suggestedIndicatorMappings: allSuggestions,
  };
}

/**
 * 根据列名关键词猜测指标分类
 */
function guessIndicatorCategory(columnName: string): string {
  // 精确匹配
  for (const [keyword, category] of Object.entries(INDICATOR_KEYWORDS)) {
    if (columnName.includes(keyword)) {
      return category;
    }
  }
  return "其他";
}

/**
 * 仅解析 Excel 表头（不上传存储），快速预览
 * @param filePath — 文件路径
 * @returns 表头和元信息
 */
export async function previewExcelHeaders(
  filePath: string,
): Promise<{ sheetName: string; headers: string[]; rowCount: number }[]> {
  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  return workbook.SheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { defval: null });
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    return { sheetName: name, headers, rowCount: data.length };
  });
}
