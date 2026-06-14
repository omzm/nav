'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  Avatar,
  Breadcrumb,
  Button,
  Layout,
  Modal,
  SideSheet,
  Space,
  Spin,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconApps,
  IconExit,
  IconExternalOpen,
  IconFolder,
  IconHistogram,
  IconInfoCircle,
  IconLink,
  IconMenu,
  IconPlusCircle,
  IconServer,
  IconUser,
} from '@douyinfe/semi-icons';
import { supabase, ADMIN_EMAIL } from '@/app/lib/supabase';
import { getLocalAdminUser, signOutLocalAdmin } from '@/app/lib/local-admin';
import { UserContext } from './context';

const { Content } = Layout;
const { Text, Title } = Typography;

type NavAction = {
  label: string;
  description: string;
  path?: string;
  icon: React.ReactNode;
  external?: boolean;
  danger?: boolean;
};

const navSections: Array<{ title: string; items: NavAction[] }> = [
  {
    title: '数据管理',
    items: [
      {
        label: '后台概览',
        description: '查看分类、链接数量和常用入口',
        path: '/admin/dashboard',
        icon: <IconHistogram />,
      },
      {
        label: '分类管理',
        description: '维护首页导航分组和分类排序',
        path: '/admin/dashboard/categories',
        icon: <IconFolder />,
      },
      {
        label: '链接管理',
        description: '搜索、筛选、编辑和排序网站链接',
        path: '/admin/dashboard/links',
        icon: <IconLink />,
      },
    ],
  },
  {
    title: '快捷操作',
    items: [
      {
        label: '添加链接',
        description: '新增一个网站链接',
        path: '/admin/dashboard/link/new',
        icon: <IconPlusCircle />,
      },
      {
        label: '添加分类',
        description: '新增一个首页分类',
        path: '/admin/dashboard/category/new',
        icon: <IconFolder />,
      },
    ],
  },
  {
    title: '系统工具',
    items: [
      {
        label: '认证诊断',
        description: '检查登录、权限和环境配置',
        path: '/admin/diagnostic',
        icon: <IconInfoCircle />,
      },
      {
        label: '初始化数据',
        description: '初始化或补齐基础数据',
        path: '/admin/init',
        icon: <IconServer />,
      },
      {
        label: '查看网站',
        description: '在新窗口打开前台首页',
        path: '/',
        icon: <IconExternalOpen />,
        external: true,
      },
    ],
  },
];

function useDashboardBreadcrumbs() {
  const pathname = usePathname();

  return useMemo(() => {
    const crumbs = [{ label: '后台管理', path: '/admin/dashboard' }];

    if (pathname === '/admin/dashboard/categories') {
      crumbs.push({ label: '分类管理', path: pathname });
    } else if (pathname === '/admin/dashboard/links') {
      crumbs.push({ label: '链接管理', path: pathname });
    } else if (pathname.startsWith('/admin/dashboard/category/')) {
      const id = pathname.split('/').pop();
      crumbs.push({ label: '分类管理', path: '/admin/dashboard/categories' });
      crumbs.push({ label: id === 'new' ? '添加分类' : '编辑分类', path: pathname });
    } else if (pathname.startsWith('/admin/dashboard/link/')) {
      const id = pathname.split('/').pop();
      crumbs.push({ label: '链接管理', path: '/admin/dashboard/links' });
      crumbs.push({ label: id === 'new' ? '添加链接' : '编辑链接', path: pathname });
    } else if (pathname === '/admin/diagnostic') {
      crumbs.push({ label: '认证诊断', path: pathname });
    } else if (pathname === '/admin/init') {
      crumbs.push({ label: '初始化数据', path: pathname });
    }

    return crumbs;
  }, [pathname]);
}

function getPageTitle(pathname: string) {
  if (pathname === '/admin/dashboard/categories') return '分类管理';
  if (pathname === '/admin/dashboard/links') return '链接管理';
  if (pathname === '/admin/diagnostic') return '认证诊断';
  if (pathname === '/admin/init') return '初始化数据';
  if (pathname.startsWith('/admin/dashboard/category/')) {
    return pathname.endsWith('/new') ? '添加分类' : '编辑分类';
  }
  if (pathname.startsWith('/admin/dashboard/link/')) {
    return pathname.endsWith('/new') ? '添加链接' : '编辑链接';
  }
  return '后台概览';
}

function DashboardBreadcrumbs() {
  const router = useRouter();
  const crumbs = useDashboardBreadcrumbs();

  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb
      compact
      routes={crumbs}
      onClick={(route) => {
        const target = route.path;
        if (target && target !== crumbs[crumbs.length - 1]?.path) {
          router.push(target);
        }
      }}
      renderItem={(route) => route.label}
    />
  );
}

