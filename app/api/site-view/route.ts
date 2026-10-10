import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase-server';
import { getClientIp, isRateLimited } from '../rate-limit';

// 浏览量上报：只记录全站总数（increment_site_view），不做分页面统计，
// 因此请求体不需要携带 path。前端用 sendBeacon 发送空 body 即可。
export async function POST(request: NextRequest) {
  // 滑动窗口限流：每 IP 60 秒内最多 30 次浏览上报
  if (isRateLimited(`site-view:${getClientIp(request)}`, 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.rpc('increment_site_view');

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to record site view:', error);
    return NextResponse.json({ error: 'Failed to record site view' }, { status: 500 });
  }
}
