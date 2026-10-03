-- ============================================================
-- nav 今日热门修复：私密分类隔离 + 北京时间口径
--
-- 问题 1（隐私）：get_today_hot_links() 只过滤 links.is_private，
--   未排除私密分类下的链接。分类私密不会级联到链接行，
--   导致私密分类里的链接被点击后，会出现在公开首页的今日热门中。
--   修复：JOIN categories，排除 is_private = true 的分类。
--
-- 问题 2（口径）："今日"按数据库时区（UTC）切天，北京时间每天
--   08:00 才重置。修复：按 Asia/Shanghai 切天。
--
-- 向后兼容：只 CREATE OR REPLACE 这一个函数，签名不变，
--   不修改任何表、策略或其他函数。
-- ============================================================

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
