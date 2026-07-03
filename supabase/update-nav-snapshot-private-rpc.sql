-- Existing database upgrade: allow the server-rendered homepage snapshot to include
-- private categories and links so the "开门" client-side private mode has data to show.
-- This does not change table SELECT policies. It exposes only this prepared homepage
-- snapshot shape through a SECURITY DEFINER RPC.

CREATE TABLE IF NOT EXISTS site_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL DEFAULT '/',
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_site_views_viewed_at ON site_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_site_views_path ON site_views(path);

ALTER TABLE site_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to insert site_views" ON site_views;
DROP POLICY IF EXISTS "Allow anyone to read site_views" ON site_views;

CREATE POLICY "Allow anyone to insert site_views"
  ON site_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anyone to read site_views"
  ON site_views FOR SELECT
  USING (true);

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
      'totalViewCount', (SELECT COUNT(*) FROM site_views)
    ),
    'generatedAt', now()
  );
$$;

GRANT EXECUTE ON FUNCTION get_nav_snapshot_data(integer) TO anon, authenticated;
