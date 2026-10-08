'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  key: string;
  label: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

/** 下拉菜单（替代 Semi Dropdown，用于行内"更多"操作） */
export default function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block">
      <div onClick={() => setOpen((v) => !v)} className="inline-flex">
        {trigger}
      </div>
      {open && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[140px] bg-white border border-[#e8edf3] rounded-xl shadow-[0_8px_30px_rgba(15,23,42,0.12)] p-1.5 animate-[dropdown-in_0.15s_ease-out] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] rounded-lg transition-colors ${
                item.danger
                  ? 'text-[#dc2626] hover:bg-[#fef2f2]'
                  : 'text-[#334155] hover:bg-[#f8fafc]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <style>{`@keyframes dropdown-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}
    </div>
  );
}
