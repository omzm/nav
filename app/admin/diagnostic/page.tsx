'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, ADMIN_EMAIL } from '@/app/lib/supabase';

export default function AuthDiagnostic() {
  const [results, setResults] = useState<Array<{ label: string; status: 'ok' | 'fail' | 'warn' | 'info'; detail: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [cookies, setCookies] = useState<string[]>([]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const checks: Array<{ label: string; status: 'ok' | 'fail' | 'warn' | 'info'; detail: string }> = [];

    // 1. 环境变量
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    checks.push({
      label: 'NEXT_PUBLIC_SUPABASE_URL',
      status: url ? 'ok' : 'fail',
      detail: url ? `已配置 (${url.substring(0, 30)}...)` : '未配置',
    });

    checks.push({
      label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      status: key ? 'ok' : 'fail',
      detail: key ? `已配置 (${key.substring(0, 20)}...)` : '未配置',
    });

    checks.push({
      label: 'NEXT_PUBLIC_ADMIN_EMAIL',
      status: adminEmail ? 'ok' : 'warn',
      detail: adminEmail || '未配置（管理员校验将跳过）',
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

    // 2. Cookies
    const allCookies = document.cookie.split(';').map(c => c.trim()).filter(Boolean);
    setCookies(allCookies);

    const sbCookies = allCookies.filter(c => c.startsWith('sb-'));
    checks.push({
      label: 'Supabase Cookies（sb-*）',
      status: sbCookies.length > 0 ? 'ok' : 'warn',
      detail: sbCookies.length > 0
        ? `找到 ${sbCookies.length} 个: ${sbCookies.map(c => c.split('=')[0]).join(', ')}`
        : '无 sb- 前缀 cookie',
    });

    const authTokenCookie = sbCookies.find(c => c.includes('-auth-token'));
    checks.push({
      label: 'sb-*-auth-token Cookie',
      status: authTokenCookie ? 'ok' : 'fail',
      detail: authTokenCookie
        ? `找到: ${authTokenCookie.split('=')[0]}`
        : '未找到 — 这是 middleware 检查的 cookie，缺失会导致重定向',
    });

    // 3. Supabase Session
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      checks.push({
        label: 'supabase.auth.getSession()',
        status: session ? 'ok' : 'fail',
        detail: session
          ? `有效 session，user: ${session.user.email}`
          : `无 session${sessionError ? ` (错误: ${sessionError.message})` : ''}`,
      });

      if (session) {
        checks.push({
          label: 'Session Token',
          status: 'info',
          detail: `access_token 前 30 位: ${session.access_token.substring(0, 30)}...`,
        });
        checks.push({
          label: 'Token 过期时间',
          status: session.expires_at && session.expires_at * 1000 > Date.now() ? 'ok' : 'fail',
          detail: session.expires_at
            ? new Date(session.expires_at * 1000).toLocaleString('zh-CN')
            : '未知',
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      checks.push({
        label: 'supabase.auth.getSession()',
        status: 'fail',
        detail: `异常: ${msg}`,
      });
    }

    // 4. Supabase User
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      checks.push({
        label: 'supabase.auth.getUser()',
        status: user ? 'ok' : 'fail',
        detail: user
          ? `email: ${user.email}, id: ${user.id.substring(0, 8)}...`
          : `无 user${userError ? ` (错误: ${userError.message})` : ''}`,
      });

      if (user && ADMIN_EMAIL) {
        checks.push({
          label: '管理员邮箱匹配',
          status: user.email === ADMIN_EMAIL ? 'ok' : 'fail',
          detail: user.email === ADMIN_EMAIL
            ? '匹配'
            : `不匹配: user=${user.email}, admin=${ADMIN_EMAIL}`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      checks.push({
        label: 'supabase.auth.getUser()',
        status: 'fail',
        detail: `异常: ${msg}`,
      });
    }

    // 5. 数据库连通性
    try {
      const { data, error: dbError } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true });

      checks.push({
        label: '数据库连通性（categories 表）',
        status: !dbError ? 'ok' : 'fail',
        detail: !dbError ? '连接正常' : `错误: ${dbError.message}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      checks.push({
        label: '数据库连通性',
        status: 'fail',
        detail: `异常: ${msg}`,
      });
    }

    // 6. RLS 写入测试（尝试 insert 一条然后立刻删除）
    try {
      const testId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('categories')
        .insert([{ id: testId, name: '__diag_test__', icon: '🔧', order: 99999, is_private: true }]);

      if (insertError) {
        checks.push({
          label: 'RLS 写入权限',
          status: 'fail',
          detail: `INSERT 被拒: ${insertError.message}`,
        });
      } else {
        // 插入成功，清理
        await supabase.from('categories').delete().eq('id', testId);
        checks.push({
          label: 'RLS 写入权限',
          status: 'ok',
          detail: 'INSERT + DELETE 正常',
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      checks.push({
        label: 'RLS 写入权限',
        status: 'fail',
        detail: `异常: ${msg}`,
      });
    }

    setResults(checks);
    setLoading(false);
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'ok': return '✅';
      case 'fail': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'ok': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'fail': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warn': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warn').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              🔍 认证诊断
            </h1>
            <button
              onClick={() => { setLoading(true); setResults([]); runDiagnostics(); }}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              🔄 重新检测
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-gray-300 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">正在检测...</p>
            </div>
          ) : (
            <>
              {/* 摘要 */}
              <div className={`mb-6 p-4 rounded-lg border ${failCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {failCount === 0 ? '✅ 所有关键检查通过' : `❌ 发现 ${failCount} 个问题`}
                  {warnCount > 0 ? `，${warnCount} 个警告` : ''}
                </p>
              </div>

              {/* 检查项 */}
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${statusColor(r.status)}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{statusIcon(r.status)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {r.label}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 break-all">
                          {r.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 所有 Cookies */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2">
                  当前所有 Cookies（{cookies.length} 个）
                </h3>
                {cookies.length > 0 ? (
                  <div className="space-y-1">
                    {cookies.map((c, i) => {
                      const name = c.split('=')[0];
                      return (
                        <div key={i} className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                          <span className={name.startsWith('sb-') ? 'text-green-600 dark:text-green-400 font-bold' : ''}>
                            {name}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500"> = {c.substring(name.length + 1).substring(0, 60)}...</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">无 cookie</p>
                )}
              </div>

              {/* 快速操作 */}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/admin"
                  className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  去登录
                </a>
                <a
                  href="/admin/dashboard"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  尝试访问 Dashboard
                </a>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                >
                  登出并重新检测
                </button>
                <a
                  href="/"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  返回首页
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
