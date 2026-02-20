# 收藏夹导航网站

一个现代化的个人收藏夹导航网站，支持分类管理、搜索、隐私模式等功能。

![Version](https://img.shields.io/badge/version-1.4.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 特性

### 核心功能
- 📁 **分类管理** - 支持自定义分类和排序
- 🔍 **智能搜索** - 实时搜索标题和描述
- 🌓 **深色模式** - 自动适配系统主题
- 📱 **响应式设计** - 完美适配手机、平板、电脑
- 🔐 **隐私模式** - 隐藏敏感链接，输入"开门"解锁
- 🎛️ **后台管理** - 可视化管理分类和链接
- 🖼️ **每日壁纸** - 必应每日壁纸背景
- 💬 **每日一言** - 随机名言展示
- 🔥 **今日热门** - 侧边栏展示当日点击排名前 5 的链接

### 安全特性
- 🔒 **RLS 策略** - 数据库行级安全，只有管理员邮箱可以写入
- 🛡️ **安全头** - X-Frame-Options、CSP、Referrer-Policy 等
- 👤 **管理员校验** - 前端 + 数据库双重身份校验
- 🔑 **密钥保护** - 环境变量不入库，诊断页面不暴露密钥值

### 性能优化
- ⚡ **并行查询** - Promise.all 并行加载数据
- 🎯 **React.memo** - 完整属性比较，减少不必要的重渲染
- 📉 **防抖优化** - 实时订阅回调 1s 防抖
- 🖼️ **壁纸直加载** - 浏览器直接请求壁纸 URL，无 JS 中间层
- 🔄 **懒加载图标** - Favicon 按需加载，不阻塞首屏

## 🚀 快速开始

### 环境要求
- Node.js 18.17 或更高版本
- npm 包管理器
- [Supabase](https://supabase.com) 账号

### 三步启动

```bash
# 1. 克隆 & 安装
git clone https://github.com/your-username/nav-website.git
cd nav-website
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 Supabase 配置和管理员邮箱

# 3. 启动
npm run dev
```

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin
- 诊断：http://localhost:3000/admin/diagnostic

> **首次部署？** 👉 查看 **[详细搭建步骤（SETUP.md）](./SETUP.md)**，包含 Supabase 项目创建、数据库初始化、管理员账号创建、Vercel 部署的完整流程。

## 📂 项目结构

```
nav-website/
├── app/
│   ├── page.tsx                 # 首页
│   ├── layout.tsx               # 根布局（ErrorBoundary + OG 元数据）
│   ├── icon.svg                 # 网站图标
│   ├── admin/
│   │   ├── page.tsx             # 管理员登录
│   │   ├── dashboard/           # 后台管理面板
│   │   │   ├── category/[id]/   # 分类编辑
│   │   │   └── link/[id]/       # 链接编辑
│   │   └── diagnostic/          # 认证诊断工具
│   ├── components/
│   │   ├── ErrorBoundary.tsx    # 错误边界
│   │   ├── Sidebar.tsx          # 侧边栏（分类导航 + 今日热门）
│   │   ├── CategorySection.tsx  # 分类区域（完整 memo 比较）
│   │   ├── NavCard.tsx          # 链接卡片（点击上报 + 完整 memo 比较）
│   │   ├── SearchBar.tsx        # 搜索框
│   │   ├── BackToTop.tsx        # 返回顶部
│   │   ├── ThemeToggle.tsx      # 主题切换
│   │   └── Toast.tsx            # Toast 通知
│   ├── lib/supabase.ts          # Supabase 客户端 + 类型定义
│   ├── utils/
│   │   ├── adminCache.ts        # 后台缓存（2 分钟）
│   │   ├── externalApi.ts       # 每日一言 API（24 小时缓存）
│   │   ├── favicon.ts           # Favicon 获取（内存 + localStorage 缓存）
│   │   └── throttle.ts          # 节流/防抖
│   ├── data.ts                  # 本地备用数据
│   ├── types.ts                 # 类型定义（NavLink、HotLink、NavCategory）
│   └── globals.css              # 全局样式
├── supabase/schema.sql          # 数据库建表 + RLS 策略 + 点击记录表
├── middleware.ts                # Next.js 中间件
├── .env.local.example           # 环境变量模板
├── vercel.json                  # Vercel 部署配置
├── SETUP.md                     # 详细搭建步骤
└── README.md                    # 本文件
```

## 🎯 功能说明

### 隐私模式
在搜索框输入 `开门` 解锁隐藏内容，点击"退出隐私模式"返回。

### 今日热门
侧边栏自动展示当日被点击最多的 5 个链接，显示网站图标和点击次数。数据存储在 `link_clicks` 表中，每天自动清理历史记录。

### 后台管理
访问 `/admin` 登录，支持分类和链接的增删改查、排序、私密标记、数据统计。

### 诊断工具
访问 `/admin/diagnostic` 查看认证状态、环境变量、数据库连通性、RLS 权限等完整诊断信息。

## 🛠️ 技术栈

- **Next.js 16** - React 框架
- **React 19** - UI 库
- **TypeScript 5** - 类型安全
- **Tailwind CSS 4** - 样式框架
- **Supabase** - 数据库 + 认证 + 实时订阅

## 📄 许可证

MIT License

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
