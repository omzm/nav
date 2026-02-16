# Cloudflare 部署指南

## 🎉 优势

✅ **完全免费** - Cloudflare Workers 免费额度：每天 10 万次请求
✅ **全球 CDN** - 超快速度，自动 HTTPS
✅ **无需服务器** - Serverless 架构
✅ **自动扩展** - 无需担心流量
✅ **零维护** - 无需管理服务器

## 📋 前置要求

1. **Cloudflare 账号** - 免费注册：https://dash.cloudflare.com/sign-up
2. **Node.js** - 下载：https://nodejs.org/ (LTS 版本)
3. **Git** (可选) - 下载：https://git-scm.com/

## 🚀 部署步骤

### 第 1 步：安装 Wrangler CLI

打开命令行（Windows: CMD 或 PowerShell），运行：

```bash
npm install -g wrangler
```

验证安装：
```bash
wrangler --version
```

### 第 2 步：登录 Cloudflare

```bash
wrangler login
```

浏览器会自动打开，点击"允许"授权。

### 第 3 步：创建 D1 数据库

```bash
cd cloudflare
wrangler d1 create nav-database
```

**重要**：复制返回的 `database_id`，例如：
```
✅ Created database nav-database
database_id = "xxxx-xxxx-xxxx-xxxx"
```

### 第 4 步：更新配置文件

编辑 `wrangler.toml`，将 `database_id` 替换为刚才获得的 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "nav-database"
database_id = "你的-database-id"  # 替换这里！
```

### 第 5 步：初始化数据库

```bash
# 本地测试数据库
wrangler d1 execute nav-database --local --file=./schema.sql

# 生产环境数据库
wrangler d1 execute nav-database --remote --file=./schema.sql
```

### 第 6 步：部署到 Cloudflare

```bash
npm install
wrangler deploy
```

成功后会显示：
```
✨ Deployed successfully!
🌐 URL: https://nav-api.your-subdomain.workers.dev
```

**记录这个 URL**，这就是你的 API 地址！

### 第 7 步：修改前端配置

编辑 `nav.html`，修改 API 地址：

```javascript
// 找到这一行：
const API_BASE_URL = window.location.origin + '/api';

// 改为：
const API_BASE_URL = 'https://nav-api.your-subdomain.workers.dev/api';
```

### 第 8 步：部署前端到 Cloudflare Pages

#### 方案 A: 使用 GitHub（推荐）

1. 将代码上传到 GitHub
2. 访问 https://dash.cloudflare.com/
3. 进入 "Pages" → "Create a project"
4. 连接 GitHub，选择仓库
5. 设置：
   - Build command: (留空)
   - Build output directory: `/`
6. 点击 "Save and Deploy"

#### 方案 B: 直接上传

1. 访问 https://dash.cloudflare.com/
2. 进入 "Pages" → "Create a project" → "Direct Upload"
3. 拖拽 `nav.html` 和相关文件
4. 点击 "Deploy"

完成！你的网站会得到一个地址：`https://your-site.pages.dev`

## 🧪 本地测试

```bash
cd cloudflare

# 本地运行 API
wrangler dev

# 访问 http://localhost:8787/api/sites
```

在另一个终端，运行前端：
```bash
cd ..
python -m http.server 8080
# 访问 http://localhost:8080/nav.html
```

## 📊 管理数据库

### 查看数据
```bash
wrangler d1 execute nav-database --remote --command="SELECT * FROM sites"
```

### 备份数据
```bash
wrangler d1 export nav-database --remote --output=backup.sql
```

### 恢复数据
```bash
wrangler d1 execute nav-database --remote --file=backup.sql
```

## 🔧 常见问题

### Q1: `wrangler: command not found`

**解决**：
```bash
# 检查 npm 全局目录
npm config get prefix

# 添加到环境变量 PATH
# Windows: 添加 C:\Users\你的用户名\AppData\Roaming\npm
# Mac/Linux: 添加 /usr/local/bin
```

### Q2: 部署后 API 不工作

**解决**：
1. 检查 `wrangler.toml` 中的 `database_id` 是否正确
2. 确认已运行 `schema.sql` 初始化数据库
3. 查看日志：`wrangler tail`

### Q3: CORS 错误

**解决**：已在 Workers 代码中配置 CORS，如果仍有问题：
- 确认前端使用的是正确的 API URL
- 检查浏览器控制台的具体错误信息

### Q4: 数据没有同步

**解决**：
- 刷新页面
- 检查浏览器控制台是否有错误
- 确认 API 地址配置正确

## 📈 监控和日志

### 查看实时日志
```bash
wrangler tail
```

### 查看统计数据
访问 Cloudflare 控制台：
https://dash.cloudflare.com/ → Workers → 你的 Worker → Metrics

## 💰 费用说明

Cloudflare Workers 免费额度：
- ✅ 每天 10 万次请求
- ✅ 免费 SSL
- ✅ 全球 CDN
- ✅ D1 数据库：每天 10 万次读取，10 万次写入

对于个人导航网站，完全够用！

## 🔄 更新部署

修改代码后：

```bash
# 更新 API
cd cloudflare
wrangler deploy

# 更新前端（如果使用 Pages）
git push  # 自动部署
# 或直接上传新文件
```

## 🎯 完成！

现在你的导航网站已经部署到 Cloudflare：

- 🌐 前端：`https://your-site.pages.dev`
- 🔌 API：`https://nav-api.your-subdomain.workers.dev`
- 💾 数据库：Cloudflare D1
- 🚀 全球 CDN 加速
- 🔒 自动 HTTPS

享受你的全球高速导航网站吧！🎉
