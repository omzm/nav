# 收藏夹导航

个人收藏网站：基于 Next.js + Supabase 的导航收藏夹。

## 功能

- 分类导航：自定义分类、图标与排序
- 即时搜索：按标题和描述快速过滤链接
- 隐私模式：私密分类/链接默认隐藏，在搜索框输入「开门」后临时查看
- 今日热门：侧边栏展示当天点击最多的前 5 个链接
- 后台管理：链接与分类的新增、编辑、删除、排序、私密标记与统计概览
- 深色模式、每日壁纸、每日一言

## 快速开始

环境要求：Node.js 18.17+、Supabase 项目。

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

`.env.local` 需要：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon public key
NEXT_PUBLIC_ADMIN_EMAIL=你的管理员邮箱
ADMIN_SESSION_SECRET=随机长字符串（openssl rand -hex 32 生成）
```

完整部署流程见 [SETUP.md](./SETUP.md)。

## 技术栈

Next.js 16 / React 19 / TypeScript 5 / Tailwind CSS 4 / Supabase
