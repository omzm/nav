import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const linkId = typeof body?.linkId === 'string' ? body.linkId : '';

    if (!linkId || !UUID_RE.test(linkId)) {
      return NextResponse.json({ error: 'Invalid linkId' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    // 确认链接存在且公开：RLS 下匿名只能读到公开链接，
    // 私密链接的点击不计入今日热门，直接忽略（前端 fire-and-forget，不影响体验）
    const { data: link } = await supabase.from('links').select('id').eq('id', linkId).maybeSingle();
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
