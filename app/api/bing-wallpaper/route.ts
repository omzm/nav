import { NextResponse } from 'next/server';

type BingWallpaperResponse = {
  images?: Array<{
    url?: string;
  }>;
};

const BING_ARCHIVE_URL = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';

export async function GET() {
  try {
    const response = await fetch(BING_ARCHIVE_URL, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Bing wallpaper request failed: ${response.status}`);
    }

    const data = (await response.json()) as BingWallpaperResponse;
    const imagePath = data.images?.[0]?.url;

    if (!imagePath) {
      throw new Error('Bing wallpaper response did not include an image URL');
    }

    const imageUrl = imagePath.startsWith('http') ? imagePath : `https://www.bing.com${imagePath}`;
    // 头图用作页面顶部横幅背景（加高后约 400px+，上方压着标题与搜索框）：1366x768 是清晰度与体积的折中，
    // 1920x1080 约 335KB、1366x768 约 172KB、1024x768 约 73KB（实测某日壁纸）。
    // 必应缩略图 URL 支持直接替换分辨率后缀；若无该后缀则原样跳转。
    const sizedImageUrl = imageUrl.replace('_1920x1080', '_1366x768');
    const redirect = NextResponse.redirect(sizedImageUrl, 307);
    redirect.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return redirect;
  } catch (error) {
    console.error('Failed to load Bing wallpaper:', error);
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'public, s-maxage=300',
      },
    });
  }
}
