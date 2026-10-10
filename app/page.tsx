import HomeClient from './components/HomeClient';
import { getNavSnapshot } from './lib/nav-snapshot';
import { version } from '../package.json';

export default async function Home() {
  // 首屏只等导航快照；每日一言由客户端挂载后异步拉取，避免第三方 API 拖慢 TTFB
  const snapshot = await getNavSnapshot();
  // 提交收录按钮只在配置了 SUBMIT_PASSWORD 时出现，未配置则整个功能关闭
  const submitEnabled = Boolean(process.env.SUBMIT_PASSWORD);

  return (
    <HomeClient snapshot={snapshot} submitEnabled={submitEnabled} version={version} />
  );
}
