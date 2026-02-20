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
      <body className="antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <ToastContainer />
      </body>
    </html>
  );
}
