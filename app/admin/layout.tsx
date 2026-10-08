'use client';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Button, Modal, SideSheet, Spin, Toast, semiGlobal } from '@douyinfe/semi-ui';
import {
  IconChevronDown,
  IconChevronRight,
  IconExit,
  IconExternalOpen,
  IconFolder,
  IconHistogram,
  IconMenu,
  IconPlus,
} from '@douyinfe/semi-icons';
import { supabase } from '@/app/lib/supabase';
// 本地测试账号模块不静态导入：只在开发环境动态加载，
// 生产 bundle 不包含测试账号常量（服务端本就硬拒绝非开发环境）
import { clearAdminSession, getAdminStatus } from '@/app/actions/adminSession';
import { clearAdminCache, loadAdminCache } from '@/app/utils/adminCache';

/** 开发环境取本地测试账号；生产直接返回 null */
async function getDevLocalAdminUser() {
  if (process.env.NODE_ENV !== 'development') return null;
  const { getLocalAdminUser } = await import('@/app/lib/local-admin');
  return getLocalAdminUser();
}

/** 清除本地测试账号标记；生产为 no-op */
async function clearDevLocalAdminFlag() {
  if (process.env.NODE_ENV !== 'development') return;
  const { signOutLocalAdmin } = await import('@/app/lib/local-admin');
  signOutLocalAdmin();
}
import { prefetchAdminData } from './_components/adminPrefetch';
import { UserContext } from './dashboard/context';
import AdminBrand from './_components/AdminBrand';
import './admin.css';

// Semi's imperative components (Toast, Modal) need the React 19 root API.
semiGlobal.config.createRoot = createRoot;

// 一级独立项：工作台（首页性质，不归入任何分组）
const navStandalone = { label: '工作台', path: '/admin/dashboard', icon: IconHistogram };
// 一级分组：标题可点击折叠，页面为二级项
const navGroups = [
  {
    title: '内容管理',
    icon: IconFolder,
    items: [
      { label: '分类管理', path: '/admin/dashboard/categories' },
      { label: '链接管理', path: '/admin/dashboard/links' },
    ],
  },
];
const allNavItems = [navStandalone, ...navGroups.flatMap((group) => group.items)];

const NAV_COLLAPSED_KEY = 'nav-admin-nav-collapsed';

function isActivePath(pathname: string, path: string) {
  if (path === '/admin/dashboard/categories') {
    return pathname === path || pathname.startsWith('/admin/dashboard/category/');
  }
  if (path === '/admin/dashboard/links') {
    return pathname === path || pathname.startsWith('/admin/dashboard/link/');
  }
  return pathname === path;
}

