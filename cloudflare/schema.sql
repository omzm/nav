-- 数据库初始化 SQL
-- 用于 Cloudflare D1

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建网站表
CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category_slug TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_slug) REFERENCES categories(slug) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category_slug);

-- 创建设置表
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认分类
INSERT OR IGNORE INTO categories (slug, name, icon, sort_order) VALUES
('search', '搜索引擎', '🔍', 1),
('social', '社交媒体', '💬', 2),
('video', '视频网站', '🎬', 3),
('shopping', '购物网站', '🛒', 4),
('dev', '开发工具', '💻', 5);

-- 插入默认网站
INSERT OR IGNORE INTO sites (name, url, category_slug, sort_order) VALUES
('百度', 'https://www.baidu.com', 'search', 1),
('谷歌', 'https://www.google.com', 'search', 2),
('必应', 'https://www.bing.com', 'search', 3),
('微博', 'https://www.weibo.com', 'social', 1),
('知乎', 'https://www.zhihu.com', 'social', 2),
('哔哩哔哩', 'https://www.bilibili.com', 'social', 3),
('YouTube', 'https://www.youtube.com', 'video', 1),
('B站', 'https://www.bilibili.com', 'video', 2),
('腾讯视频', 'https://v.qq.com', 'video', 3),
('淘宝', 'https://www.taobao.com', 'shopping', 1),
('京东', 'https://www.jd.com', 'shopping', 2),
('亚马逊', 'https://www.amazon.cn', 'shopping', 3),
('GitHub', 'https://github.com', 'dev', 1),
('Stack Overflow', 'https://stackoverflow.com', 'dev', 2),
('菜鸟教程', 'https://www.runoob.com', 'dev', 3);

-- 插入默认密码 (admin123 的哈希值)
-- 注意：实际部署时会在 Workers 代码中使用 bcrypt
INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES
('admin_password', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
