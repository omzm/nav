'use client';

import { ReactNode } from 'react';

export interface EmptyProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** 空状态（替代 Semi Empty） */
export default function Empty({
  title = '暂无数据',
  description,
  action,
  className = '',
}: EmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 px-5 text-center ${className}`}>
      <svg
        className="w-12 h-12 text-[#cbd5e1] mb-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
      <div className="text-sm text-[#475569]">{title}</div>
      {description && <div className="mt-1 text-xs text-[#94a3b8]">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
