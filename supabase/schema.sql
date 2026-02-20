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
CREATE POLICY "Allow public read access on public categories"
  ON categories FOR SELECT
  USING (is_private = FALSE OR auth.uid() IS NOT NULL);

-- 创建策略：公开链接对所有人可见，私密链接只对认证用户可见
CREATE POLICY "Allow public read access on public links"
  ON links FOR SELECT
  USING (is_private = FALSE OR auth.uid() IS NOT NULL);

-- 创建策略：只有管理员可以修改（请将 'your-admin@example.com' 替换为你的管理员邮箱）
CREATE POLICY "Allow admin to insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = 'your-admin@example.com');

CREATE POLICY "Allow admin to update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'your-admin@example.com');

CREATE POLICY "Allow admin to delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'your-admin@example.com');

CREATE POLICY "Allow admin to insert links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = 'your-admin@example.com');

CREATE POLICY "Allow admin to update links"
  ON links FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'your-admin@example.com');

CREATE POLICY "Allow admin to delete links"
  ON links FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'your-admin@example.com');

-- 创建点击记录表
CREATE TABLE link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- 所有人可写入点击记录
CREATE POLICY "Allow anyone to insert link_clicks"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- 所有人可读取（用于聚合热门排名）
CREATE POLICY "Allow anyone to read link_clicks"
  ON link_clicks FOR SELECT
  USING (true);

-- 每天凌晨 0:05 (UTC) 自动清理前一天的点击记录
SELECT cron.schedule(
  'clean-old-link-clicks',
  '5 0 * * *',
  $$DELETE FROM link_clicks WHERE clicked_at < CURRENT_DATE$$
);
