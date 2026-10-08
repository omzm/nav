-- ============================================================
-- nav 数据库基线（含全部历史迁移的最终形态）
-- 部署时由 scripts/migrate.mjs 自动执行，全程零手工 SQL。
-- 注意：管理员邮箱不再写死，存在 app_config 表中（key='admin_email'），
-- 首次部署由 /admin/setup 向导写入；RLS 策略与 RPC 均动态读取。
-- ============================================================

-- 创建分类表
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 创建链接表
CREATE TABLE links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 创建索引
CREATE INDEX idx_categories_order ON categories("order");
CREATE INDEX idx_categories_is_private ON categories(is_private);
CREATE INDEX idx_links_category_id ON links(category_id);
CREATE INDEX idx_links_order ON links("order");
CREATE INDEX idx_links_is_private ON links(is_private);

-- 启用行级安全 (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- 创建策略：公开分类对所有人可见，私密分类只对认证用户可见
CREATE POLICY "Allow public read on public categories"
  ON categories FOR SELECT
  USING (is_private = FALSE OR (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email')));

-- 创建策略：公开链接对所有人可见，私密链接只对认证用户可见
CREATE POLICY "Allow public read on public links"
  ON links FOR SELECT
  USING (is_private = FALSE OR (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email')));

-- 创建策略：只有管理员可以修改（管理员邮箱从 app_config 表动态读取）
CREATE POLICY "Allow admin to insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

CREATE POLICY "Allow admin to update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

CREATE POLICY "Allow admin to delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

CREATE POLICY "Allow admin to insert links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

CREATE POLICY "Allow admin to update links"
  ON links FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

CREATE POLICY "Allow admin to delete links"
  ON links FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

-- 应用配置表：存管理员邮箱等站点级配置，首次部署由 /admin/setup 向导写入
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 管理员邮箱本就是公开信息（此前是 NEXT_PUBLIC_ 环境变量），所有人可读；
-- 写操作只允许 service_role（setup 向导经服务端 key 操作），不给普通用户写策略
CREATE POLICY "Allow anyone to read app_config"
  ON app_config FOR SELECT
  USING (true);

-- 创建点击记录表
CREATE TABLE link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);
CREATE INDEX idx_link_clicks_clicked_at_link_id ON link_clicks(clicked_at, link_id);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- 所有人可写入点击记录
CREATE POLICY "Allow anyone to insert link_clicks"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- 点击记录仅管理员可读（今日热门走 SECURITY DEFINER 的 get_today_hot_links 聚合）
CREATE POLICY "Allow admin to read link_clicks"
  ON link_clicks FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = (select value from app_config where key = 'admin_email'));

-- 数据库侧聚合今日热门，首页只读取聚合后的前 N 条结果
CREATE TABLE site_stats (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

INSERT INTO site_stats (key, value)
VALUES ('total_views', 0)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to read site_stats"
  ON site_stats FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION increment_site_view()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value BIGINT;
BEGIN
  INSERT INTO site_stats AS stats (key, value, updated_at)
  VALUES ('total_views', 1, TIMEZONE('utc', NOW()))
  ON CONFLICT (key)
  DO UPDATE SET
    value = stats.value + 1,
    updated_at = EXCLUDED.updated_at
  RETURNING value INTO next_value;

  RETURN next_value;
END;
$$;

CREATE OR REPLACE FUNCTION get_today_hot_links(limit_count integer DEFAULT 5)
RETURNS TABLE (
  title TEXT,
  url TEXT,
  icon TEXT,
  click_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.title,
    l.url,
    l.icon,
    COUNT(c.id)::BIGINT AS click_count
  FROM link_clicks c
  JOIN links l ON l.id = c.link_id
  JOIN categories cat ON cat.id = l.category_id
  WHERE c.clicked_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai'
    AND c.clicked_at < date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai' + interval '1 day'
    AND COALESCE(l.is_private, false) = false
    -- 私密分类下的链接不得出现在公开热门榜（与首页快照口径对齐）
    AND COALESCE(cat.is_private, false) = false
  GROUP BY l.id, l.title, l.url, l.icon
  ORDER BY click_count DESC, l.title ASC
  LIMIT GREATEST(limit_count, 0);
$$;

-- 首页快照 RPC：只返回公开分类/链接（私密内容走 get_nav_private_data）
CREATE OR REPLACE FUNCTION get_nav_snapshot_data(limit_count integer DEFAULT 5)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'categories',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'icon', c.icon,
          'order', c."order",
          'isPrivate', false,
          'links', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'title', l.title,
                'url', l.url,
                'description', l.description,
                'icon', l.icon,
                'isPrivate', false
              )
              ORDER BY l."order" ASC
            )
            FROM links l
            WHERE l.category_id = c.id
              AND COALESCE(l.is_private, false) = false
          ), '[]'::jsonb)
        )
        ORDER BY c."order" ASC
      )
      FROM categories c
      WHERE COALESCE(c.is_private, false) = false
    ), '[]'::jsonb),
    'hotLinks',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', h.title,
          'url', h.url,
          'icon', h.icon,
          'clickCount', h.click_count
        )
        ORDER BY h.click_count DESC, h.title ASC
      )
      FROM get_today_hot_links(limit_count) h
    ), '[]'::jsonb),
    'stats',
    jsonb_build_object(
      'categoryCount', (SELECT COUNT(*) FROM categories WHERE COALESCE(is_private, false) = false),
      'linkCount', (SELECT COUNT(*) FROM links WHERE COALESCE(is_private, false) = false),
      'totalViewCount', COALESCE((SELECT value FROM site_stats WHERE key = 'total_views'), 0)
    ),
    'generatedAt', now()
  );
$$;

-- 私密数据 RPC：校验口令后下发私密分类/链接
CREATE OR REPLACE FUNCTION get_nav_private_data(p_phrase text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected text := COALESCE(NULLIF(current_setting('app.settings.unlock_phrase', true), ''), '开门');
BEGIN
  IF p_phrase IS NULL OR p_phrase <> v_expected THEN
    RETURN jsonb_build_object('unlocked', false, 'categories', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'unlocked', true,
    'categories', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'icon', c.icon,
          'order', c."order",
          'isPrivate', true,
          'links', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'title', l.title,
                'url', l.url,
                'description', l.description,
                'icon', l.icon,
                'isPrivate', COALESCE(l.is_private, false)
              )
              ORDER BY l."order" ASC
            )
            FROM links l
            WHERE l.category_id = c.id
              AND (
                COALESCE(c.is_private, false) = true
                OR COALESCE(l.is_private, false) = true
              )
          ), '[]'::jsonb)
        )
        ORDER BY c."order" ASC
      )
      FROM categories c
      WHERE COALESCE(c.is_private, false) = true
         OR EXISTS (
           SELECT 1 FROM links l2
           WHERE l2.category_id = c.id AND COALESCE(l2.is_private, false) = true
         )
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION reorder_links(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
CREATE OR REPLACE FUNCTION reorder_categories(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION get_nav_private_data(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION reorder_links(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION reorder_categories(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_today_hot_links(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_site_view() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nav_snapshot_data(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nav_private_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reorder_links(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_categories(uuid[]) TO authenticated;

-- 每天凌晨 0:05 (UTC) 自动清理前一天的点击记录
SELECT cron.schedule(
  'clean-old-link-clicks',
  '5 0 * * *',
  $$DELETE FROM link_clicks WHERE clicked_at < CURRENT_DATE$$
);
