import HomeClient from './components/HomeClient';
import { getNavSnapshot } from './lib/nav-snapshot';

export default async function Home() {
  // 首屏只等导航快照；每日一言由客户端挂载后异步拉取，避免第三方 API 拖慢 TTFB
  const snapshot = await getNavSnapshot();

  return <HomeClient snapshot={snapshot} />;
}
