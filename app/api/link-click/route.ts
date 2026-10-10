import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase-server';
import { getClientIp, isRateLimited } from '../rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const linkId =
      typeof (body as { linkId?: unknown } | null)?.linkId === 'string'
        ? (body as { linkId: string }).linkId
        : '';

    if (!linkId || !UUID_RE.test(linkId)) {
      return NextResponse.json({ error: 'Invalid linkId' }, { status: 400 });
    }

    // 滑动窗口限流：每 IP + 链接 60 秒内最多 60 次点击上报
    if (isRateLimited(`link-click:${getClientIp(request)}:${linkId}`, 60)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = createServerSupabaseClient();
    // 确认链接存在且公开：RLS 下匿名只能读到公开链接，
    // 私密链接的点击不计入今日热门，直接忽略（前端 fire-and-forget，不影响体验）
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('id')
      .eq('id', linkId)
      .maybeSingle();
    if (linkError) {
      console.error('Failed to check link existence:', linkError);
      return NextResponse.json({ error: 'Failed to check link' }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const { error } = await supabase.from('link_clicks').insert({ link_id: linkId });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to record link click:', error);
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
  }
}
