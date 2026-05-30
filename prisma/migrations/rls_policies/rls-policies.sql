-- ============================================================
-- Supabase RLS (Row Level Security) 策略
-- 
-- 说明：即使 DATABASE_URL 泄露，攻击者也无法直接操作数据。
-- 所有操作必须通过已认证的 Supabase 会话进行。
--
-- 应用方式：在 Supabase 后台 → SQL Editor 中执行此脚本
-- ============================================================

-- ==================== User ====================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- 所有登录用户可查看用户列表（用于显示上传者、角色等）
CREATE POLICY "Authenticated users can view users"
  ON "User" FOR SELECT
  USING (auth.role() = 'authenticated');

-- 用户只能更新自己的信息
CREATE POLICY "Users can update own profile"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = "supabaseUserId")
  WITH CHECK (auth.uid()::text = "supabaseUserId");

-- 管理员可以更新任意用户
CREATE POLICY "Admins can update any user"
  ON "User" FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

-- ==================== Folder ====================
ALTER TABLE "Folder" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view folders"
  ON "Folder" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage folders"
  ON "Folder" FOR ALL
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

-- ==================== File ====================
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view files"
  ON "File" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload files"
  ON "File" FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own files"
  ON "File" FOR UPDATE
  USING ("uploadedBy" IN (
    SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text
  ));

CREATE POLICY "Admins can manage all files"
  ON "File" FOR ALL
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

-- ==================== IndicatorCategory ====================
ALTER TABLE "IndicatorCategory" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON "IndicatorCategory" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage categories"
  ON "IndicatorCategory" FOR ALL
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

-- ==================== Indicator ====================
ALTER TABLE "Indicator" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view indicators"
  ON "Indicator" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage indicators"
  ON "Indicator" FOR ALL
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

-- ==================== ExcelMapping ====================
ALTER TABLE "ExcelMapping" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mappings"
  ON "ExcelMapping" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage mappings"
  ON "ExcelMapping" FOR ALL
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

-- ==================== ExcelFile ====================
ALTER TABLE "ExcelFile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view Excel files"
  ON "ExcelFile" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage Excel files"
  ON "ExcelFile" FOR ALL
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

-- ==================== AnalysisRecord ====================
ALTER TABLE "AnalysisRecord" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis records"
  ON "AnalysisRecord" FOR SELECT
  USING ("createdBy" IN (
    SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text
  ));

CREATE POLICY "Admins can view all analysis records"
  ON "AnalysisRecord" FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

CREATE POLICY "Authenticated users can create analysis"
  ON "AnalysisRecord" FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own analysis"
  ON "AnalysisRecord" FOR DELETE
  USING ("createdBy" IN (
    SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text
  ));

-- ==================== AuditLog ====================
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON "AuditLog" FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPERADMIN'));

CREATE POLICY "System can insert audit logs"
  ON "AuditLog" FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');