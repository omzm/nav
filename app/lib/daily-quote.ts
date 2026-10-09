import { unstable_cache } from 'next/cache';

const FALLBACK_QUOTES = [
  '生活总会给你答案，但不会马上把一切都告诉你。',
  '保持热爱，奔赴山海。',
  '日拱一卒，功不唐捐。',
  '把每一天当作最好的一天来过。',
  '所有的努力，都不会被辜负。',
  '慢慢来，比较快。',
];

function getFallbackQuote() {
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
}

async function loadDailyQuote(): Promise<string> {
  // 失败直接抛错：让 unstable_cache 不缓存失败结果，上游恢复后下次即取到新文案；
  // 上游返回空字符串时才用备用句（正常兜底，可缓存）。
  // 只保留外层 unstable_cache 这一层缓存，fetch 本身不再叠加 revalidate
  const response = await fetch('https://v.api.aa1.cn/api/yiyan/index.php', {
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Quote request failed: ${response.status}`);
  }

  const text = await response.text();
  const quote = text.replace(/<[^>]*>/g, '').trim();
  return quote || getFallbackQuote();
}

export const getDailyQuote = unstable_cache(loadDailyQuote, ['daily-quote'], {
  revalidate: 3600,
  tags: ['daily-quote'],
});
