import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body?.path === 'string' && body.path.startsWith('/') ? body.path.slice(0, 200) : '/';
    const userAgent = request.headers.get('user-agent')?.slice(0, 300) || null;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('site_views').insert({
      path,
      user_agent: userAgent,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to record site view:', error);
    return NextResponse.json({ error: 'Failed to record site view' }, { status: 500 });
  }
}
