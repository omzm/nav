# Supabase 后台管理系统设置指南

## 1. 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 注册/登录账号
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - Name: nav-website
   - Database Password: 设置一个强密码（请记住）
   - Region: 选择离你最近的区域
5. 等待项目创建完成（约2分钟）

## 2. 获取 API 密钥

1. 在项目仪表板，点击左侧 "Settings" → "API"
2. 复制以下信息：
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)

## 3. 配置环境变量

1. 在项目根目录创建 `.env.local` 文件
2. 添加以下内容（替换为你的实际值）：

```env

```

## 4. 创建数据库表

1. 在 Supabase 仪表板，点击左侧 "SQL Editor"
2. 点击 "New Query"
3. 复制 `supabase/schema.sql` 文件的全部内容
4. 粘贴到 SQL 编辑器
5. 点击 "Run" 执行 SQL

这将创建：
- `categories` 表（分类）
- `links` 表（链接）
- 索引和行级安全策略

## 5. 创建管理员账号

1. 在 Supabase 仪表板，点击左侧 "Authentication" → "Users"
2. 点击 "Add User" → "Create new user"
3. 填写：
   - Email: 你的管理员邮箱
   - Password: 设置管理员密码
   - Auto Confirm User: 勾选此项
4. 点击 "Create User"

## 6. 导入初始数据（可选）

如果你想导��现有的导航数据：

1. 在 SQL Editor 中运行以下 SQL（示例）：

```sql
-- 插入分类
INSERT INTO categories (name, icon, "order") VALUES
('开发工具', '🛠️', 1),
('设计资源', '🎨', 2),
('学习平台', '📚', 3);

-- 插入链接（替换 category_id）
INSERT INTO links (category_id, title, url, description, "order") VALUES
('分类ID', 'GitHub', 'https://github.com', '全球最大的代码托管平台', 1);
```

## 7. 启动项目

```bash
npm run dev
```

## 8. 访问后台

1. 打开浏览器访问: http://localhost:3000/admin
2. 使用步骤5创建的管理员账号登录
3. 登录成功后会跳转到后台管理页面

## 功能说明

### 后台管理功能：

1. **分类管理**
   - 查看所有分类
   - 添加新分类
   - 编辑分类信息
   - 删除分类（会同时删除该分类下的所有链接）

2. **链接管理**
   - 查看所有链接
   - 添加新链接
   - 编辑链接信息
   - 删除链接

3. **安全性**
   - 只有登录用户可以修改数据
   - 所有人都可以查看数据（前台）
   - 使用 Supabase 的行级安全策略

## 常见问题

### Q: 忘记管理员密码怎么办？
A: 在 Supabase 仪表板的 Authentication → Users 中重置密码

### Q: 如何添加更多管理员？
A: 在 Supabase 仪表板的 Authentication → Users 中添加新用户

### Q: 数据会丢失吗？
A: Supabase 提供自动备份，数据安全可靠

### Q: 免费额度够用吗？
A: Supabase 免费版提供：
- 500MB 数据库空间
- 1GB 文件存储
- 50,000 月活用户
- 对于个人导航网站完全够用

## 下一步

现在你可以：
1. 登录后台管理系统
2. 添加/编辑分类和链接
3. 前台会自动从数据库读取数据
4. 部署到 Vercel（记得在 Vercel 中添加环境变量）

## 需要帮助？

如果遇到问题，请检查：
1. 环境变量是否正确配置
2. SQL 是否成功执行
3. 管理员账号是否创建成功
4. 浏览器控制台是否有错误信息
