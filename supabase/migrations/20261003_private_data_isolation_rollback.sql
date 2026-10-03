-- ============================================================
-- 回滚脚本：恢复 S1 修复前的 RPC 定义
-- 在 Supabase Dashboard -> SQL Editor 中执行
-- 对应迁移：20261003_private_data_isolation.sql
-- ============================================================

-- 删除私密数据 RPC
DROP FUNCTION IF EXISTS get_nav_private_data(text);

-- 恢复原来的首页快照 RPC（返回公开+私密全部数据）
-- 注意：恢复后"开门"前的页面源码/RPC 调用将重新包含私密链接
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
          'isPrivate', COALESCE(c.is_private, false),
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
          ), '[]'::jsonb)
        )
        ORDER BY c."order" ASC
      )
      FROM categories c
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
      'categoryCount', (SELECT COUNT(*) FROM categories),
      'linkCount', (SELECT COUNT(*) FROM links),
      'totalViewCount', COALESCE((SELECT value FROM site_stats WHERE key = 'total_views'), 0)
    ),
    'generatedAt', now()
  );
$$;

GRANT EXECUTE ON FUNCTION get_nav_snapshot_data(integer) TO anon, authenticated;
