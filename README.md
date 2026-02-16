# 个人导航网站 🌐

基于 Cloudflare Workers + D1 数据库的个人导航网站，全球 CDN 加速，完全免费。

## ✨ 特性

- 🚀 **全球加速** - Cloudflare CDN，访问速度极快
- 💾 **云端存储** - D1 数据库，数据永久保存
- 🔒 **安全可靠** - 自动 HTTPS，密码保护
- 📱 **响应式设计** - 完美支持手机、平板、电脑
- ✏️ **在线编辑** - 网页端直接添加、编辑、删除网站
- 💰 **完全免费** - Cloudflare 免费额度完全够用

## 🎬 快速开始

### 🌟 推荐：5 分钟部署

查看 **[快速部署.md](./快速部署.md)** - 跟着步骤操作，5 分钟搞定！

### 📖 详细教程

查看 **[Cloudflare网页部署指南.md](./Cloudflare网页部署指南.md)** - 完整图文教程，包含常见问题解答。

## 📁 项目结构

```
.
├── nav.html                      # 前端页面（部署到 Pages）
├── robots.txt                    # SEO 配置
├── sitemap.xml                   # 网站地图
├── cloudflare/                   # Cloudflare Workers
│   ├── src/index.js             # Worker 代码（API 后端）
│   ├── schema.sql               # 数据库结构
│   ├── wrangler.toml            # Cloudflare 配置
│   └── README.md                # 技术文档
├── 快速部署.md                   # 5 分钟快速部署指南
└── Cloudflare网页部署指南.md     # 详细部署教程
```

## 🎯 部署流程

1. **创建 D1 数据库** → 执行 `schema.sql` 初始化
2. **部署 Worker** → 上传 `index.js`，绑定数据库
3. **修改前端配置** → 更新 `nav.html` 中的 API 地址
4. **部署前端到 Pages** → 上传 `nav.html` 等文件

完成！你的导航网站就上线了 🎉

## 🔧 使用说明

### 默认密码

- 管理密码：`admin123`
- **部署后请立即修改！**

### 如何编辑网站

1. 访问你的导航网站
2. 点击右上角 ⚙️ 设置图标
3. 输入密码，开启编辑模式
4. 现在可以添加、编辑、删除网站了

### 如何修改密码

1. 开启编辑模式
2. 点击设置 → 修改密码
3. 输入当前密码和新密码
4. 完成！

## 💰 费用说明

Cloudflare 免费额度：
- ✅ Workers：每天 10 万次请求
- ✅ D1 数据库：每天 10 万次读取 + 10 万次写入
- ✅ Pages：无限流量
- ✅ SSL 证书：免费
- ✅ 全球 CDN：免费

对于个人导航网站，**完全够用**！

## 🔄 如何更新

### 更新 Worker（API）

1. 进入 Worker 详情页 → Edit code
2. 修改代码 → Save and deploy

### 更新前端

- **方式 A**（直接上传）：在 Pages 项目中上传新的 `nav.html`
- **方式 B**（GitHub）：推送代码到 GitHub，自动部署

### 更新数据

- **通过网页**：开启编辑模式直接修改
- **通过数据库**：D1 控制台执行 SQL 命令

## ❓ 常见问题

### API 请求失败

检查 `nav.html` 中的 `API_BASE_URL` 是否正确配置

### 无法登录

确认数据库已正确初始化，默认密码是 `admin123`

### 更多问题

查看 [Cloudflare网页部署指南.md](./Cloudflare网页部署指南.md) 的常见问题章节

## 📝 技术栈

- **前端**: HTML + TailwindCSS + Vanilla JS
- **后端**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Pages

## 📄 License

MIT License

---

**开始部署吧！** → [快速部署.md](./快速部署.md)
