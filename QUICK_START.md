# 快速开始指南 🚀

欢迎使用导航网站！本指南将帮助你在 5 分钟内完成项目的设置和部署。

## 📋 目录

1. [本地运行](#本地运行)
2. [自定义内容](#自定义内容)
3. [部署到 Vercel](#部署到-vercel)
4. [常见问题](#常见问题)

## 本地运行

### 步骤 1: 安装依赖

```bash
cd nav-website
npm install
```

### 步骤 2: 启动开发服务器

```bash
npm run dev
```

### 步骤 3: 查看网站

在浏览器中打开 [http://localhost:3000](http://localhost:3000)

你应该能看到一个包含多个分类的导航网站，支持搜索和深色模式切换。

## 自定义内容

### 修改导航链接

1. 打开 `app/data.ts` 文件

2. 找到要修改的分类，例如：

```typescript
{
  id: 'dev-tools',
  name: '开发工具',
  icon: '🛠️',
  links: [
    {
      title: 'GitHub',
      url: 'https://github.com',
      description: '全球最大的代码托管平台',
    },
    // 在这里添加更多链接...
  ],
}
```

3. 添加新链接：

```typescript
{
  title: '你的网站',
  url: 'https://yoursite.com',
  description: '网站描述',
}
```

4. 保存文件，页面会自动刷新

### 添加新分类

在 `app/data.ts` 中添加新的分类对象：

```typescript
export const categories: NavCategory[] = [
  // 现有分类...
  {
    id: 'new-category',
    name: '新分类',
    icon: '🎯',
    links: [
      {
        title: '网站1',
        url: 'https://example1.com',
        description: '描述1',
      },
      {
        title: '网站2',
        url: 'https://example2.com',
        description: '描述2',
      },
    ],
  },
];
```

### 修改网站标题

编辑 `app/layout.tsx` 中的 metadata：

```typescript
export const metadata: Metadata = {
  title: "你的网站标题",
  description: "你的网站描述",
};
```

## 部署到 Vercel

### 方法 1: 一键部署（最简单）

1. 确保代码构建成功：
```bash
npm run build
```

2. 运行部署脚本：
```bash
./deploy.sh
```

脚本会自动：
- 安装 Vercel CLI（如果需要）
- 登录 Vercel
- 构建项目
- 部署到生产环境

### 方法 2: GitHub 自动部署（推荐）

#### 2.1 创建 GitHub 仓库

访问 [GitHub](https://github.com/new) 创建新仓库

#### 2.2 推送代码

```bash
cd nav-website
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

#### 2.3 连接 Vercel

1. 访问 [Vercel](https://vercel.com)
2. 点击 "Add New..." → "Project"
3. 选择你的 GitHub 仓库
4. 点击 "Deploy"

完成！以后每次推送代码，Vercel 都会自动重新部署。

### 方法 3: 手动部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

## 验证部署

部署成功后，Vercel 会提供一个 URL，例如：
```
https://your-project.vercel.app
```

访问这个 URL 确认网站正常运行。

## 常见问题

### Q: 如何更新已部署的网站？

**A**: 如果使用 GitHub 部署，只需：
```bash
git add .
git commit -m "更新内容"
git push
```

如果使用 CLI 部署，运行：
```bash
vercel --prod
```

### Q: 如何绑定自定义域名？

**A**:
1. 在 Vercel 项目设置中找到 "Domains"
2. 点击 "Add Domain"
3. 输入你的域名
4. 按照提示配置 DNS 记录

### Q: 构建失败怎么办？

**A**:
1. 检查本地是否能成功构建：`npm run build`
2. 查看 Vercel 的构建日志
3. 确保所有依赖都在 `package.json` 中

### Q: 如何修改样式？

**A**:
- 全局样式：编辑 `app/globals.css`
- 组件样式：修改组件中的 Tailwind CSS 类名
- 主题颜色：修改 Tailwind 配置文件

### Q: 如何添加更多功能？

**A**: 项目使用 Next.js + React，你可以：
- 添加新的组件到 `app/components/`
- 修改 `app/page.tsx` 添加新功能
- 参考 Next.js 官方文档学习更多

## 下一步

- 📖 阅读 [README.md](README.md) 了解更多项目信息
- 🚀 查看 [DEPLOY.md](DEPLOY.md) 了解详细的部署选项
- 📝 查看 [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) 了解项目技术细节

## 需要帮助？

- [Next.js 文档](https://nextjs.org/docs)
- [Vercel 文档](https://vercel.com/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

祝你使用愉快！🎉
