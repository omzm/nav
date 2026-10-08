'use client';

import { ReactNode } from 'react';

export interface CardProps {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** 卡片（替代 Semi Card） */
export default function Card({ title, extra, children, className = '', bodyClassName = '' }: CardProps) {
  return (
    <div className={`bg-white border border-[#e8edf3] rounded-[14px] ${className}`}>
      {(title || extra) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#e8edf3]">
          <div className="text-sm font-semibold text-[#1e293b] min-w-0">{title}</div>
          {extra && <div className="flex-shrink-0">{extra}</div>}
        </div>
      )}
      <div className={`px-5 py-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
