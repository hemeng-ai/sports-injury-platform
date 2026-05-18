// 文件上传工具函数
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * 保存上传文件到本地 uploads/ 目录
 * @returns 保存后的文件路径（相对路径）
 */
export async function saveFile(
  file: File
): Promise<{ name: string; path: string; size: number }> {
  // 确保上传目录存在
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const uniqueName = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, uniqueName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await writeFile(filePath, buffer);

  return {
    name: uniqueName,
    path: `/uploads/${uniqueName}`,
    size: buffer.length,
  };
}

/**
 * 获取文件的完整磁盘路径
 */
export function getFilePath(relativePath: string): string {
  return path.join(process.cwd(), relativePath.replace(/^\//, ""));
}

/**
 * 验证文件类型是否在允许列表中
 */
const ALLOWED_MIME_TYPES = [
  // 文档
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // 图片
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // 文本
  "text/plain",
  "text/csv",
  // 视频
  "video/mp4",
];

/**
 * 检查 MIME 类型是否允许上传
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * 最大文件大小：50MB
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
