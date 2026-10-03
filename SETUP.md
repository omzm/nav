# 部署指南

这份文档说明如何把本项目部署到 Supabase + Vercel，并给出本地开发、数据库升级和常见问题处理方式。

## 1. 准备 Supabase

1. 打开 [Supabase](https://supabase.com) 并登录。
2. 创建一个新项目。
3. 进入 **Project Settings -> API**。
4. 记录以下两个值：

| 环境变量 | Supabase 位置 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | 浏览器端公开 key |

还需要确定一个管理员邮箱，后面会用于 RLS 写入权限和后台登录：

```bash
NEXT_PUBLIC_ADMIN_EMAIL=your-admin@example.com
```

另外需要一个服务端会话密钥（用于签发后台登录 Cookie，安全修复 S2 引入），
生成一个随机长字符串即可，例如 `openssl rand -hex 32` 的输出：

```bash
ADMIN_SESSION_SECRET=一串随机字符
```

## 2. 初始化数据库

新项目直接执行完整 schema：

1. 打开 Supabase 控制台。
2. 进入 **SQL Editor**。
3. 打开本仓库的 `supabase/schema.sql`。
4. 把所有 `your-admin@example.com` 替换成你的管理员邮箱。
5. 复制完整 SQL 到 SQL Editor 并执行。

执行后会创建：

- `categories` 分类表
- `links` 链接表
- `link_clicks` 点击记录表
- 常用索引
- RLS 策略
- `get_today_hot_links()` RPC
- `get_nav_snapshot_data()` RPC

## 3. 创建管理员账号

1. 在 Supabase 控制台进入 **Authentication -> Users**。
2. 点击 **Add user -> Create new user**。
3. 填写邮箱和密码。
4. 邮箱必须和 `schema.sql` 里的管理员邮箱完全一致。
5. 勾选 **Auto Confirm User**。
6. 创建用户。

三处邮箱必须一致：

| 位置 | 用途 |
| --- | --- |
| `schema.sql` 里的管理员邮箱 | 数据库 RLS 写入权限 |
| Supabase Authentication 用户邮箱 | 登录认证 |
| `.env.local` / Vercel 环境变量里的 `NEXT_PUBLIC_ADMIN_EMAIL` | 前端后台校验 |

## 4. 本地开发

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

编辑 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon public key
NEXT_PUBLIC_ADMIN_EMAIL=你的管理员邮箱
ADMIN_SESSION_SECRET=一串随机字符（openssl rand -hex 32 生成）
```

访问地址：

- 首页：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`
- 诊断：`http://localhost:3000/admin/diagnostic`

## 5. 部署到 Vercel

推荐用 GitHub 仓库部署：

1. 把项目推送到 GitHub。
2. 打开 [Vercel](https://vercel.com)。
3. 点击 **Add New -> Project**。
4. 选择你的 GitHub 仓库并导入。
5. 添加环境变量：

| 变量名 | 值 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `NEXT_PUBLIC_ADMIN_EMAIL` | 管理员邮箱 |
| `ADMIN_SESSION_SECRET` | 随机长字符串（`openssl rand -hex 32` 生成），用于签发后台登录 Cookie |

6. 点击 **Deploy**。

部署完成后，打开 Vercel 分配的域名测试首页和 `/admin`。

> 注意：`ADMIN_SESSION_SECRET` 变更后，所有已登录的后台会话会失效，需要重新登录。

## 6. 已有数据库升级

如果你的数据库来自旧版本，不要重复执行完整 `schema.sql`。按需要执行增量 SQL：

### 今日热门

执行：

```text
supabase/update-nav-snapshot-hot-links.sql
```

它会补充：

- `idx_link_clicks_clicked_at_link_id` 索引
- `get_today_hot_links(limit_count integer default 5)` RPC

### 首页快照和隐私模式

执行：

```text
supabase/update-nav-snapshot-private-rpc.sql
```

它会补充：

- `get_nav_snapshot_data(limit_count integer default 5)` RPC

这个 RPC 让首页服务端快照能拿到完整分类和链接，浏览器端输入 `开门` 后才显示私密内容。

### 私密数据服务端隔离（安全修复 S1，2026-10-03 起）

此前 `get_nav_snapshot_data()` 会返回全部（含私密）分类和链接，
私密内容会出现在首页初始 HTML 中。修复后快照只含公开数据，
"开门"口令校验与私密数据下发走服务端。请执行：

```text
supabase/migrations/20261003_private_data_isolation.sql
```

它会：

- 重定义 `get_nav_snapshot_data()`：只返回公开分类/链接，统计只计公开项
- 新增 `get_nav_private_data(p_phrase text)` RPC：口令正确才返回私密数据
  （默认口令 `开门`，可用 `ALTER DATABASE ... SET app.settings.unlock_phrase` 修改）

**部署顺序**：先执行 SQL，再部署新代码（旧代码 + 新 SQL 会导致"开门"暂时无数据；
新代码 + 旧 SQL 会导致"开门"提示接口未就绪，均不影响公开内容展示）。

**回滚**：执行 `supabase/migrations/20261003_private_data_isolation_rollback.sql`
可恢复旧 RPC 定义；代码侧回滚到 `backup/2026-10-03-pre-security-fix` 分支即可。

### 分类图标迁移

可选执行：

```text
supabase/update-category-icons-iconfont.sql
```

如果旧数据里的分类图标还是 emoji，你也可以直接在后台分类编辑页手动修改。

## 7. 功能检查清单

部署后建议检查：

- 首页是否能正常展示分类和链接。
- 搜索框是否能过滤链接。
- 输入 `开门` 是否显示私密分类和链接。
- 点击链接后，今日热门是否会在当天统计中更新。
- `/admin` 是否能登录。
- 后台新增、编辑、删除、排序后，首页是否刷新。
- `/admin/diagnostic` 是否显示数据库连接和权限正常。

## 8. 常见问题

### 能登录后台，但保存失败

通常是三处管理员邮箱不一致：

- Supabase Auth 用户邮箱
- `schema.sql` 中 RLS 策略的邮箱
- `NEXT_PUBLIC_ADMIN_EMAIL`

保持大小写和字符完全一致后重新测试。

### 首页输入 `开门` 仍然没有私密内容

检查数据库是否执行了：

```text
supabase/update-nav-snapshot-private-rpc.sql
```

然后在后台保存一次任意分类或链接，触发首页快照刷新。

### 今日热门为空

今日热门只统计当天点击。先在首页点击几个链接，再刷新页面查看。

### 构建时提示 Supabase 环境变量未配置

本地没有 `.env.local` 或 Vercel 没有配置环境变量。补齐：

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_ADMIN_EMAIL
```

### GitHub Desktop 显示上传包文件夹

不要把临时上传包放进仓库根目录。真正的仓库目录是 `E:\nav`，里面应直接包含 `app`、`supabase`、`package.json` 等文件。

## 9. 维护建议

- 修改数据库结构时，同步更新 `supabase/schema.sql` 和对应的 `supabase/update-*.sql`。
- 修改首页数据结构时，同步检查 `app/lib/nav-snapshot.ts` 和 Supabase RPC 返回字段。
- 更新后台保存逻辑时，确认会调用 `revalidateNavSnapshot()`。
- 发布前执行：

```bash
npm run lint
npx tsc --noEmit
npm run build
```

