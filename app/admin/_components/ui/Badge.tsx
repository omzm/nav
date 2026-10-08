'use client';

import { ReactNode } from 'react';

const colors: Record<string, string> = {
  blue: 'bg-[#eff4ff] text-[#1d4ed8] border-[#dbe4fd]',
  green: 'bg-[#f0fdf4] text-[#15803d] border-[#d1f2df]',
  red: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
  amber: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
  purple: 'bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff]',
  gray: 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]',
};

export interface BadgeProps {
  color?: keyof typeof colors;
  children: ReactNode;
  className?: string;
}

/** 小标签（替代 Semi Tag） */
export default function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-normal rounded-md border whitespace-nowrap ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
}
