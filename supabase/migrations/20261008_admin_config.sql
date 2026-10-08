-- ============================================================
-- 管理员邮箱改存数据库（app_config 表）
-- RLS 策略与排序 RPC 改为动态读取 app_config.admin_email，
-- 不再依赖环境变量 NEXT_PUBLIC_ADMIN_EMAIL。
-- 部署时由 scripts/migrate.mjs 自动执行。
-- ============================================================

-- 应用配置表
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to read app_config" ON app_config;
CREATE POLICY "Allow anyone to read app_config"
  ON app_config FOR SELECT
  USING (true);

-- 重写 9 个引用管理员邮箱的策略（改为动态查表）
DROP POLICY IF EXISTS "Allow public read on public categories" ON categories;
CREATE POLICY "Allow public read on public categories"
  ON categories FOR SELECT
  USING (is_private = FALSE OR (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email')));

DROP POLICY IF EXISTS "Allow public read on public links" ON links;
CREATE POLICY "Allow public read on public links"
  ON links FOR SELECT
  USING (is_private = FALSE OR (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email')));

DROP POLICY IF EXISTS "Allow admin to insert categories" ON categories;
CREATE POLICY "Allow admin to insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

DROP POLICY IF EXISTS "Allow admin to update categories" ON categories;
CREATE POLICY "Allow admin to update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

DROP POLICY IF EXISTS "Allow admin to delete categories" ON categories;
CREATE POLICY "Allow admin to delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

DROP POLICY IF EXISTS "Allow admin to insert links" ON links;
CREATE POLICY "Allow admin to insert links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

DROP POLICY IF EXISTS "Allow admin to update links" ON links;
CREATE POLICY "Allow admin to update links"
  ON links FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

DROP POLICY IF EXISTS "Allow admin to delete links" ON links;
CREATE POLICY "Allow admin to delete links"
  ON links FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

DROP POLICY IF EXISTS "Allow admin to read link_clicks" ON link_clicks;
CREATE POLICY "Allow admin to read link_clicks"
  ON link_clicks FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

-- 排序 RPC：管理员邮箱改查 app_config 表（不再从 pg_policy 正则提取）
CREATE OR REPLACE FUNCTION reorder_links(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_caller_email text := auth.jwt() ->> 'email';
  v_admin_email text;
BEGIN
  -- 管理员邮箱存在 app_config 表中（首次部署由 /admin/setup 向导写入）
  SELECT value INTO v_admin_email FROM app_config WHERE key = 'admin_email';

  IF v_caller_email IS NULL OR v_admin_email IS NULL
     OR lower(v_caller_email) IS DISTINCT FROM lower(v_admin_email) THEN
    RAISE EXCEPTION '未授权：仅管理员可调整链接排序';
  END IF;

  -- 按数组顺序批量写入 order（unnest with ordinality 取出下标）
  UPDATE links AS l
  SET "order" = ordered.rn::integer
  FROM (
    SELECT u.id, u.ord AS rn
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS u(id, ord)
  ) AS ordered
  WHERE l.id = ordered.id;
END;
$;

CREATE OR REPLACE FUNCTION reorder_categories(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_caller_email text := auth.jwt() ->> 'email';
  v_admin_email text;
BEGIN
  -- 管理员邮箱存在 app_config 表中（首次部署由 /admin/setup 向导写入）
  SELECT value INTO v_admin_email FROM app_config WHERE key = 'admin_email';

  IF v_caller_email IS NULL OR v_admin_email IS NULL
     OR lower(v_caller_email) IS DISTINCT FROM lower(v_admin_email) THEN
    RAISE EXCEPTION '未授权：仅管理员可调整分类排序';
  END IF;

  -- 按数组顺序批量写入 order（unnest with ordinality 取出下标）
  UPDATE categories AS c
  SET "order" = ordered.rn::integer
  FROM (
    SELECT u.id, u.ord AS rn
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS u(id, ord)
  ) AS ordered
  WHERE c.id = ordered.id;
END;
$;
