import HomeClient from './components/HomeClient';
import { getDailyQuote } from './lib/daily-quote';
import { getNavSnapshot } from './lib/nav-snapshot';

export default async function Home() {
  const [snapshot, dailyQuote] = await Promise.all([
    getNavSnapshot(),
    getDailyQuote(),
  ]);

  return <HomeClient snapshot={snapshot} dailyQuote={dailyQuote} />;
}
