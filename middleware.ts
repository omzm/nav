import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from './app/lib/admin-auth';

/**
 * 后台访问保护（对应安全修复 S2）。
 *
 * /admin（登录页）放行；其余 /admin/* 必须持有服务端签发的
 * 管理员会话 Cookie（HttpOnly，HMAC 签名），否则重定向到登录页。
 *
 * 注意：
 * - ADMIN_SESSION_SECRET 未配置时 verifyAdminToken 恒返回 null，
 *   所有后台访问被拒绝（fail closed）。
 * - 数据层面的最终防线仍是 Supabase RLS 写策略（仅管理员邮箱可写）。
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 登录页与初始化向导放行
  if (pathname === '/admin' || pathname === '/admin/setup') {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const email = await verifyAdminToken(token);

  if (!email) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.searchParams.set('error', 'auth');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
