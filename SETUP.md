# 部署指南

从零开始部署本项目到 Vercel + Supabase 的完整步骤。

---

## 一、创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com)，注册/登录
2. 点击 **New Project**，填写项目名称，选择区域（推荐选离你近的），设置数据库密码
3. 等待项目创建完成（约 1-2 分钟）

### 获取密钥

项目创建完成后，进入 **Project Settings → API**，记录以下两个值：

| 名称 | 位置 | 说明 |
|------|------|------|
| `Project URL` | 页面顶部 | 格式：`https://xxxxx.supabase.co` |
| `anon public` | Project API keys 区域 | 以 `eyJ` 开头的长字符串 |

---

## 二、初始化数据库

1. 在 Supabase 控制台，进入 **SQL Editor**
2. 打开本项目的 `supabase/schema.sql` 文件
3. **重要**：将文件中所有 `your-admin@example.com` 替换为你自己的管理员邮箱
4. 将修改后的 SQL 粘贴到编辑器中，点击 **Run** 执行

执行成功后会创建：
- `categories` 表（分类）
- `links` 表（链接）
- 5 个索引
- RLS 安全策略（只有你的邮箱可以增删改数据）

---

## 三、创建管理员账号

1. 在 Supabase 控制台，进入 **Authentication → Users**
2. 点击 **Add user → Create new user**
3. 填写：
   - **Email**：和上一步 SQL 中填写的邮箱 **完全一致**
   - **Password**：设置一个密码
   - 勾选 **Auto Confirm User**
4. 点击 **Create user**

---

## 四、部署到 Vercel

### 方式一：从 GitHub 部署（推荐）

1. 将本项目推送到你的 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com)，登录后点击 **Add New → Project**
3. 选择你的 GitHub 仓库，点击 **Import**
4. 在 **Environment Variables** 中添加以下三个变量：

| 变量名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | 第一步获取的 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 第一步获取的 anon public key |
| `NEXT_PUBLIC_ADMIN_EMAIL` | 你的管理员邮箱 |

5. 点击 **Deploy**，等待部署完成

### 方式二：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目目录下执行
vercel

# 按提示操作，然后在 Vercel 控制台添加环境变量后重新部署
vercel --prod
```

---

## 五、本地开发

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/你的仓库名.git
cd 你的仓库名

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 Supabase URL、Key 和管理员邮箱

# 4. 启动开发服务器
npm run dev
```

打开 `http://localhost:3000` 查看网站，`http://localhost:3000/admin` 进入后台。

---

## 六、关键文件说明

```
├── app/
│   ├── page.tsx                 # 首页
│   ├── layout.tsx               # 根布局
│   ├── admin/
│   │   ├── page.tsx             # 管理员登录页
│   │   ├── dashboard/           # 后台管理页
│   │   └── diagnostic/          # 认证诊断页（调试用）
│   ├── components/              # 所有组件
│   ├── lib/supabase.ts          # Supabase 客户端
│   ├── utils/                   # 工具函数
│   └── config/                  # 配置
├── supabase/schema.sql          # 数据库建表 SQL
├── middleware.ts                # Next.js 中间件
├── .env.local.example           # 环境变量模板
└── vercel.json                  # Vercel 部署配置
```

---

## 七、注意事项

### 安全相关

- **`schema.sql` 中的邮箱**：必须替换为你自己的邮箱后再执行，这是数据库层面的权限控制
- **`.env.local`**：包含密钥，已在 `.gitignore` 中排除，不会被提交到 GitHub
- **`NEXT_PUBLIC_ADMIN_EMAIL`**：虽然是前端可见的变量，但仅用于客户端 UI 校验，真正的安全由 Supabase RLS 策略保证

### 三处邮箱必须一致

| 位置 | 说明 |
|------|------|
| `schema.sql` 中的 RLS 策略 | 数据库层面限制谁能写入 |
| Supabase Authentication 中的用户 | 登录认证用 |
| `.env.local` 中的 `NEXT_PUBLIC_ADMIN_EMAIL` | 前端校验用 |

这三处的邮箱必须完全相同，否则会出现能登录但无法操作数据，或能操作数据但前端校验不通过的情况。

### 诊断工具

如果遇到登录或权限问题，访问 `/admin/diagnostic` 可以查看完整的认证诊断信息，包括：
- 环境变量是否配置
- Session 是否有效
- 管理员邮箱是否匹配
- 数据库连通性
- RLS 写入权限
