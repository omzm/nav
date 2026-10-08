'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useState } from 'react';

const inputClass =
  'w-full h-9 px-3 text-[13px] text-[#1e293b] bg-white border border-[#e2e8f0] rounded-lg outline-none transition-colors placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#2563eb14] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** 直接给 string 值（不是 event），与文档约定的 kit API 一致 */
  onChange?: (value: string) => void;
}

/** 单行输入框 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', onChange, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`${inputClass} ${className}`}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      {...rest}
    />
  );
});

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** 直接给 string 值（不是 event），与文档约定的 kit API 一致 */
  onChange?: (value: string) => void;
}

/** 密码输入框（带显示/隐藏切换） */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className = '', onChange, ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${inputClass} pr-10 ${className}`}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8] hover:text-[#475569] transition-colors"
        aria-label={visible ? '隐藏密码' : '显示密码'}
        tabIndex={-1}
      >
        {visible ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
});

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  /** 直接给 string 值（不是 event），与文档约定的 kit API 一致 */
  onChange?: (value: string) => void;
}

/** 多行文本框 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className = '', rows = 4, onChange, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`w-full px-3 py-2 text-[13px] text-[#1e293b] bg-white border border-[#e2e8f0] rounded-lg outline-none transition-colors placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#2563eb14] disabled:bg-[#f8fafc] resize-y ${className}`}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      {...rest}
    />
  );
});

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** 直接给 string 值（不是 event），与文档约定的 kit API 一致 */
  onChange?: (value: string) => void;
}

/** 数字输入框 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { className = '', onChange, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="number"
      className={`${inputClass} ${className}`}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      {...rest}
    />
  );
});
