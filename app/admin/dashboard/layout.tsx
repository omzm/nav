'use client';

import { useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL } from '@/app/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { UserContext } from './context';
import type { User } from '@supabase/supabase-js';

function Breadcrumbs() {
  const pathname = usePathname();

  const crumbs: { label: string; href?: string }[] = [
    { label: '后台管理', href: '/admin/dashboard' },
  ];

  if (pathname.startsWith('/admin/dashboard/category/')) {
    const id = pathname.split('/').pop();
    crumbs.push({
      label: id === 'new' ? '添加分类' : '编辑分类',
    });
  } else if (pathname.startsWith('/admin/dashboard/link/')) {
    const id = pathname.split('/').pop();
    crumbs.push({
      label: id === 'new' ? '添加链接' : '编辑链接',
    });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-400 dark:text-gray-500">/</span>}
          {crumb.href && i < crumbs.length - 1 ? (
            <a
              href={crumb.href}
              className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {crumb.label}
            </a>
          ) : (
            <span className="text-gray-900 dark:text-gray-200 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }
      if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        router.push('/admin');
        return;
      }
      setUser(user);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>🎛️</span>
                  <span className="hidden sm:inline">后台管理</span>
                  <span className="sm:hidden">管理</span>
                </h1>
                <Breadcrumbs />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <a
                  href="/"
                  target="_blank"
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span>👁️</span>
                  <span className="hidden md:inline">查看网站</span>
                </a>
                <span className="hidden lg:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all text-xs sm:text-sm font-medium active:scale-95 active:opacity-90"
                >
                  <span className="hidden sm:inline">退出登录</span>
                  <span className="sm:hidden">退出</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </UserContext.Provider>
  );
}
