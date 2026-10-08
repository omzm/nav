'use client';

import { ReactNode } from 'react';

export interface FieldProps {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 表单项（label + 控件 + 提示），替代原来的 .admin-form-field */
export default function Field({ label, required = false, hint, action, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13px] font-semibold text-[#1e293b]">
          {required && (
            <span className="text-[#dc2626] mr-1" aria-hidden="true">
              *
            </span>
          )}
          {label}
        </span>
        {action}
      </div>
      {children}
      {hint && <div className="mt-1.5 text-xs text-[#94a3b8] leading-relaxed">{hint}</div>}
    </div>
  );
}
