-- ============================================================
-- nav 全站审计修复：数据库侧
-- 在 Supabase Dashboard -> SQL Editor 中执行
--
-- 1. 收紧 link_clicks 的读策略：原来 USING(true) 允许任何人读取
--    全量点击记录。今日热门聚合走 SECURITY DEFINER 的
--    get_today_hot_links（绕过 RLS），公开读策略没有保留必要。
--    改为仅管理员可读（管理员邮箱从 links 写策略中动态提取，
--    与 reorder RPC 的鉴权同源）。
-- 2. links 表新增 source 列：区分访客提交（public）与后台添加
--    （admin，默认值）。提交收录的频率限制只统计 public，
--    避免管理员批量整理时误封访客提交。
-- 3. 存量 URL 规范化回填：host 小写 + 去掉末尾斜杠，与应用层
--    normalizeUrlForCompare 对齐。此后入库 URL 均为规范化形式，
--    去重可用精确匹配，不再需要全表拉取。
-- ============================================================

-- 1. 收紧 link_clicks 读策略
DO $$
DECLARE
  v_admin_email text;
BEGIN
  SELECT regexp_replace(
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), pg_get_expr(p.polqual, p.polrelid)),
           '^.*''([^'']+@[^'']+)''.*$',
           '\1'
         )
    INTO v_admin_email
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = 'links'
    AND p.polname = 'Allow admin to update links';

  DROP POLICY IF EXISTS "Allow anyone to read link_clicks" ON link_clicks;

  IF v_admin_email IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY "Allow admin to read link_clicks" ON link_clicks FOR SELECT TO authenticated USING (auth.jwt() ->> ''email'' = %L)',
      v_admin_email
    );
  END IF;
END
$$;

-- 2. 新增 source 列
ALTER TABLE links ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';

-- 3. 存量 URL 规范化回填
UPDATE links
SET url = regexp_replace(parts.scheme || lower(parts.host) || parts.rest, '/$', '')
FROM (
  SELECT
    id AS link_id,
    COALESCE(substring(url from '^([A-Za-z][A-Za-z0-9+.-]*://)'), '') AS scheme,
    COALESCE(substring(url from '^[A-Za-z][A-Za-z0-9+.-]*://([^/]*)'), '') AS host,
    COALESCE(substring(url from '^[A-Za-z][A-Za-z0-9+.-]*://[^/]*(.*)$'), '') AS rest
  FROM links
  WHERE url IS NOT NULL
) AS parts
WHERE links.id = parts.link_id;