function getPageLabel(pathname: string) {
  if (pathname.startsWith('/admin/dashboard/category/')) return pathname.endsWith('/new') ? '添加分类' : '编辑分类';
  if (pathname.startsWith('/admin/dashboard/link/')) return pathname.endsWith('/new') ? '添加链接' : '编辑链接';
  if (pathname === '/admin/setup') return '初始化管理员';
  return allNavItems.find((item) => item.path === pathname)?.label || '工作台';
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // 二级导航折叠状态：默认全部展开，手动折叠后记住（localStorage）
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(NAV_COLLAPSED_KEY) || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>;
      }
      return {};
    } catch {
      return {};
    }
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    const checkUser = async () => {
      try {
        // 管理员状态：是否已配置、会话邮箱是什么（不暴露数据库里的邮箱）
        // 未配置时去 setup 向导，fail closed，不放行
        const { configured, sessionEmail } = await getAdminStatus();

        if (!configured) {
          if (active) router.replace('/admin/setup');
          return;
        }

        const localUser = await getDevLocalAdminUser();
        if (localUser) {
          // 本地测试账号：仍需服务端会话二次确认（sessionEmail 为 null = 会话无效）
          if (!sessionEmail) {
            await clearDevLocalAdminFlag();
            if (active) router.replace('/admin?error=auth');
            return;
          }
          if (active) setUser(localUser);
          return;
        }

        // 数据预取与下面的鉴权并行：无新鲜缓存时提前发起数据查询，
        // dashboard 挂载后直接消费，省去"鉴权完再查数据"的串行等待
        try {
          if (!loadAdminCache()) prefetchAdminData();
        } catch {
          // 预取失败不影响鉴权流程，dashboard 会走正常加载
        }

        // 会话邮箱（服务端已校验签名）与 Supabase 用户并行确认，
        // 避免两次串行网络往返；两者必须一致（纵深防御）
        const [{ data: { user: currentUser }, error }] = await Promise.all([
          supabase.auth.getUser(),
        ]);

        if (!sessionEmail) {
          await supabase.auth.signOut();
          await clearDevLocalAdminFlag();
          await clearAdminSession();
          if (active) router.replace('/admin?error=auth');
          return;
        }

        if (error || !currentUser) {
          // 服务端会话有效但 Supabase 客户端会话缺失/失效：
          // 必须先清掉服务端会话，否则登录页的"已登录直达工作台"
          // 会把用户弹回工作台，形成 /admin ↔ /admin/dashboard 死循环
          await clearAdminSession();
          await supabase.auth.signOut();
          if (active) router.replace('/admin');
          return;
        }
        if ((currentUser.email || '').toLowerCase() !== sessionEmail.toLowerCase()) {
          await supabase.auth.signOut();
          await clearAdminSession();
          if (active) router.replace('/admin');
          return;
        }
        if (active) setUser(currentUser);
      } catch (error) {
        console.error('验证后台登录状态失败:', error);
        // 鉴权异常同样清掉可能残留的服务端会话，避免登录页弹回死循环
        try {
          await clearAdminSession();
        } catch {
          /* 忽略清理失败，不影响跳转 */
        }
        if (active) router.replace('/admin');
      } finally {
        if (active) setChecking(false);
      }
    };

    const timer = window.setTimeout(() => void checkUser(), 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await clearDevLocalAdminFlag();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await clearAdminSession();
      clearAdminCache();
      router.replace('/admin');
    } catch (error) {
      console.error('退出登录失败:', error);
      Toast.error('退出失败，请重试');
    } finally {
      setLoggingOut(false);
    }
  };

  // 当前页面所在的分组自动展开（覆盖手动折叠，保证"你在哪"永远可见）
  useEffect(() => {
    const activeGroup = navGroups.find((group) =>
      group.items.some((item) => isActivePath(pathname, item.path)),
    );
    if (activeGroup) {
      setCollapsed((prev) => {
        if (!prev[activeGroup.title]) return prev;
        const next = { ...prev, [activeGroup.title]: false };
        try {
          localStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify(next));
        } catch {
          // 记住折叠状态失败不影响导航
        }
        return next;
      });
    }
  }, [pathname]);

  const toggleGroup = (title: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // 记住折叠状态失败不影响导航
      }
      return next;
    });
  };

  if (checking) {
    return (
      <div className="admin-theme admin-loading-shell">
        <AdminBrand />
        <Spin tip="正在进入工作台…" />
      </div>
    );
  }

  if (!user) return null;

  const parentPage = pathname.startsWith('/admin/dashboard/category/')
    ? { label: '分类管理', path: '/admin/dashboard/categories' }
    : pathname.startsWith('/admin/dashboard/link/')
      ? { label: '链接管理', path: '/admin/dashboard/links' }
      : null;

  // 桌面侧边栏与手机抽屉各渲染一份，idPrefix 保证两处的 id 不重复
  const renderNavigation = (idPrefix: string) => (
    <>
      <Link href="/admin/dashboard" className="admin-sidebar-brand" onClick={() => setNavOpen(false)}>
        <AdminBrand />
      </Link>

      <div className="admin-sidebar-create">
        <Button block theme="solid" icon={<IconPlus aria-hidden="true" />} onClick={() => {
          setNavOpen(false);
          router.push('/admin/dashboard/link/new');
        }}>
          添加链接
        </Button>
      </div>

      <nav className="admin-sidebar-nav" aria-label="后台主导航">
        <div className="admin-nav-standalone">
          {(() => {
            const active = isActivePath(pathname, navStandalone.path);
            const StandaloneIcon = navStandalone.icon;
            return (
              <Link
                href={navStandalone.path}
                className={`admin-nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setNavOpen(false)}
              >
                <StandaloneIcon aria-hidden="true" />
                <span>{navStandalone.label}</span>
                {active && <span className="admin-nav-active-dot" />}
              </Link>
            );
          })()}
        </div>

        {navGroups.map((group) => {
          const groupActive = group.items.some((item) => isActivePath(pathname, item.path));
          const isCollapsed = !!collapsed[group.title];
          const childrenId = `${idPrefix}-nav-group-${group.title}`;
          const GroupIcon = group.icon;
          return (
            <div className={`admin-nav-group${groupActive ? ' is-active-group' : ''}`} key={group.title}>
              <button
                type="button"
                className="admin-nav-group-header"
                aria-expanded={!isCollapsed}
                aria-controls={childrenId}
                onClick={() => toggleGroup(group.title)}
              >
                <span className="admin-nav-group-label">
                  <GroupIcon className="admin-nav-group-icon" aria-hidden="true" />
                  <span>{group.title}</span>
                </span>
                <IconChevronDown
                  className={`admin-nav-group-chevron${isCollapsed ? ' is-collapsed' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <div id={childrenId} className={`admin-nav-children${isCollapsed ? ' is-collapsed' : ''}`}>
                <div className="admin-nav-children-inner">
                  {group.items.map(({ label, path }) => {
                    const active = isActivePath(pathname, path);
                    return (
                      <Link
                        key={path}
                        href={path}
                        className={`admin-nav-item is-sub${active ? ' is-active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setNavOpen(false)}
                      >
                        <span>{label}</span>
                        {active && <span className="admin-nav-active-dot" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="admin-sidebar-bottom">
        <a className="admin-nav-item admin-site-link" href="/" target="_blank" rel="noopener noreferrer">
          <IconExternalOpen aria-hidden="true" />
          <span>访问首页</span>
          <IconChevronRight className="admin-nav-trailing" aria-hidden="true" />
        </a>
        <div className="admin-account">
          <span className="admin-account-avatar">{(user.email?.[0] || 'A').toUpperCase()}</span>
          <div className="admin-account-text">
            <strong>管理员</strong>
            <span title={user.email}>{user.email}</span>
          </div>
          <Button theme="borderless" type="tertiary" icon={<IconExit aria-hidden="true" />} aria-label="退出登录" title="退出登录" onClick={() => { setNavOpen(false); setShowLogoutConfirm(true); }} />
        </div>
      </div>
    </>
  );

  return (
    <UserContext.Provider value={user}>
      <div className="admin-theme admin-shell">
        <a className="admin-skip-link" href="#admin-main">跳到主要内容</a>
        <aside className="admin-sidebar">{renderNavigation('desktop-nav')}</aside>

        <div className="admin-workspace">
          <header className="admin-topbar">
            <div className="admin-topbar-start">
              <Button className="admin-mobile-menu" theme="borderless" type="tertiary" icon={<IconMenu aria-hidden="true" />} aria-label="打开导航" aria-expanded={navOpen} onClick={() => setNavOpen(true)} />
              <nav className="admin-breadcrumb" aria-label="面包屑导航">
                <Link href="/admin/dashboard">管理台</Link>
                <IconChevronRight aria-hidden="true" />
                {parentPage && <><Link href={parentPage.path}>{parentPage.label}</Link><IconChevronRight aria-hidden="true" /></>}
                <span aria-current="page">{getPageLabel(pathname)}</span>
              </nav>
            </div>
          </header>
          <main id="admin-main" className="admin-main" tabIndex={-1}>{children}</main>
        </div>

        <SideSheet
          title="导航菜单"
          visible={navOpen}
          placement="left"
          width={272}
          closeOnEsc
          onCancel={() => setNavOpen(false)}
          className="admin-theme admin-mobile-nav"
          bodyStyle={{ padding: 0 }}
        >
          <div className="admin-mobile-nav-body">{renderNavigation('mobile-nav')}</div>
        </SideSheet>

        <Modal
          title="退出登录"
          visible={showLogoutConfirm}
          okText="退出登录"
          cancelText="取消"
          okButtonProps={{ type: 'danger', theme: 'solid', loading: loggingOut }}
          onOk={() => void handleLogout()}
          onCancel={() => { if (!loggingOut) setShowLogoutConfirm(false); }}
        >
          退出后需要重新登录，才能继续管理分类和链接。
        </Modal>
      </div>
    </UserContext.Provider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  if (pathname === '/admin' || pathname === '/admin/setup') {
    return <div className="admin-theme">{children}</div>;
  }
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
