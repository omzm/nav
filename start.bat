@echo off
echo ====================================
echo    启动导航网站开发服务器
echo ====================================
echo.

REM 停止已有的 Node 进程
echo [1/3] 停止已有的服务...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 >nul

REM 清除缓存
echo [2/3] 清除缓存...
if exist .next rmdir /s /q .next
echo 缓存已清除

REM 启动开发服务器
echo [3/3] 启动服务器...
echo.
echo 服务器将在 http://localhost:3000 启动
echo 按 Ctrl+C 可以停止服务器
echo.
npm run dev
