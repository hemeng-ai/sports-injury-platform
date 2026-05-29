// 文件上传 —— 使用 Supabase Storage 替代本地文件系统
import { uploadToSupabase, deleteFromSupabase, extractFilePathFromUrl } from "@/lib/supabase-storage";
import { generateUniqueFilename } from "@/lib/upload-utils";

// 从 upload-utils 重新导出客户端安全函数
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, validateFileType, formatFileSize, generateUniqueFilename } from "@/lib/upload-utils";

/**
 * 保存上传文件到 Supabase Storage
 * @param file 浏览器 File 对象
 * @returns 文件元数据（path 为公开URL）
 */
export async function saveFile(
  file: File,
): Promise<{ path: string; originalName: string; size: number; mimeType: string }> {
  const uniqueName = generateUniqueFilename(file.name);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const publicUrl = await uploadToSupabase(buffer, uniqueName, file.type);

  return {
    path: publicUrl,
    originalName: file.name,
    size: bytes.byteLength,
    mimeType: file.type,
  };
}

/**
 * 删除文件（软删除时同步清理 Supabase Storage）
 * @param fileUrl 数据库中存储的文件URL
 */
export async function removeFile(fileUrl: string): Promise<void> {
  const filePath = extractFilePathFromUrl(fileUrl);
  await deleteFromSupabase(filePath);
}

/**
 * 获取文件的可访问路径（兼容旧数据）
 * Supabase Storage 文件 path 已为完整URL，直接返回即可
 */
export function getFilePath(relativePath: string): string {
  // 如果已经是完整URL，直接返回
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  // 兼容旧的 /uploads/ 前缀（迁移过渡期）
  return relativePath;
}