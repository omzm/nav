# 收藏夹导航

一个用于个人收藏、工具导航和团队常用链接管理的 Next.js 网站。前台面向快速访问，后台面向分类、链接、排序和隐私内容维护。

![Version](https://img.shields.io/badge/version-1.4.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 功能概览

- 分类导航：按分类展示链接，支持后台自定义分类、图标和排序。
- 即时搜索：在首页搜索标题和描述，快速过滤链接。
- 隐私模式：默认隐藏私密分类和私密链接，在搜索框输入 `开门` 后临时显示。
- 今日热门：记录链接点击，侧边栏展示当天访问最多的前 5 个链接。
- 后台管理：支持分类和链接的新增、编辑、删除、排序、私密标记和统计概览。
- 深色模式：本地保存主题偏好。
- 每日壁纸和一言：首页展示必应壁纸背景和服务端缓存的一言内容。
- 诊断工具：检查环境变量、登录状态、数据库连接和 RLS 写入权限。

## 性能设计

- 首页使用服务端快照读取导航数据，减少访客端 Supabase 请求。
- 快照数据通过 `get_nav_snapshot_data()` RPC 聚合，后台保存后主动刷新缓存。
- 今日热门通过 `get_today_hot_links()` 在数据库侧聚合。
- 首页链接 favicon 滚动到视口附近才开始加载，避免首屏一次性请求所有图标。
- 分类区和链接卡片使用 `React.memo` 降低重复渲染。
- 后台实时订阅分类和链接变化，并对刷新做防抖处理。

## 快速开始

环境要求：

- Node.js 18.17 或更高版本
- npm
- Supabase 项目

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

打开：

- 首页：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`
- 诊断：`http://localhost:3000/admin/diagnostic`

`.env.local` 至少需要：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon public key
NEXT_PUBLIC_ADMIN_EMAIL=你的管理员邮箱
```

完整部署流程见 [SETUP.md](./SETUP.md)。

## 目录结构

```text
.
├── app/
│   ├── actions/                  # 服务端 action，例如刷新首页快照
│   ├── admin/                    # 登录、诊断、初始化和后台管理页面
│   ├── api/                      # 点击上报 API
│   ├── components/               # 首页和通用组件
│   ├── lib/                      # Supabase、每日一言、首页快照、本地管理员
│   ├── utils/                    # 后台缓存、favicon、节流工具
│   ├── data.ts                   # Supabase 不可用时的本地备用数据
│   ├── globals.css               # 全局样式
│   ├── icon.svg                  # 站点图标
│   ├── layout.tsx                # 根布局
│   ├── loading.tsx               # 首页 loading 骨架
│   └── page.tsx                  # 首页入口
├── supabase/
│   ├── schema.sql                # 建表、RLS、索引和 RPC
│   ├── update-category-icons-iconfont.sql
│   ├── update-nav-snapshot-hot-links.sql
│   └── update-nav-snapshot-private-rpc.sql
├── middleware.ts                 # 后台访问中间件
├── next.config.ts
├── package.json
├── SETUP.md
└── README.md
```

## 核心逻辑

### 首页快照

首页通过 `app/lib/nav-snapshot.ts` 读取导航快照。优先调用 Supabase RPC `get_nav_snapshot_data()`，如果 RPC 不存在或网络失败，则回退到表查询；如果表查询也失败，则使用 `app/data.ts` 的本地备用数据。

快照由 Next 缓存 45 秒，并使用 `nav-snapshot` tag。后台新增、编辑、删除或排序后，会调用 `revalidateNavSnapshot()` 主动刷新。

### 隐私模式

私密内容仍由数据库字段 `is_private` 标记：

- 分类可以设为私密。
- 单个链接可以设为私密。
- 首页默认隐藏私密分类和私密链接。
- 在搜索框输入 `开门` 后，当前浏览器页面临时显示私密内容。

`get_nav_snapshot_data()` 使用 `SECURITY DEFINER` 返回首页需要的快照形状，让前端有数据可显示；它不开放表级写入权限，也不改变 RLS 的管理限制。

### 今日热门

链接点击通过 `app/api/link-click/route.ts` 写入 `link_clicks` 表。首页侧边栏调用快照里的 `hotLinks`，展示当天点击最多的前 5 条公开链接。

### 图标

分类图标支持两种写法：

- emoji，例如 `📁`
- 内置图标名，例如 `icon-code`、`icon-design`、`icon-book`

链接图标默认走 favicon。首页卡片会等卡片接近视口后再加载 favicon，减少首屏网络请求。

## 后台入口

- `/admin`：登录
- `/admin/dashboard`：后台首页和统计
- `/admin/dashboard/categories`：分类列表
- `/admin/dashboard/category/new`：新增分类
- `/admin/dashboard/category/[id]`：编辑分类
- `/admin/dashboard/links`：链接列表
- `/admin/dashboard/link/new`：新增链接
- `/admin/dashboard/link/[id]`：编辑链接
- `/admin/diagnostic`：诊断工具
- `/admin/init`：数据库初始化辅助
- `/admin/env-check`：环境变量检查

## 常用命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建
npm run start    # 启动生产服务
npm run lint     # ESLint 检查
```

## 数据库升级

新建数据库可以直接执行 `supabase/schema.sql`。

已有旧数据库请按需执行增量 SQL：

- `supabase/update-nav-snapshot-hot-links.sql`：补充点击索引和今日热门 RPC。
- `supabase/update-nav-snapshot-private-rpc.sql`：补充首页完整快照 RPC，让 `开门` 模式能显示隐藏内容。
- `supabase/update-category-icons-iconfont.sql`：可选，把示例分类图标迁移到内置图标名。

## 安全说明

- 表写入权限由 Supabase RLS 和管理员邮箱控制。
- `NEXT_PUBLIC_ADMIN_EMAIL` 只用于前端判断和显示，真正权限仍在数据库层。
- `.env.local` 不应提交到 GitHub。
- 诊断页面不会展示完整密钥值。

## 技术栈

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase
- Semi UI

