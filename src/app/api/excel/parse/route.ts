// Excel 解析 API — POST /api/excel/parse
import { NextRequest, NextResponse } from "next/server";
import { checkApiPermission } from "@/lib/rbac";
import { parseExcelFile } from "@/lib/excel-parser";
import { prisma } from "@/lib/prisma";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "excel");

await mkdir(UPLOAD_DIR, { recursive: true });

/**
 * POST /api/excel/parse — 上传并解析 Excel 文件
 * 返回 Sheet 结构、数据预览、指标映射建议
 * Permission: Admin+
 */
export async function POST(request: NextRequest): Promise<Response> {
  const authError = await checkApiPermission(request, "ADMIN");
  if (authError) return authError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析表单数据" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: "未提供文件" }, { status: 400 });
  }

  // 校验文件类型
  const validTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (!validTypes.includes(fileEntry.type)) {
    return NextResponse.json({ error: "仅支持 .xls / .xlsx 格式" }, { status: 400 });
  }

  // 保存到临时文件
  const ext = fileEntry.name.endsWith(".xls") && !fileEntry.name.endsWith(".xlsx") ? ".xls" : ".xlsx";
  const tempName = `${uuidv4()}${ext}`;
  const tempPath = path.join(UPLOAD_DIR, tempName);

  try {
    const bytes = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { writeFile } = await import("fs/promises");
    await writeFile(tempPath, buffer);

    // 解析 Excel
    const result = await parseExcelFile(tempPath, fileEntry.name);

    // 记录已解析的 Excel 文件
    await prisma.excelFile.create({
      data: {
        name: fileEntry.name,
        path: tempPath,
        sheetCount: result.sheetNames.length,
        uploadedBy: "user",
      },
    });

    return NextResponse.json({
      ...result,
      // 过滤：只返回高和中置信度的建议
      suggestedIndicatorMappings: result.suggestedIndicatorMappings.filter(
        (s) => s.confidence !== "low",
      ),
    });
  } catch (error) {
    console.error("[POST /api/excel/parse] 解析失败:", error);
    // 清理临时文件
    try { await unlink(tempPath); } catch { /* ignore */ }
    return NextResponse.json({ error: "Excel 解析失败，请确认文件格式正确" }, { status: 500 });
  }
}
