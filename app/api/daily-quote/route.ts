import { NextResponse } from 'next/server';
import { getDailyQuote } from '@/app/lib/daily-quote';

// 每日一言：首页客户端挂载后异步拉取，不阻塞首屏服务端渲染。
// 底层 getDailyQuote 已有 1 小时 unstable_cache，这里再加一层 CDN 缓存头。
export async function GET() {
  const quote = await getDailyQuote();
  return NextResponse.json(
    { quote },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
