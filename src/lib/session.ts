/**
 * Session Token 解密 — 统一入口
 *
 * ## 核心原则：禁止自定义 JWT 解密逻辑
 *
 * NextAuth v5 默认使用 JWE (A256CBC-HS512) 加密 session token。
 * 加密密钥 = HKDF-SHA256(AUTH_SECRET, salt, info, length)，其中：
 *   - salt = cookie 名称（如 "authjs.session-token"）
 *   - info = "Auth.js Generated Encryption Key (${salt})"  ← 关键！
 *   - length = 64 bytes (for A256CBC-HS512)
 *
 * ## 常见错误（都曾出现过）：
 * 1. HKDF info 参数写成空字符串 → 密钥不匹配，解密失败
 * 2. 直接把 AUTH_SECRET 原文当密钥传给 jwtDecrypt → 跳过 HKDF，必定失败
 * 3. 自己用 Web Crypto API 拼 HKDF → 参数容易写错，且 @panva/hkdf 行为不同
 *
 * ## 正确做法（唯一）：
 * 始终使用 @auth/core/jwt 的 decode() 函数，一行 HKDF 都不自己写。
 *
 * @see {@link https://authjs.dev/concepts/session-strategies#jwt-session}
 */
import { decode } from "@auth/core/jwt";

const AUTH_SECRET = process.env.AUTH_SECRET || "84f47da9ce4098f682af965abe5127f86d78cfc2c85cd82ad6e8656496222f58";

/**
 * 解密 NextAuth 生成的 JWE session token
 * 使用 @auth/core/jwt 官方 decode，确保与 NextAuth 的加密逻辑完全一致
 */
export async function decryptSessionToken(
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const payload = await decode({
      token,
      secret: AUTH_SECRET,
      salt: "authjs.session-token",
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) cookies[key] = valueParts.join("=");
  });

  const token = cookies["authjs.session-token"] || cookies["__Secure-authjs.session-token"];
  if (!token) return null;

  return decryptSessionToken(token);
}
