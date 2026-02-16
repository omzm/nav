import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 调试信息
if (typeof window !== 'undefined') {
  console.log('Supabase 配置:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl.substring(0, 20) + '...',
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase 环境变量未配置！');
  console.error('请确保 .env.local 文件包含:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// 数据库类型定义
export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
  is_private: boolean;
  created_at?: string;
}

export interface Link {
  id: string;
  category_id: string;
  title: string;
  url: string;
  description: string;
  icon?: string;
  order: number;
  is_private: boolean;
  created_at?: string;
}
