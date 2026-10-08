# 部署指南

## 1. 准备 Supabase

1. 在 [Supabase](https://supabase.com) 创建一个新项目。
2. 进入 **Project Settings -> Data API**，记录：
   - `NEXT_PUBLIC_SUPABASE_URL`（Project URL）
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon public）
   - `SUPABASE_SERVICE_ROLE_KEY`（service_role secret，用于初始化管理员）
3. 进入 **Project Settings -> Database**，用 Connection Pooling 的 session 模式连接串拼出：
   - `DATABASE_URL=postgresql://postgres.项目ref:数据库密码@aws-0-区域.pooler.supabase.com:5432/postgres`

## 2. 填环境变量

```bash
NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key
SUPABASE_SERVICE_ROLE_KEY=Supabase service_role secret
ADMIN_SESSION_SECRET=随机长字符串（openssl rand -hex 32 生成）
DATABASE_URL=上面的 pooler 连接串
```

## 3. 部署

- **Vercel**：导入 GitHub 仓库，填好上面 5 个环境变量，点 Deploy。
- 数据库表结构、RLS 策略、RPC 函数会在构建时自动创建好，不用手动执行 SQL。
- 以后改表结构：直接改 `supabase/schema.sql`（保持幂等写法），部署时自动同步。

## 4. 初始化管理员

1. **部署完成后立刻**打开 `你的域名/admin`，会自动进入初始化向导。
   （部署后到你第一次打开这段时间，谁先访问谁就是管理员，不要拖延。）
2. 填管理员邮箱和密码（至少 8 位），点完成。
3. 直接进入工作台。初始化只执行一次，之后走正常登录。

> 更安全的做法：部署前加一个 `SETUP_TOKEN` 环境变量（任意随机字符串），
> 向导会要求输入这个口令才能初始化，彻底堵住时间窗口。

## 5. 本地开发

```bash
npm install
cp .env.local.example .env.local   # 填好上面的环境变量
npm run dev
```

- 首页：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`（首次访问走初始化向导）

## 6. 检查清单

- 首页正常展示分类和链接，搜索可用
- 输入 `开门` 显示私密内容
- `/admin` 可登录，后台增删改排序后首页刷新

## 7. 常见问题

**今日热门为空**：只统计当天点击，先点几个链接再刷新。

**初始化页面一直出现**：说明管理员还没建好；检查 `SUPABASE_SERVICE_ROLE_KEY` 是否配置正确。
