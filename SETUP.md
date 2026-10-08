# 部署指南

## 1. 准备 Supabase

1. 在 [Supabase](https://supabase.com) 创建一个新项目。
2. 进入 **Project Settings -> API**，记录：
   - `NEXT_PUBLIC_SUPABASE_URL`（Project URL）
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon public key）
3. 进入 **Project Settings -> Database**，用 Connection Pooling 的 session 模式连接串拼出：
   - `DATABASE_URL=postgresql://postgres.项目ref:数据库密码@aws-0-区域.pooler.supabase.com:5432/postgres`

## 2. 填环境变量

```bash
NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key
NEXT_PUBLIC_ADMIN_EMAIL=你的管理员邮箱
ADMIN_SESSION_SECRET=随机长字符串（openssl rand -hex 32 生成）
DATABASE_URL=上面的 pooler 连接串
```

## 3. 部署

- **Vercel**：导入 GitHub 仓库，填好上面 5 个环境变量，点 Deploy。
- 数据库表结构、RLS 策略、RPC 函数会在构建时自动创建好，不用手动执行 SQL。
- 以后改表结构：往 `supabase/migrations/` 里加新的 SQL 文件（按日期命名），部署时自动按顺序执行。

## 4. 创建管理员账号

1. Supabase 控制台 → **Authentication -> Users** → Add user。
2. 邮箱必须和 `NEXT_PUBLIC_ADMIN_EMAIL` 完全一致，勾选 Auto Confirm。

## 5. 本地开发

```bash
npm install
cp .env.local.example .env.local   # 填好上面的环境变量
npm run dev
```

- 首页：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`

## 6. 检查清单

- 首页正常展示分类和链接，搜索可用
- 输入 `开门` 显示私密内容
- `/admin` 可登录，后台增删改排序后首页刷新

## 7. 常见问题

**后台能登录但保存失败**：三处邮箱不一致——Supabase Auth 用户邮箱、`NEXT_PUBLIC_ADMIN_EMAIL`。保持完全一致。

**今日热门为空**：只统计当天点击，先点几个链接再刷新。
