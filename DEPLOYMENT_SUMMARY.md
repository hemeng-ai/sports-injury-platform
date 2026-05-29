# 运动损伤资料管理与指标分析平台 — 部署进度摘要

## 项目概况

- **技术栈**: Next.js 15 + React 19 + TypeScript + Prisma + Tailwind CSS 4 + Radix UI
- **认证**: NextAuth v5（Credentials Provider + JWT），三个角色 VISITOR / ADMIN / SUPERADMIN
- **数据库**: Supabase PostgreSQL（原为 SQLite）
- **文件存储**: Supabase Storage（原为本地磁盘）
- **应用托管**: Vercel
- **项目路径**: D:\ClaudeWorkSpace\my_project\sports-injury-platform
- **GitHub**: hemeng-ai/sports-injury-platform（master 分支）

## 已完成（本次对话）

### 1. 数据库迁移 SQLite → Supabase PostgreSQL
- `prisma/schema.prisma` provider 已切为 postgresql
- 9 张表已创建：User, Folder, File, IndicatorCategory, Indicator, ExcelMapping, ExcelFile, AnalysisRecord, AuditLog
- 初始数据已填充：3 个用户 + 7 个指标体系分类
- 连接方式：PgBouncer 连接池（端口 6543）
- Prisma 迁移记录表已建立

### 2. 文件存储迁移 → Supabase Storage
- 新增 `src/lib/supabase-storage.ts`：封装上传/删除/URL 提取
- 重写 `src/lib/upload.ts`：saveFile() 改为上传到 Supabase Storage，返回公开 URL
- 更新 `src/app/api/files/[id]/route.ts`：DELETE 时同步清理 Storage
- 存储桶：sports-injury-files（公开、50MB 限制）

### 3. 应用部署到 Vercel
- 本地构建通过（27 条路由）
- 代码已推送 GitHub
- Vercel 环境变量已配置（8 个）
- 线上地址: https://sports-injury-platform.vercel.app

## 环境变量（供新对话参考）

需要设置到 .env 或 Vercel 的变量：
- DATABASE_URL（Supabase 连接池地址）
- AUTH_SECRET
- NEXT_PUBLIC_APP_NAME
- DEEPSEEK_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET

（完整值见项目 .env 文件）

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | admin | admin123 |
| 管理员 | doctor | doctor123 |
| 游客 | visitor | visitor123 |

## 访问地址

- 线上：https://sports-injury-platform.vercel.app
- Supabase Dashboard：https://supabase.com/dashboard（项目名 sports-injury-platform）
- Vercel Dashboard：https://vercel.com/hemeng-ais-projects/sports-injury-platform

## 待办事项（可继续推进）

1. **[可选] 切换到 Supabase Auth**：目前使用 NextAuth + Credentials，后续可迁移到 Supabase 原生 Auth（支持社交登录、Magic Link、RLS 安全策略）
2. **[建议] 域名配置**：在 Vercel 绑定自定义域名，替换 vercel.app 子域名
3. **[建议] 完善 CI/CD**：GitHub 推送自动触发 Vercel 构建已生效，可添加预部署测试环节
4. **[可选] Prisma 版本升级**：当前 6.19.3，可升级到 7.x（提示过 breaking changes）
5. **[可选] 监控和日志**：接入 Vercel Analytics + Supabase 日志监控
6. **[建议] IP 白名单**：如果后续切换到 Supabase 直连（5432端口），需要开启 IPv4 Add-on

---

将此摘要粘贴到新对话开头，Codex 即可无缝接手。