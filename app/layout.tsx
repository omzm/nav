import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";

export const metadata: Metadata = {
  title: "收藏夹 - 一些常用的工具",
  description: "收录了开发工具、设计资源、学习平台、效率工具等精选网站",
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
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <ToastContainer />
      </body>
    </html>
  );
}
