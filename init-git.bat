@echo off
chcp 65001 >nul
REM 个人导航网站 - Git 初始化脚本 (Windows)

echo =========================================
echo    个人导航网站 - 准备上传到 GitHub
echo =========================================
echo.

REM 检查是否已经是 Git 仓库
if exist ".git" (
    echo ⚠️  检测到已存在 Git 仓库
    set /p response="是否要重新初始化？(y/N): "
    if /i "%response%"=="y" (
        rmdir /s /q .git
        echo ✅ 已清除旧的 Git 仓库
    ) else (
        echo ❌ 取消操作
        pause
        exit /b 0
    )
)

REM 初始化 Git 仓库
echo.
echo 📦 正在初始化 Git 仓库...
git init
echo ✅ Git 仓库初始化成功

REM 添加所有文件
echo.
echo 📄 正在添加文件...
git add .
echo ✅ 文件添加完成

REM 创建首次提交
echo.
echo 💾 正在创建首次提交...
git commit -m "Initial commit: Personal navigation website with Cloudflare Workers" -m "" -m "- Frontend: nav.html with TailwindCSS" -m "- Backend: Cloudflare Workers API" -m "- Database: Cloudflare D1 (SQLite)" -m "- Features: Add/Edit/Delete sites, Password protection" -m "- Documentation: Quick start guide and detailed deployment guide"
echo ✅ 提交创建成功

REM 设置默认分支为 main
echo.
echo 🌿 设置默认分支为 main...
git branch -M main
echo ✅ 分支设置完成

echo.
echo =========================================
echo           ✅ 准备完成！
echo =========================================
echo.
echo 📝 下一步操作：
echo.
echo 1. 在 GitHub 创建新仓库:
echo    https://github.com/new
echo.
echo 2. 运行以下命令上传代码:
echo    git remote add origin https://github.com/你的用户名/仓库名.git
echo    git push -u origin main
echo.
echo 3. 按照 快速部署.md 完成 Cloudflare 部署
echo.
echo =========================================
echo.
pause
