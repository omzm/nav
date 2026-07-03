import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase-server';

export async function POST() {
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
