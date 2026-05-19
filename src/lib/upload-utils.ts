// 文件上传客户端工具函数 — 可在客户端和服务端安全导入
// 不依赖 Node.js fs/promises 等服务端专有模块

import { v4 as uuidv4 } from "uuid";

/** 允许上传的 MIME 类型白名单 */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg", "image/jpg", "image/png", "image/webp",
];

/** 最大文件大小：50MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** 验证文件类型 */
export function validateFileType(mimeType: string): boolean {
  if (!mimeType || typeof mimeType !== "string") return false;
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/** 格式化文件大小（B → KB/MB/GB） */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || !Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++; }
  const formatted = unitIndex === 0 ? size.toString() : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

/** 生成唯一文件名（UUID + 原始扩展名） */
export function generateUniqueFilename(originalName: string): string {
  const ext = originalName.includes(".") ? originalName.substring(originalName.lastIndexOf(".")) : "";
  return `${uuidv4()}${ext}`;
}
