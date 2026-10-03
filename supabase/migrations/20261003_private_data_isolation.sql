-- ============================================================
-- nav 安全修复 S1：私密数据服务端隔离
-- 在 Supabase Dashboard -> SQL Editor 中执行
--
-- 改动说明：
-- 1. get_nav_snapshot_data() 只返回公开分类/链接（含统计），
--    匿名访客、页面源码、爬虫、直接调 RPC 都拿不到私密数据。
-- 2. 新增 get_nav_private_data(p_phrase text)：SECURITY DEFINER，
--    只有口令正确才返回私密分类/链接。口令默认 "开门"，
--    可通过数据库设置 app.settings.unlock_phrase 修改，无需改代码：
--      ALTER DATABASE postgres SET app.settings.unlock_phrase TO '你的新口令';
--    （执行后需重连会话生效）
-- 3. 口令校验在数据库端完成，私密数据只在"开门"成功后经
--    服务端 server action 下发，不再进入首页初始 HTML。
--
-- 回滚：执行同目录下的 20261003_private_data_isolation_rollback.sql
-- ============================================================

-- 1) 首页快照 RPC：只返回公开内容
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
      -- 只统计公开项，避免从计数中泄露私密数据规模
      'categoryCount', (SELECT COUNT(*) FROM categories WHERE COALESCE(is_private, false) = false),
      'linkCount', (SELECT COUNT(*) FROM links WHERE COALESCE(is_private, false) = false),
      'totalViewCount', COALESCE((SELECT value FROM site_stats WHERE key = 'total_views'), 0)
    ),
    'generatedAt', now()
  );
$$;

-- 2) 私密数据 RPC：口令正确才返回（口令校验在服务端完成）
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
              -- 私密分类下展示其全部链接；公开分类下只展示私密链接
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

-- 私密 RPC 允许匿名调用（口令在函数内校验），但绝不绕过口令返回数据
REVOKE ALL ON FUNCTION get_nav_private_data(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_nav_private_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nav_snapshot_data(integer) TO anon, authenticated;
