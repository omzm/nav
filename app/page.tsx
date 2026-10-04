import HomeClient from './components/HomeClient';
import { getNavSnapshot } from './lib/nav-snapshot';

export default async function Home() {
  // 首屏只等导航快照；每日一言由客户端挂载后异步拉取，避免第三方 API 拖慢 TTFB
  const snapshot = await getNavSnapshot();
  // 提交收录按钮只在配置了 SUBMIT_PASSWORD 时出现，未配置则整个功能关闭
  const submitEnabled = Boolean(process.env.SUBMIT_PASSWORD);

  return (
    <>
      {/* 壁纸是首屏视觉主体（LCP）：preload 让它在 HTML 解析早期就开始下载，
          而不是等 CSS 背景被发现后才起步。注意 URL 必须与 HomeClient 里 backgroundImage 完全一致 */}
      <link rel="preload" as="image" href="/api/bing-wallpaper" fetchPriority="high" />
      <HomeClient snapshot={snapshot} submitEnabled={submitEnabled} />
    </>
  );
}
