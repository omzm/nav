# 收藏夹导航网站

一个现代化的个人收藏夹导航网站，支持分类管理、搜索、隐私模式等功能。

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 特性

### 核心功能
- 🎨 **现代化 UI** - 精美的渐变背景和流畅动画
- 📁 **分类管理** - 支持自定义分类和排序
- 🔍 **智能搜索** - 实时搜索标题和描述
- 🌓 **深色模式** - 自动适配系统主题
- 📱 **响应式设计** - 完美适配手机、平板、电脑
- 🔐 **隐私模式** - 隐藏敏感链接，输入"开门"解锁
- 🎛️ **后台管理** - 可视化管理分类和链接
- 📊 **实时统计** - 数据统计和分析
- 🖼️ **每日壁纸** - 必应每日壁纸背景
- 💬 **每日一言** - 随机名言展示

### 性能优化
- ⚡ **极速加载** - 首屏加载 < 1.5s
- 💾 **智能缓存** - localStorage + sessionStorage 多层缓存
- 🚀 **虚拟滚动** - 大数据量流畅渲染
- 📉 **节流优化** - 滚动和搜索事件优化
- 🎯 **React.memo** - 减少不必要的重渲染
- 🌐 **CDN 优化** - 图片和资源 CDN 加速

## 🚀 快速开始

### 环境要求
- Node.js 18.17 或更高版本
- npm 或 yarn 包管理器
- Supabase 账号（用于数据存储）

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/nav-website.git
cd nav-website
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp .env.local.example .env.local

# 编辑 .env.local，填入你的 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **初始化数据库**
- 登录 Supabase Dashboard
- 创建两个表：`categories` 和 `links`
- 运行 SQL 脚本（见下方）

5. **启动开发服务器**
```bash
npm run dev
```

6. **访问网站**
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin

## 📦 数据库配置

### 创建 categories 表
```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
```

### 创建 links 表
```sql
CREATE TABLE links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  "order" INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE links;

-- 创建索引
CREATE INDEX idx_links_category_id ON links(category_id);
CREATE INDEX idx_links_order ON links("order");
```

### 配置 RLS（行级安全）
```sql
-- Categories 表
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看分类" ON categories
  FOR SELECT USING (true);

CREATE POLICY "只允许认证用户修改分类" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Links 表
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看链接" ON links
  FOR SELECT USING (true);

CREATE POLICY "只允许认证用户修改链接" ON links
  FOR ALL USING (auth.role() = 'authenticated');
```

## 🎯 功能使用

### 前台功能

#### 1. 浏览链接
- 侧边栏分类导航
- 点击分类筛选链接
- 搜索框快速查找

#### 2. 隐私模式
- 在搜索框输入 `开门` 解锁隐藏内容
- 显示标记为私密的分类和链接
- 点击"退出隐私模式"返回

#### 3. 主题切换
- 点击右下角主题按钮
- 自动适配系统主题

### 后台功能

#### 1. 访问后台
- URL: `/admin`
- 需要 Supabase 账号登录

#### 2. 管理分类
- 添加、编辑、删除分类
- 设置图标和排序
- 标记为私密

#### 3. 管理链接
- 添加、编辑、删除链接
- 选择所属分类
- 设置排序和私密性

#### 4. 查看统计
- 分类和链接总数
- 公开/私密数量
- 平均每分类链接数

## 📂 项目结构

```
nav-website/
├── app/                      # Next.js App Router
│   ├── admin/               # 后台管理
│   │   ├── dashboard/       # 管理面板
│   │   └── page.tsx         # 登录页
│   ├── components/          # 组件
│   │   ├── BackToTop.tsx    # 返回顶部
│   │   ├── CategorySection.tsx  # 分类区域
│   │   ├── NavCard.tsx      # 链接卡片
│   │   ├── SearchBar.tsx    # 搜索框
│   │   ├── Sidebar.tsx      # 侧边栏
│   │   ├── ThemeToggle.tsx  # 主题切换
│   │   └── VirtualCategories.tsx  # 虚拟滚动
│   ├── config/              # 配置文件
│   │   └── virtualScroll.ts # 虚拟滚动配置
│   ├── lib/                 # 工具库
│   │   └── supabase.ts      # Supabase 客户端
│   ├── utils/               # 工具函数
│   │   ├── adminCache.ts    # 后台缓存
│   │   ├── cache.ts         # 前台缓存
│   │   ├── externalApi.ts   # 外部 API
│   │   ├── favicon.ts       # Favicon 处理
│   │   └── throttle.ts      # 节流防抖
│   ├── data.ts              # 本地数据（后备）
│   ├── globals.css          # 全局样式
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   └── types.ts             # 类型定义
├── public/                  # 静态资源
├── .env.local.example       # 环境变量模板
├── .gitignore              # Git 忽略文件
├── next.config.ts          # Next.js 配置
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目文档
```

## 🔧 配置说明

### 性能配置

#### 虚拟滚动配置
编辑 `app/config/virtualScroll.ts`：
```typescript
export const VIRTUAL_SCROLL_CONFIG = {
  THRESHOLD: 50,        // 超过 50 个链接启用虚拟滚动
  OVERSCAN_COUNT: 2,    // 预渲染数量
  CARD_HEIGHT: 120,     // 卡片高度
  // ... 其他配置
};
```

#### 缓存配置
- 前台缓存：5 分钟（localStorage）
- 后台缓存：2 分钟（sessionStorage）
- 外部 API：24 小时（localStorage）

### 主题配置

编辑 `app/globals.css` 自定义颜色。

## 🚢 部署

### Vercel 部署（推荐）

1. 推送到 GitHub
2. 导入到 Vercel
3. 配置环境变量
4. 自动部署

### 自托管部署

```bash
npm run build
npm run start
```

## 📊 性能指标

- Performance: 95+ ⭐
- 首屏加载: < 1.5s ⚡
- 滚动流畅度: 60 FPS ⚡

## 🛠️ 技术栈

- **Next.js 16** - React 框架
- **React 19** - UI 库
- **TypeScript 5** - 类型安全
- **Tailwind CSS 4** - 样式框架
- **Supabase** - 数据库 + 认证
- **react-window** - 虚拟滚动

## 📄 许可证

MIT License

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
