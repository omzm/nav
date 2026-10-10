'use client';

import { createContext, useCallback, useContext, useTransition } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

const AdminNavContext = createContext<{ navigate: (href: string) => void }>({
  navigate: () => {},
});

/**
 * 后台全局导航反馈：顶部细进度条。
 *
 * 背景：后台很多按钮是裸 router.push，首次跳转要现下载目标页面的 JS chunk，
 * 点下去半天没反应，用户以为没点到而重复点击。这里把所有页面内导航收敛到
 * navigate()：用 useTransition 包裹 router.push，pending 期间顶部显示
 * 一条滑动的蓝色进度条，跳转完成（新页面就绪）自动消失。
 * NavButton 是按钮级的菊花反馈（已存在），这个是全局兜底，两者互补。
 */
export function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  return (
    <AdminNavContext.Provider value={{ navigate }}>
      {isPending && (
        <div className="admin-nav-progress" aria-hidden="true">
          <div className="admin-nav-progress-bar" />
        </div>
      )}
      {children}
    </AdminNavContext.Provider>
  );
}

/** 页面内导航统一走这个，替代裸 router.push，自动带顶部进度反馈 */
export function useAdminNavigation() {
  return useContext(AdminNavContext);
}
