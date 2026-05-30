# Supabase RLS 策略

## 作用
防止数据库密码泄露后攻击者直接读写所有数据表。

## 应用方式

### 方式一：Supabase 后台（推荐）
1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目
2. 左侧菜单 → SQL Editor
3. 复制 ls-policies.sql 全部内容 → 粘贴 → Run

### 方式二：本地 psql
`ash
psql "postgresql://..." -f prisma/migrations/rls_policies/rls-policies.sql
`

## 验证
在 Supabase → SQL Editor 运行：
`sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN (
  'User', 'Folder', 'File', 'IndicatorCategory', 'Indicator',
  'ExcelMapping', 'ExcelFile', 'AnalysisRecord', 'AuditLog'
);
`
所有表的 owsecurity 应为 	rue。

## 注意事项
- 应用 RLS 后，服务端 API 使用 SUPABASE_SERVICE_ROLE_KEY 仍然可以绕过 RLS
- 如果通过 NEXT_PUBLIC_SUPABASE_ANON_KEY 在前端直接访问 Supabase，RLS 会生效
- 确保 .env 中 SUPABASE_SERVICE_ROLE_KEY 不被提交到 git