function isActiveNav(pathname: string, item: NavAction) {
  if (!item.path || item.external) return false;

  if (item.path === '/admin/dashboard') {
    return pathname === '/admin/dashboard';
  }

  if (item.path === '/admin/dashboard/categories') {
    return pathname === item.path || pathname.startsWith('/admin/dashboard/category/');
  }

  if (item.path === '/admin/dashboard/links') {
    return pathname === item.path || pathname.startsWith('/admin/dashboard/link/');
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  const checkUser = useCallback(async () => {
    try {
      const localUser = getLocalAdminUser();
      if (localUser) {
        setUser(localUser);
        return;
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/admin');
        return;
      }

      if (ADMIN_EMAIL && currentUser.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        router.push('/admin');
        return;
      }

      setUser(currentUser);
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkUser();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [checkUser]);

  const handleLogout = async () => {
    signOutLocalAdmin();
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const runNavAction = (item: NavAction) => {
    if (!item.path) return;

    setNavOpen(false);

    if (item.external) {
      window.open(item.path, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(item.path);
  };

  if (checking) {
    return (
      <div className="admin-login-shell">
        <Spin size="large" tip="正在验证登录状态..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <UserContext.Provider value={user}>
      <Layout className="admin-shell">
        <aside className="admin-rail" aria-label="后台侧边入口">
          <Button
            aria-label="打开后台导航"
            className="admin-rail-menu-button"
            icon={<IconMenu size="extra-large" />}
            theme="solid"
            type="primary"
            onClick={() => setNavOpen(true)}
          />
          <div className="admin-rail-divider" />
          <Button
            aria-label="后台概览"
            className="admin-rail-icon-button"
            icon={<IconHistogram />}
            theme={pathname === '/admin/dashboard' ? 'solid' : 'borderless'}
            type={pathname === '/admin/dashboard' ? 'primary' : 'tertiary'}
            onClick={() => router.push('/admin/dashboard')}
          />
          <Button
            aria-label="分类管理"
            className="admin-rail-icon-button"
            icon={<IconFolder />}
            theme={pathname.includes('/category') || pathname.endsWith('/categories') ? 'solid' : 'borderless'}
            type={pathname.includes('/category') || pathname.endsWith('/categories') ? 'primary' : 'tertiary'}
            onClick={() => router.push('/admin/dashboard/categories')}
          />
          <Button
            aria-label="链接管理"
            className="admin-rail-icon-button"
            icon={<IconLink />}
            theme={pathname.includes('/link') || pathname.endsWith('/links') ? 'solid' : 'borderless'}
            type={pathname.includes('/link') || pathname.endsWith('/links') ? 'primary' : 'tertiary'}
            onClick={() => router.push('/admin/dashboard/links')}
          />
        </aside>

        <div className="admin-workspace">
          <header className="admin-topbar">
            <div className="admin-topbar-title">
              <Space spacing="medium" align="center">
                <Avatar color="grey" size="small">
                  <IconApps />
                </Avatar>
                <div>
                  <Title heading={5} style={{ margin: 0 }}>
                    {pageTitle}
                  </Title>
                  <DashboardBreadcrumbs />
                </div>
              </Space>
            </div>

          </header>

          <Content className="admin-main">{children}</Content>
        </div>

        <SideSheet
          title="后台导航"
          visible={navOpen}
          placement="left"
          width={340}
          onCancel={() => setNavOpen(false)}
          bodyStyle={{ padding: 0 }}
          className="admin-nav-sheet"
        >
          <div className="admin-nav-sheet-body">
            <div className="admin-nav-user">
              <Avatar color="grey">
                <IconUser />
              </Avatar>
              <div>
                <Text strong>当前账号</Text>
                <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
                  {user.email}
                </Text>
              </div>
            </div>

            {navSections.map((section) => (
              <section className="admin-nav-section" key={section.title}>
                <Text type="tertiary" size="small" className="admin-nav-section-title">
                  {section.title}
                </Text>
                <Space vertical spacing={8} style={{ width: '100%' }}>
                  {section.items.map((item) => {
                    const active = isActiveNav(pathname, item);
                    return (
                      <button
                        key={`${section.title}-${item.label}`}
                        className={`admin-nav-card${active ? ' active' : ''}`}
                        type="button"
                        onClick={() => runNavAction(item)}
                      >
                        <span className="admin-nav-card-icon">{item.icon}</span>
                        <span className="admin-nav-card-text">
                          <span>{item.label}</span>
                          <small>{item.description}</small>
                        </span>
                      </button>
                    );
                  })}
                </Space>
              </section>
            ))}

            <section className="admin-nav-section">
              <Text type="tertiary" size="small" className="admin-nav-section-title">
                账号操作
              </Text>
              <Button
                block
                type="danger"
                theme="light"
                icon={<IconExit />}
                onClick={() => {
                  setNavOpen(false);
                  setShowLogoutConfirm(true);
                }}
              >
                退出登录
              </Button>
            </section>
          </div>
        </SideSheet>

        <Modal
          title="退出登录"
          visible={showLogoutConfirm}
          okText="退出"
          cancelText="取消"
          okButtonProps={{ type: 'danger', theme: 'solid' }}
          onOk={() => {
            setShowLogoutConfirm(false);
            void handleLogout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        >
          <Space spacing="medium">
            <Avatar color="red" size="small">
              <IconExit />
            </Avatar>
            <Text>确定要退出后台管理吗？</Text>
          </Space>
        </Modal>
      </Layout>
    </UserContext.Provider>
  );
}
