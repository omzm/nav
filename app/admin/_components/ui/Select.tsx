'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface SelectOption {
  value: string;
  /** 选项显示内容（字符串或自定义渲染） */
  label: ReactNode;
  /** 搜索过滤用文本；不填时若 label 是字符串则用 label */
  searchText?: string;
}

export interface SelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/** 下拉选择（替代 Semi Select，支持搜索过滤） */
export default function Select({
  value,
  onChange,
  options,
  placeholder = '请选择',
  searchable = false,
  loading = false,
  disabled = false,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const text = o.searchText ?? (typeof o.label === 'string' ? o.label : '');
      return text.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
    });
  }, [options, keyword]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setKeyword('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-9 px-3 flex items-center justify-between gap-2 text-[13px] text-left bg-white border border-[#e2e8f0] rounded-lg outline-none transition-colors hover:border-[#cbd5e1] focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#2563eb14] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] ${
          open ? 'border-[#2563eb] ring-[3px] ring-[#2563eb14]' : ''
        }`}
      >
        <span className={`truncate ${selected ? 'text-[#1e293b]' : 'text-[#94a3b8]'}`}>
          {loading ? '加载中…' : selected?.label || placeholder}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-[#94a3b8] transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-[#e8edf3] rounded-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-[#f1f5f9]">
              <input
                ref={searchRef}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索…"
                className="w-full h-8 px-2.5 text-[13px] bg-[#f8fafc] border border-transparent rounded-md outline-none focus:border-[#2563eb] focus:bg-white placeholder:text-[#94a3b8]"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-xs text-[#94a3b8] text-center">无匹配选项</div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setKeyword('');
                }}
                className={`w-full px-3 py-2 text-left text-[13px] rounded-lg transition-colors truncate ${
                  o.value === value
                    ? 'bg-[#eff4ff] text-[#1d4ed8] font-medium'
                    : 'text-[#334155] hover:bg-[#f8fafc]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
