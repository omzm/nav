'use client';

import { ReactNode, useEffect, useRef } from 'react';

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: ReactNode;
  ariaLabel?: string;
}

/** 复选框（替代 Semi Checkbox，支持半选） */
export default function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  label,
  ariaLabel,
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-4 h-4 rounded border-[#cbd5e1] text-[#2563eb] accent-[#2563eb] cursor-pointer disabled:cursor-not-allowed"
      />
      {label && <span className="text-[13px] text-[#334155]">{label}</span>}
    </label>
  );
}
