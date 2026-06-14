'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Space, Spin, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowLeft,
  IconInfoCircle,
  IconRefresh,
  IconTickCircle,
} from '@douyinfe/semi-icons';
import { supabase, isSupabaseConfigured, ADMIN_EMAIL } from '@/app/lib/supabase';
import { getLocalAdminUser, signOutLocalAdmin } from '@/app/lib/local-admin';

const { Paragraph, Text } = Typography;

type CheckStatus = 'ok' | 'fail' | 'warn' | 'info';

type DiagnosticResult = {
  label: string;
  status: CheckStatus;
  detail: string;
};

const statusMeta: Record<CheckStatus, { color: 'grey'; label: string; icon: ReactNode }> = {
  ok: { color: 'grey', label: '正常', icon: <IconTickCircle /> },
  fail: { color: 'grey', label: '失败', icon: <IconAlertCircle /> },
  warn: { color: 'grey', label: '警告', icon: <IconAlertTriangle /> },
  info: { color: 'grey', label: '信息', icon: <IconInfoCircle /> },
};

export default function AuthDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [cookies, setCookies] = useState<string[]>([]);
  const router = useRouter();

  const runDiagnostics = useCallback(async () => {
    setLoading(true);

    const checks: DiagnosticResult[] = [];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const localUser = getLocalAdminUser();

    checks.push({
      label: 'NEXT_PUBLIC_SUPABASE_URL',
      status: supabaseUrl ? 'ok' : 'fail',
      detail: supabaseUrl ? `已配置（${supabaseUrl.substring(0, 30)}...）` : '未配置',
    });

    checks.push({
      label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      status: supabaseKey ? 'ok' : 'fail',
      detail: supabaseKey ? `已配置（${supabaseKey.substring(0, 20)}...）` : '未配置',
    });

    checks.push({
      label: 'NEXT_PUBLIC_ADMIN_EMAIL',
      status: adminEmail ? 'ok' : 'warn',
      detail: adminEmail || '未配置，管理员邮箱校验将跳过',
    });

    checks.push({
      label: 'isSupabaseConfigured',
      status: isSupabaseConfigured ? 'ok' : 'fail',
      detail: String(isSupabaseConfigured),
    });

    checks.push({
      label: 'ADMIN_EMAIL（运行时）',
      status: ADMIN_EMAIL ? 'ok' : 'warn',
      detail: ADMIN_EMAIL || '空',
    });

    checks.push({
      label: '本地测试登录',
      status: localUser ? 'ok' : 'info',
      detail: localUser ? `已启用：${localUser.email}` : '未使用本地测试 session',
    });

    const allCookies = document.cookie.split(';').map((cookie) => cookie.trim()).filter(Boolean);
    setCookies(allCookies);

    const sbCookies = allCookies.filter((cookie) => cookie.startsWith('sb-'));
    checks.push({
      label: 'Supabase Cookies（sb-*）',
      status: sbCookies.length > 0 ? 'ok' : 'warn',
      detail:
        sbCookies.length > 0
          ? `找到 ${sbCookies.length} 个：${sbCookies.map((cookie) => cookie.split('=')[0]).join(', ')}`
          : '没有 sb- 前缀 cookie',
    });

    const authTokenCookie = sbCookies.find((cookie) => cookie.includes('-auth-token'));
    checks.push({
      label: 'sb-*-auth-token Cookie',
      status: authTokenCookie ? 'ok' : 'fail',
      detail: authTokenCookie ? `找到：${authTokenCookie.split('=')[0]}` : '未找到 auth token cookie',
    });

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      checks.push({
        label: 'supabase.auth.getSession()',
        status: session ? 'ok' : 'fail',
        detail: session
          ? `有效 session，用户：${session.user.email}`
          : `无 session${sessionError ? `（${sessionError.message}）` : ''}`,
      });

      if (session) {
        checks.push({
          label: 'Session Token',
          status: 'info',
          detail: `access_token 前 30 位：${session.access_token.substring(0, 30)}...`,
        });
        checks.push({
          label: 'Token 过期时间',
          status: session.expires_at && session.expires_at * 1000 > Date.now() ? 'ok' : 'fail',
          detail: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString('zh-CN') : '未知',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({
        label: 'supabase.auth.getSession()',
        status: 'fail',
        detail: `异常：${message}`,
      });
    }

    try {
      const {
        data: { user },
        error: userError,
      } = localUser
        ? { data: { user: localUser }, error: null }
        : await supabase.auth.getUser();

      checks.push({
        label: 'supabase.auth.getUser()',
        status: user ? 'ok' : 'fail',
        detail: user ? `email：${user.email}，id：${user.id.substring(0, 8)}...` : `无 user${userError ? `（${userError.message}）` : ''}`,
      });

      if (user && ADMIN_EMAIL) {
        checks.push({
          label: '管理员邮箱匹配',
          status: user.email === ADMIN_EMAIL ? 'ok' : 'fail',
          detail: user.email === ADMIN_EMAIL ? '匹配' : `不匹配：user=${user.email}，admin=${ADMIN_EMAIL}`,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({
        label: 'supabase.auth.getUser()',
        status: 'fail',
        detail: `异常：${message}`,
      });
    }

    try {
      const { error: dbError } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true });

      checks.push({
        label: '数据库连通性（categories 表）',
        status: dbError ? 'fail' : 'ok',
        detail: dbError ? `错误：${dbError.message}` : '连接正常',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({
        label: '数据库连通性',
        status: 'fail',
        detail: `异常：${message}`,
      });
    }

    try {
      const testId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('categories')
        .insert([{ id: testId, name: '__diag_test__', icon: 'icon-tool', order: 99999, is_private: true }]);

      if (insertError) {
        checks.push({
          label: 'RLS 写入权限',
          status: 'fail',
          detail: `INSERT 被拒：${insertError.message}`,
        });
      } else {
        await supabase.from('categories').delete().eq('id', testId);
        checks.push({
          label: 'RLS 写入权限',
          status: 'ok',
          detail: 'INSERT + DELETE 正常',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({
        label: 'RLS 写入权限',
        status: 'fail',
        detail: `异常：${message}`,
      });
    }

    setResults(checks);
    setLoading(false);
  }, []);

  const checkAuth = useCallback(async () => {
    const localUser = getLocalAdminUser();
    if (localUser) {
      await runDiagnostics();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/admin');
      return;
    }

    await runDiagnostics();
  }, [router, runDiagnostics]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkAuth();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [checkAuth]);

  const failCount = useMemo(() => results.filter((result) => result.status === 'fail').length, [results]);
  const warnCount = useMemo(() => results.filter((result) => result.status === 'warn').length, [results]);

  const handleSignOutAndRetest = async () => {
    signOutLocalAdmin();
    await supabase.auth.signOut();
    Toast.info('已退出登录');
    router.push('/admin');
  };

  return (
    <main className="admin-shell">
      <div className="admin-form-page">
        <Space vertical spacing={24} style={{ width: '100%' }}>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <h1 className="admin-page-title">认证诊断</h1>
              <p className="admin-page-subtitle">检查 Supabase Auth、Cookie、Session、RLS 和管理员邮箱配置。</p>
            </div>
            <Space wrap>
              <Button icon={<IconArrowLeft />} onClick={() => router.push('/admin/dashboard')}>
                返回后台
              </Button>
              <Button
                icon={<IconRefresh />}
                loading={loading}
                onClick={() => void runDiagnostics()}
              >
                重新检测
              </Button>
            </Space>
          </Space>

          <Card bordered={false} shadows="hover">
            {loading ? (
              <Spin size="large" tip="正在检测..." style={{ width: '100%', padding: '64px 0' }} />
            ) : (
              <Space vertical spacing="medium" align="start" style={{ width: '100%' }}>
                <Tag
                  color="grey"
                  prefixIcon={failCount > 0 ? <IconAlertCircle /> : <IconTickCircle />}
                >
                  {failCount === 0 ? '关键检查通过' : `发现 ${failCount} 个问题`}
                </Tag>
                {warnCount > 0 && <Text type="warning">另有 {warnCount} 个警告项需要关注。</Text>}
              </Space>
            )}
          </Card>

          {!loading && (
            <>
              <Space vertical spacing="medium" style={{ width: '100%' }}>
                {results.map((result) => {
                  const meta = statusMeta[result.status];
                  return (
                    <Card key={`${result.label}-${result.status}`} bordered={false} shadows="hover">
                      <Space align="start" spacing="medium">
                        <Tag color={meta.color} prefixIcon={meta.icon}>
                          {meta.label}
                        </Tag>
                        <Space vertical spacing={4} align="start" style={{ minWidth: 0 }}>
                          <Text strong>{result.label}</Text>
                          <Paragraph
                            type="tertiary"
                            style={{ margin: 0, wordBreak: 'break-all' }}
                          >
                            {result.detail}
                          </Paragraph>
                        </Space>
                      </Space>
                    </Card>
                  );
                })}
              </Space>

              <Card title={`当前 Cookies（${cookies.length} 个）`} bordered={false} shadows="hover">
                {cookies.length > 0 ? (
                  <Space vertical align="start" style={{ width: '100%' }}>
                    {cookies.map((cookie) => {
                      const name = cookie.split('=')[0];
                      return (
                        <Text key={cookie} code style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>
                          {name} = {cookie.substring(name.length + 1).substring(0, 60)}...
                        </Text>
                      );
                    })}
                  </Space>
                ) : (
                  <Text type="tertiary">无 cookie</Text>
                )}
              </Card>

              <Card title="快捷操作" bordered={false} shadows="hover">
                <Space wrap>
                  <Button theme="solid" type="primary" onClick={() => router.push('/admin/dashboard')}>
                    尝试访问 Dashboard
                  </Button>
                  <Button onClick={() => router.push('/admin')}>去登录</Button>
                  <Button type="danger" theme="light" onClick={() => void handleSignOutAndRetest()}>
                    退出并重新登录
                  </Button>
                  <Button onClick={() => router.push('/')}>返回首页</Button>
                </Space>
              </Card>
            </>
          )}
        </Space>
      </div>
    </main>
  );
}
