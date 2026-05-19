// 文件上传 — 服务端专用逻辑（依赖 Node.js fs/promises）
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { generateUniqueFilename } from "@/lib/upload-utils";

// 从 upload-utils 重新导出客户端安全函数
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, validateFileType, formatFileSize, generateUniqueFilename } from "@/lib/upload-utils";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * 保存上传文件到本地 uploads/ 目录
 * @param file — 浏览器 File 对象
 * @param uploadsDir — 可选，自定义上传目录
 * @returns 保存后的文件元数据
 */
export async function saveFile(
  file: File,
  uploadsDir?: string,
): Promise<{ path: string; originalName: string; size: number; mimeType: string }> {
  const dir = uploadsDir || UPLOAD_DIR;
  await mkdir(dir, { recursive: true });

  const uniqueName = generateUniqueFilename(file.name);
  const filePath = path.join(dir, uniqueName);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  return {
    path: `/uploads/${uniqueName}`,
    originalName: file.name,
    size: bytes.byteLength,
    mimeType: file.type,
  };
}

/** 获取文件的完整磁盘路径 */
export function getFilePath(relativePath: string): string {
  return path.join(process.cwd(), relativePath.replace(/^\//, ""));
}
