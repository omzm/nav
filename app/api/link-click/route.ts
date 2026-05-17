import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const linkId = typeof body?.linkId === 'string' ? body.linkId : '';

    if (!linkId) {
      return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
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
