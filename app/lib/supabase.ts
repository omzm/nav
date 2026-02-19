import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 环境变量未配置！请确保 .env.local 文件包含 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

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
