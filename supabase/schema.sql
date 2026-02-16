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
CREATE INDEX idx_links_category_id ON links(category_id);
CREATE INDEX idx_links_order ON links("order");

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

-- 创建策略：只有认证用户可以修改
CREATE POLICY "Allow authenticated users to insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update links"
  ON links FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete links"
  ON links FOR DELETE
  TO authenticated
  USING (true);
