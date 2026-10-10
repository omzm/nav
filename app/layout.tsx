import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary";

export const metadata: Metadata = {
  metadataBase: new URL("https://1.145678.xyz"),
  title: "收藏夹 - 一些常用的工具",
  description: "收录了开发工具、设计资源、学习平台、效率工具等精选网站",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "收藏夹 - 一些常用的工具",
    description: "收录了开发工具、设计资源、学习平台、效率工具等精选网站",
    type: "website",
    locale: "zh_CN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 深色模式预置：首屏绘制前就按 localStorage 偏好加上 dark 类，避免深色用户看到浅色闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        {/* 壁纸是首屏视觉主体（LCP）：preload 放在 layout 层静态声明，
            不等导航快照返回就开始下载。注意 URL 必须与 HomeClient 里 backgroundImage 完全一致 */}
        <link rel="preload" as="image" href="/api/bing-wallpaper" fetchPriority="high" />
        {/* 字体预连接：提前建连，减少首屏字体链路延迟 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
