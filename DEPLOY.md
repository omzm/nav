# Vercel 部署指南

本指南将帮助你将导航网站部署到 Vercel。

## 前提条件

- 一个 GitHub 账号
- 一个 Vercel 账号（可以使用 GitHub 账号登录）

## 部署步骤

### 方法一：通过 GitHub 自动部署（推荐）

这是最简单的方法，Vercel 会自动检测代码变更并重新部署。

#### 1. 将代码推送到 GitHub

```bash
# 初始化 git 仓库（如果还没有）
cd nav-website
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: 导航网站"

# 在 GitHub 上创建一个新仓库，然后关联远程仓库
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送代码
git branch -M main
git push -u origin main
```

#### 2. 在 Vercel 上导入项目

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New..." → "Project"
4. 选择你刚才创建的 GitHub 仓库
5. Vercel 会自动检测到这是一个 Next.js 项目
6. 保持默认配置，点击 "Deploy"

#### 3. 等待部署完成

- 部署通常需要 1-2 分钟
- 完成后，Vercel 会提供一个 `.vercel.app` 域名
- 你可以在项目设置中绑定自定义域名

### 方法二：使用 Vercel CLI

如果你更喜欢命令行操作，可以使用 Vercel CLI。

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

按照提示完成登录（会在浏览器中打开）。

#### 3. 部署项目

在项目目录中运行：

```bash
cd nav-website
vercel
```

首次部署时，Vercel 会询问一些问题：
- Set up and deploy? → Yes
- Which scope? → 选择你的账号
- Link to existing project? → No
- What's your project's name? → nav-website（��其他名称）
- In which directory is your code located? → ./
- Want to override the settings? → No

#### 4. 生产环境部署

测试部署成功后，运行以下命令部署到生产环境：

```bash
vercel --prod
```

## 自动部署

使用 GitHub 方法部署后，每次你推送代码到 GitHub，Vercel 都会自动重新部署：

```bash
git add .
git commit -m "更新导航内容"
git push
```

## 环境变量

如果你的项目需要环境变量：

1. 在 Vercel 项目设置中找到 "Environment Variables"
2. 添加所需的环境变量
3. 重新部署项目

## 自定义域名

1. 在 Vercel 项目设置中找到 "Domains"
2. 点击 "Add Domain"
3. 输入你的域名
4. 按照提示在你的域名提供商处配置 DNS 记录

## 常见问题

### 构建失败

- 检查 `package.json` 中的依赖是否正确
- 确保代码在本地可以成功构建（`npm run build`）
- 查看 Vercel 的构建日志获取详细错误信息

### 页面显示 404

- 确保 `app/page.tsx` 文件存在
- 检查 Next.js 配置是否正确

### 样式不显示

- 确保 Tailwind CSS 配置正确
- 检查 `globals.css` 是否被正确导入

## 性能优化建议

- 使用 Next.js 的图片优化功能（`next/image`）
- 启用 Vercel 的 Edge Network 加速
- 配置适当的缓存策略

## 监控和分析

Vercel 提供了内置的分析功能：

1. 在项目设置中找到 "Analytics"
2. 启用分析功能
3. 查看访问量、性能指标等数据

## 更多资源

- [Vercel 官方文档](https://vercel.com/docs)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
