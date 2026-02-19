import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = [
  '/admin/dashboard',
  '/admin/test',
  '/admin/init',
  '/admin/env-check',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Supabase JS v2 默认使用 localStorage 存储 session，不会自动设置 cookie
  // 因此 middleware 无法可靠检测登录状态
  // 改为放行所有请求，由页面内的 checkUser 做客户端校验
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
