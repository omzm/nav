#!/bin/bash

echo "🚀 开始部署导航网站到 Vercel..."
echo ""

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null
then
    echo "📦 Vercel CLI 未安装，正在安装..."
    npm install -g vercel
fi

# 检查是否已登录
echo "🔐 检查 Vercel 登录状态..."
if ! vercel whoami &> /dev/null
then
    echo "请登录 Vercel..."
    vercel login
fi

# 构建项目
echo ""
echo "🔨 构建项目..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 构建成功！"
    echo ""
    echo "📤 开始部署到 Vercel..."
    vercel --prod

    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 部署成功！"
        echo ""
        echo "你的网站已经上线，可以通过 Vercel 提供的 URL 访问。"
    else
        echo ""
        echo "❌ 部署失败，请检查错误信息。"
        exit 1
    fi
else
    echo ""
    echo "❌ 构建失败，请检查错误信息。"
    exit 1
fi
