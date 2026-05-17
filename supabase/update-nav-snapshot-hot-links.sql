-- Existing database upgrade for the server snapshot homepage.
-- Run this once in Supabase SQL Editor if your database was created before
-- get_today_hot_links() and the composite click index were added to schema.sql.

CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at_link_id
  ON link_clicks(clicked_at, link_id);

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
  WHERE c.clicked_at >= date_trunc('day', now())
    AND c.clicked_at < date_trunc('day', now()) + interval '1 day'
    AND COALESCE(l.is_private, false) = false
  GROUP BY l.id, l.title, l.url, l.icon
  ORDER BY click_count DESC, l.title ASC
  LIMIT GREATEST(limit_count, 0);
$$;
