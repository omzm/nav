<p align="center">
  <img src="app/icon.svg" width="120" height="120" alt="收藏夹导航 Logo" />
</p>

# 收藏夹导航

个人收藏网站：基于 Next.js + Supabase 的导航收藏夹。

## 功能

- 分类导航：自定义分类、图标与排序
- 即时搜索：按标题和描述快速过滤链接
- 隐私模式：私密分类/链接默认隐藏，在搜索框输入「开门」后临时查看
- 今日热门：侧边栏展示当天点击最多的前 3 个链接
- 提交收录：访客输入收录密码即可免登录提交新链接（密码由管理员配置）
- 后台管理：链接与分类的新增、编辑、删除、排序、私密标记、统计概览与账号安全（改邮箱/用户名/密码）
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
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role secret
ADMIN_SESSION_SECRET=随机长字符串（openssl rand -hex 32 生成）
DATABASE_URL=你的数据库 pooler 连接串
SETUP_TOKEN=初始化口令（生产环境必填，openssl rand -hex 16 生成）
SUBMIT_PASSWORD=提交收录密码（可选，不配置则不显示提交按钮）
```

首次打开 `/admin` 会进入初始化向导，设置管理员邮箱和密码即可。
```

完整部署流程见 [SETUP.md](./SETUP.md)。

## 开发

```bash
npm run dev        # 本地开发
npm run lint       # ESLint 检查
npm run typecheck  # TypeScript 类型检查
npm run build      # 生产构建（构建前自动同步数据库结构，见 SETUP.md）
```

## 技术栈

Next.js 16 / React 19 / TypeScript 5 / Tailwind CSS 4 / Supabase
