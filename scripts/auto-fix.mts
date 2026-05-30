/**
 * 自动修复脚本 — 冒烟测试失败时调用 DeepSeek API 分析并修复
 *
 * 用法:
 *   node node_modules/tsx/dist/cli.mjs scripts/auto-fix.mts error.log
 *
 * 环境变量:
 *   DEEPSEEK_API_KEY  - DeepSeek API Key (必需)
 *   DEEPSEEK_BASE_URL - 默认为 https://api.deepseek.com
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

if (!API_KEY) {
  console.error("❌ DEEPSEEK_API_KEY not set");
  process.exit(1);
}

const errorLogPath = process.argv[2];
if (!errorLogPath || !existsSync(errorLogPath)) {
  console.error("❌ Error log file not found:", errorLogPath);
  process.exit(1);
}

const errorLog = readFileSync(errorLogPath, "utf-8");
console.log("📋 Error log loaded:", errorLog.slice(0, 200), "...\n");

// Step 1: 让 DeepSeek 分析错误并生成修复
console.log("🤖 Asking DeepSeek to analyze and fix...\n");

const systemPrompt = `You are a senior full-stack developer. A smoke test on a Next.js production site failed.

Your job:
1. Analyze the error log below
2. Identify the root cause
3. Generate a git-apply-able unified diff patch to fix the issue
4. The patch must be minimal — only change what's needed

Rules:
- Output ONLY the unified diff patch, nothing else
- Use *** Begin Patch / *** End Patch markers
- Each file block: *** Update File: path/to/file
- Include @@ hunk headers with line numbers
- Keep changes minimal and surgical

If the error is NOT a code bug (e.g., database down, network timeout, dependency issue), output:
CANNOT_FIX: <reason>`;

const userPrompt = `The following smoke test failed on our Next.js production site. 

Repository: sports-injury-platform (Next.js 15 + Prisma + Supabase Auth + Tailwind CSS)
Tech stack: Next.js 15 App Router, TypeScript, PostgreSQL (Supabase), Supabase Auth

Error log:
\`\`\`
${errorLog.slice(0, 4000)}
\`\`\`

Please analyze and provide a fix diff.`;

const response = await fetch(`${BASE_URL}/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  }),
});

if (!response.ok) {
  const errBody = await response.text();
  console.error(`❌ DeepSeek API error (${response.status}):`, errBody.slice(0, 500));
  process.exit(2);
}

const data = await response.json();
const content = data.choices?.[0]?.message?.content || "";

console.log("📝 DeepSeek response:\n", content.slice(0, 500), "\n");

// Step 2: 判断是否可自动修复
if (content.startsWith("CANNOT_FIX:")) {
  console.log("⚠️  Cannot auto-fix:", content.replace("CANNOT_FIX:", "").trim());
  console.log("   This requires manual intervention.");
  process.exit(0); // 不报错，只是通知
}

// Step 3: 解析 patch
const patchMatch = content.match(/\*\*\* Begin Patch[\s\S]*?\*\*\* End Patch/);
if (!patchMatch) {
  console.error("❌ No valid patch found in DeepSeek response");
  console.log("Full response:\n", content);
  process.exit(3);
}

const patchContent = patchMatch[0];
const patchFile = join(tmpdir(), `auto-fix-${Date.now()}.patch`);
writeFileSync(patchFile, patchContent, "utf-8");
console.log("💾 Patch saved to:", patchFile);

// Step 4: 应用 patch
try {
  console.log("\n🔧 Applying patch...");
  execSync(`git apply --verbose "${patchFile}"`, { stdio: "inherit" });
  console.log("✅ Patch applied successfully");
} catch (e) {
  console.error("❌ Failed to apply patch");
  console.error("The patch may need manual adjustment.");
  process.exit(4);
}

// Step 5: 运行相关测试验证
console.log("\n🧪 Running tests...");
try {
  execSync("npx jest --no-coverage --passWithNoTests 2>&1", {
    stdio: "inherit",
    timeout: 120_000,
  });
  console.log("✅ Tests passed");
} catch (e) {
  console.error("❌ Tests failed after applying fix");
  // 回滚
  console.log("↩️  Rolling back changes...");
  execSync("git checkout -- .", { stdio: "inherit" });
  process.exit(5);
}

// Step 6: 提交并推送
console.log("\n📦 Committing and pushing fix...");
try {
  execSync('git add -A', { stdio: "inherit" });
  execSync(
    `git commit -m "fix(ci): auto-fix smoke test failure [skip ci]"`,
    { stdio: "inherit" }
  );
  execSync("git push origin master", { stdio: "inherit" });
  console.log("✅ Fix committed and pushed!");
} catch (e) {
  console.error("❌ Failed to commit/push");
  process.exit(6);
}