'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import Button, { ButtonProps } from './ui/Button';

interface NavButtonProps extends ButtonProps {
  /** 点击后跳转的目标路由 */
  href: string;
}

/**
 * 带导航过渡反馈的按钮（替代裸 onClick + router.push）。
 *
 * 背景：后台"添加链接/添加分类"等按钮之前是裸 router.push，
 * 首次跳转要现下载表单页面的 JS chunk，手机上会有明显卡顿，
 * 用户以为没点到而重复点击。这里做两件事：
 * 1. 点下去立刻显示 loading 菊花（useTransition pending 状态），
 *    让用户明确知道"点到了，正在跳转"；
 * 2. 配合 AuthenticatedLayout 挂载时对表单路由的 prefetch，
 *    chunk 已在缓存里，跳转本身也快了。
 */
export default function NavButton({ href, onClick, loading, ...rest }: NavButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      {...rest}
      loading={loading || isPending}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          startTransition(() => {
            router.push(href);
          });
        }
      }}
    />
  );
}
