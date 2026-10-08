'use client';

export interface SpinnerProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
}

/** 加载 spinner（替代 Semi Spin） */
export default function Spinner({ size = 'default', className = '' }: SpinnerProps) {
  const dims = { small: 'w-4 h-4', default: 'w-6 h-6', large: 'w-8 h-8' }[size];
  return (
    <svg
      className={`animate-spin text-[#2563eb] ${dims} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="加载中"
      role="status"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
