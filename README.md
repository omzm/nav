# 个人导航网站

基于 Cloudflare Workers + D1 数据库构建的个人导航网站。

## ✨ 特性

- 🌐 全球 CDN 加速
- 💾 Cloudflare D1 数据库
- 🔒 自动 HTTPS
- 📱 响应式设计
- 🎨 简洁美观的界面
- ✅ 完全免费

## 🚀 快速部署

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd <your-repo-name>
```

### 2. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare

```bash
wrangler login
```

### 4. 创建 D1 数据库

```bash
cd cloudflare
wrangler d1 create nav-database
```

复制返回的 `database_id`。

### 5. 更新配置

编辑 `cloudflare/wrangler.toml`，将 `database_id` 替换为你的 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "nav-database"
database_id = "你的-database-id"
```

### 6. 初始化数据库

```bash
wrangler d1 execute nav-database --remote --file=./schema.sql
```

### 7. 部署 API

```bash
npm install
wrangler deploy
```

记录返回的 Worker URL，例如：`https://nav-api.xxx.workers.dev`

### 8. 修改前端配置

编辑 `nav.html` 第 370 行左右，修改 API 地址：

```javascript
const API_BASE_URL = 'https://你的-worker-url/api';
```

### 9. 部署前端到 Cloudflare Pages

1. 访问 [Cloudflare Pages](https://dash.cloudflare.com/)
2. 创建项目，连接此 GitHub 仓库
3. 构建设置：
   - Build command: (留空)
   - Build output directory: `/`
4. 部署完成！

## 📖 详细文档

查看 [cloudflare/README.md](cloudflare/README.md) 获取完整部署指南。

## 🔧 本地测试

```bash
cd cloudflare
wrangler dev
```

## 📝 License

MIT
