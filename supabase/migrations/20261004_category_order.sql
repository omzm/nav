-- ============================================================
-- nav 修复：私密分类按后台排序归位
-- 在 Supabase Dashboard -> SQL Editor 中执行
--
-- 背景：20261003 私密数据隔离迁移后，私密分类由服务端二次下发，
-- 前端直接拼在公开分类后面，导致"隐私列表"沉底。
-- 本迁移给两个快照 RPC 的分类对象加上 order 字段，前端按 order
-- 归并排序，恢复与原来一致的展示顺序。
-- ============================================================

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

REVOKE ALL ON FUNCTION get_nav_private_data(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_nav_private_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nav_snapshot_data(integer) TO anon, authenticated;
