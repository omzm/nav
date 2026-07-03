-- Existing database upgrade: allow the server-rendered homepage snapshot to include
-- private categories and links so the "开门" client-side private mode has data to show.
-- This does not change table SELECT policies. It exposes only this prepared homepage
-- snapshot shape through a SECURITY DEFINER RPC.

CREATE TABLE IF NOT EXISTS site_stats (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

INSERT INTO site_stats (key, value)
VALUES ('total_views', 0)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to read site_stats" ON site_stats;

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

GRANT EXECUTE ON FUNCTION increment_site_view() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nav_snapshot_data(integer) TO anon, authenticated;
