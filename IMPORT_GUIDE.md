# 书签数据导入指南

## 📊 数据统计

从 `bookmarks_2026_2_16.html` 提取的数据：
- **7个分类**
- **47个链接**

### 分类列表：
1. 💬 **论坛** (5个链接)
2. 🛠️ **工具** (15个链接)
3. 🤖 **AI工具** (6个链接)
4. 🖥️ **服务器** (7个链接)
5. ☁️ **云盘** (3个链接)
6. 🌐 **域名** (2个链接)
7. ✍️ **代写工具** (5个链接)

---

## 🚀 导入方法

### 方法一：使用 SQL 脚本（推荐）

1. **登录 Supabase**
   - 访问 https://supabase.com
   - 进入你的项目

2. **打开 SQL Editor**
   - 左侧菜单点击 "SQL Editor"
   - 点击 "New Query"

3. **执行导入脚本**
   - 打开项目中的 `import-bookmarks.sql` 文件
   - 复制全部内容
   - 粘贴到 SQL Editor
   - 点击 "Run" 执行

4. **验证导入**
   - 查看执行结果，应该显示导入的分类和链接数量
   - 刷新网站首页，查看新导入的数据

---

### 方法二：通过后台管理界面手动添加

如果 SQL 导入遇到问题，可以手动添加：

1. **访问后台**
   ```
   http://localhost:3000/admin
   ```

2. **登录管理员账号**

3. **添加分类**
   - 点击"分类管理" → "添加分类"
   - 按照以下顺序添加：
     * 论坛 💬
     * 工具 🛠️
     * AI工具 🤖
     * 服务器 🖥️
     * 云盘 ☁️
     * 域名 🌐
     * 代写工具 ✍️

4. **添加链接**
   - 点击"链接管理" → "添加链接"
   - 参考 `import-bookmarks.js` 文件中的数据逐个添加

---

## 📝 数据详情

### 论坛 (5个)
- 科学刀 - https://www.kxdao.org/
- 吾爱破解 - https://www.52pojie.cn/index.php
- LINUX DO - https://linux.do/
- NodeLoc - https://nodeloc.cc/
- NodeSeek - https://www.nodeseek.com/

### 工具 (15个)
- 在线ping - https://www.itdog.cn/ping/
- 油猴脚本 - https://greasyfork.org/zh-CN/scripts
- iconfont - https://www.iconfont.cn/
- DeepLX - https://api.deeplx.org/
- Github Hosts - https://hosts.gitcdn.top/
- 椰子验证码 - http://h5.yezi66.net:90/#/login
- 豪猪 - https://h5.haozhuma.cn/login.php
- 去水印 - https://inpaintweb.lxfater.com/
- 飞鸟办公 - https://www.135tool.cn/
- 临时邮箱 - https://22.do/
- IMPERIAL - https://imperialb.in/
- Lumiproxy - https://www.lumiproxy.com/zh-hans/online-proxy/proxysite/
- 视频转换 - https://www.aconvert.com/cn/video/
- PDF24 - https://tools.pdf24.org/zh/
- DaisySMS - https://daisysms.com/

### AI工具 (6个)
- ChatGPT - https://chatgpt.com/
- DeepSeek - https://www.deepseek.com/
- Leonardo.Ai - https://app.leonardo.ai/
- Clipdrop - https://clipdrop.co/
- Beart AI换脸 - https://beart.ai/zh/face-swap/
- Google AI Studio - https://aistudio.google.com/prompts/new_chat?hl=zh-cn

### 服务器 (7个)
- Vercel - https://vercel.com/
- Cloudflare - https://dash.cloudflare.com/
- Hugging Face - https://huggingface.co/
- 彩虹云 - https://www.cccyun.net/
- Serv00 - https://panel4.serv00.com/
- Deno Deploy - https://dash.deno.com/
- Claw Cloud - https://ap-northeast-1.run.claw.cloud/

### 云盘 (3个)
- Filen - https://app.filen.io/
- 坚果云 - https://www.jianguoyun.com/
- InfiniCLOUD - https://infini-cloud.net/en/

### 域名 (2个)
- ClouDNS - https://www.cloudns.net/
- Spaceship - https://www.spaceship.com/zh/

### 代写工具 (5个)
- PDF水印 - https://pdf.sufe.me/add-watermark
- 电子课本 - http://www.dzkbw.com/books/rjb/yuwen/
- 提示精灵 - https://www.promptgenius.site/
- TurboScribe - https://turboscribe.ai/zh-CN/dashboard
- PDF24水印 - https://tools.pdf24.org/zh/add-watermark

---

## ⚠️ 注意事项

1. **删除原有数据**
   - 如果需要先删除现有的测试数据，可以在 SQL Editor 中执行：
   ```sql
   DELETE FROM links;
   DELETE FROM categories;
   ```

2. **检查环境变量**
   - 确保 `.env.local` 文件中配置了正确的 Supabase 连接信息

3. **刷新页面**
   - 导入完成后，强制刷新浏览器（Ctrl+Shift+R）
   - 清除缓存后重新访问

4. **常用网站分类**
   - 原书签中有"常用网站"分类但是空的，所以没有导入
   - 如需要可以手动在后台添加

---

## 🔧 故障排除

### 问题1：SQL 执行失败
- 检查是否已经创建了数据库表（参考 `supabase/schema.sql`）
- 确保表结构包含 `is_private` 字段

### 问题2：数据未显示
- 检查 Supabase RLS 策略是否正确设置
- 确保公开数据的 `is_private` 为 `false`

### 问题3：分类顺序错误
- SQL 中的 `order` 字段控制显示顺序
- 可以在后台管理中调整

---

## 📞 需要帮助？

如果导入过程中遇到问题，请：
1. 检查浏览器控制台（F12）的错误信息
2. 查看 Supabase 的日志
3. 确认数据库连接正常

祝您使用愉快！🎉
