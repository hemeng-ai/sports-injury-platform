// 文件上传工具函数
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * 允许上传的 MIME 类型白名单
 * 仅限文档（Word/Excel/PDF）和图片（JPEG/PNG/WebP），禁止可执行文件和脚本
 */
export const ALLOWED_MIME_TYPES = [
  // 文档
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // 图片
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * 最大文件大小：50MB
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * 验证文件类型是否在允许列表中
 * @param mimeType — 文件的 MIME 类型字符串
 * @returns 允许返回 true，否则返回 false
 */
export function validateFileType(mimeType: string): boolean {
  if (!mimeType || typeof mimeType !== "string") return false;
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * 格式化文件大小（B → KB/MB/GB，保留一位小数）
 * @param bytes — 文件大小（字节数）
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || !Number.isFinite(bytes)) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // B 级别不显示小数位，KB/MB/GB 保留一位小数
  const formatted = unitIndex === 0 ? size.toString() : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

/**
 * 生成唯一文件名（UUID + 原始扩展名）
 * @param originalName — 原始文件名
 * @returns 唯一文件名，如 "abc-123.pdf"
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  return `${uuidv4()}${ext}`;
}

/**
 * 保存上传文件到本地 uploads/ 目录
 * @param file — 浏览器 File 对象
 * @param uploadsDir — 可选，自定义上传目录（用于测试注入）
 * @returns 保存后的文件元数据
 */
export async function saveFile(
  file: File,
  uploadsDir?: string,
): Promise<{ path: string; originalName: string; size: number; mimeType: string }> {
  const dir = uploadsDir || UPLOAD_DIR;

  // 确保上传目录存在
  await mkdir(dir, { recursive: true });

  const uniqueName = generateUniqueFilename(file.name);
  const filePath = path.join(dir, uniqueName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await writeFile(filePath, buffer);

  return {
    path: `/uploads/${uniqueName}`,
    originalName: file.name,
    size: buffer.length,
    mimeType: file.type,
  };
}

/**
 * 获取文件的完整磁盘路径
 */
export function getFilePath(relativePath: string): string {
  return path.join(process.cwd(), relativePath.replace(/^\//, ""));
}
