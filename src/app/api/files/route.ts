/**
 * 文件 API — POST/GET /api/files
 *
 * Task 1.5: 文件上传 + 列表查询
 * - POST: multipart 上传（Admin+），保存文件 → Prisma 记录
 * - GET: 分页查询（所有登录用户），支持 folderId/search/type 筛选
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { saveFile, validateFileType, MAX_FILE_SIZE } from "@/lib/upload";
import { checkApiPermission } from "@/lib/rbac";
import { decode } from "@auth/core/jwt";

export const runtime = "nodejs";

/**
 * POST /api/files — 文件上传
 * Content-Type: multipart/form-data
 * Fields: file (binary), folderId (string)
 * Permission: ADMIN+
 */

export async function POST(request: NextRequest): Promise<Response> {
  // 权限校验
  const permissionError = await checkApiPermission(request, "ADMIN");
  if (permissionError) return permissionError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    // 校验必填字段
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    }
    if (!folderId) {
      return NextResponse.json({ error: "请选择目标文件夹" }, { status: 400 });
    }

    // 校验文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）` },
        { status: 413 },
      );
    }

    // 校验文件类型
    if (!validateFileType(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型：${file.type}` },
        { status: 400 },
      );
    }

    // 保存文件到本地
    const saved = await saveFile(file);

    // 从 session cookie 提取用户 ID
    const userId = await getUserIdFromRequest(request);

    // 写入 Prisma 记录
    const record = await prisma.file.create({
      data: {
        name: saved.path.split("/").pop() || saved.originalName,
        originalName: saved.originalName,
        path: saved.path,
        size: saved.size,
        mimeType: saved.mimeType,
        tags: "",
        folderId,
        uploadedBy: userId,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[POST /api/files] 上传失败:", error);
    return NextResponse.json({ error: "文件上传失败，请稍后重试" }, { status: 500 });
  }
}

/**
 * GET /api/files — 文件列表查询
 * Query: ?folderId=&search=&type=&page=&limit=
 * Permission: 所有登录用户
 */

export async function GET(request: NextRequest): Promise<Response> {
  // 权限校验
  const permissionError = await checkApiPermission(request, "VISITOR");
  if (permissionError) return permissionError;

  try {
    const url = new URL(request.url);
    const folderId = url.searchParams.get("folderId") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));

    // 构建 where 条件（默认排除已删除文件）
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (folderId) {
      where.folderId = folderId;
    }

    if (search) {
      where.originalName = { contains: search };
    }

    if (type) {
      where.mimeType = { startsWith: type };
    }

    // 查询文件列表（含分页）
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: where as Prisma.FileWhereInput,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.file.count({ where: where as Prisma.FileWhereInput }),
    ]);

    return NextResponse.json({
      files,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[GET /api/files] 查询失败:", error);
    return NextResponse.json({ error: "查询文件列表失败" }, { status: 500 });
  }
}

/**
 * 从请求的 session cookie 中提取用户 ID
 * 使用 @auth/core/jwt decode() 解密 JWE token（禁止直接 jwtDecrypt + 原始 secret）
 */
async function getUserIdFromRequest(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};

  cookieHeader.split(";").forEach((pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) {
      cookies[key] = valueParts.join("=");
    }
  });

  const sessionToken =
    cookies["authjs.session-token"] || cookies["__Secure-authjs.session-token"];

  if (sessionToken) {
    try {
      const payload = await decode({
        token: sessionToken,
        secret: process.env.AUTH_SECRET || "default-secret-change-me",
        salt: "authjs.session-token",
      });
      return (payload as { sub?: string }).sub || "unknown";
    } catch {
      // token 解析失败，返回默认值
    }
  }

  return "unknown";
}
