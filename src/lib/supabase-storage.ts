// Supabase Storage 客户端 —— 服务端上传/下载文件
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET! || "sports-injury-files";

// 服务端专用客户端（使用 service_role key，绕过 RLS）
export const supabaseStorage = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// 缓存 bucket 的公开 URL 前缀
let _publicUrlPrefix: string | null = null;
function getPublicUrlPrefix(): string {
  if (!_publicUrlPrefix) {
    const { data } = supabaseStorage.storage.from(bucketName).getPublicUrl("dummy");
    // URL 格式: https://xxx.supabase.co/storage/v1/object/public/bucketName/
    const url = new URL(data.publicUrl);
    _publicUrlPrefix = url.origin + url.pathname.replace("/dummy", "");
  }
  return _publicUrlPrefix;
}

/**
 * 上传文件到 Supabase Storage
 * @param fileBuffer 文件二进制数据
 * @param fileName 存储用的文件名（含扩展名）
 * @param contentType MIME类型
 * @returns 公开访问URL
 */
export async function uploadToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseStorage.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase上传失败: ${error.message}`);
  }

  return `${getPublicUrlPrefix()}/${fileName}`;
}

/**
 * 删除 Supabase Storage 中的文件
 * @param filePath 文件在bucket中的路径（不含bucket名）
 */
export async function deleteFromSupabase(filePath: string): Promise<void> {
  const { error } = await supabaseStorage.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    console.error("[Supabase] 删除文件失败:", error.message);
  }
}

/**
 * 从完整URL中提取文件路径（用于删除操作）
 * 输入: https://xxx.supabase.co/storage/v1/object/public/bucketName/filename.xlsx
 * 输出: filename.xlsx
 */
export function extractFilePathFromUrl(url: string): string {
  const prefix = getPublicUrlPrefix();
  if (url.startsWith(prefix)) {
    return url.substring(prefix.length + 1); // +1 去掉 /
  }
  // 兼容旧格式 /uploads/xxx
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "");
  }
  return url;
}