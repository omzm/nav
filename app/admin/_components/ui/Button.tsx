'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'tertiary' | 'danger' | 'text';
  size?: 'small' | 'default';
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<string, string> = {
  primary:
    'bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white border border-transparent disabled:bg-[#93c5fd]',
  default:
    'bg-white hover:bg-[#f8fafc] active:bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0] disabled:text-[#94a3b8]',
  tertiary:
    'bg-transparent hover:bg-[#f1f5f9] active:bg-[#e2e8f0] text-[#475569] border border-transparent disabled:text-[#cbd5e1]',
  danger:
    'bg-white hover:bg-[#fef2f2] active:bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] disabled:text-[#fca5a5]',
  text: 'bg-transparent text-[#2563eb] hover:text-[#1d4ed8] border border-transparent disabled:text-[#93c5fd] p-0',
};

const sizes: Record<string, string> = {
  default: 'h-9 px-4 text-[13px]',
  small: 'h-7 px-3 text-xs',
};

/**
 * 后台统一按钮（Tailwind 版，替代 Semi Button）。
 * variant: primary=主按钮 / default=白底描边 / tertiary=幽灵 / danger=红色描边 / text=文字链
 */
export default function Button({
  variant = 'default',
  size = 'default',
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors whitespace-nowrap disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
