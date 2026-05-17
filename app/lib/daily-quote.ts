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
  try {
    const response = await fetch('https://v.api.aa1.cn/api/yiyan/index.php', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Quote request failed: ${response.status}`);
    }

    const text = await response.text();
    const quote = text.replace(/<[^>]*>/g, '').trim();
    return quote || getFallbackQuote();
  } catch (error) {
    console.error('Failed to load daily quote:', error);
    return getFallbackQuote();
  }
}

export const getDailyQuote = unstable_cache(loadDailyQuote, ['daily-quote'], {
  revalidate: 3600,
  tags: ['daily-quote'],
});
