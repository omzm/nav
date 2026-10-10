'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  key: string;
  label: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  /** 受控展开状态；不传则内部管理（非受控，保持原有行为） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** 下拉菜单（替代 Semi Dropdown，用于行内"更多"操作） */
export default function Dropdown({
  trigger,
  items,
  align = 'right',
  open: controlledOpen,
  onOpenChange,
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const open = controlledOpen ?? uncontrolledOpen;
  const changeOpen = useCallback((next: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        changeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [changeOpen]);

  // Escape 关闭（焦点在菜单内时）
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        changeOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, changeOpen]);

  return (
    <div ref={rootRef} className="relative inline-block">
      {/* 键盘操作冒泡到这里：Enter/Space 切换，Escape 关闭 */}
      <div
        className="inline-flex"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => changeOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            changeOpen(!open);
          } else if (e.key === 'Escape') {
            changeOpen(false);
          } else if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            changeOpen(true);
          }
        }}
      >
        {trigger}
      </div>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 min-w-[140px] bg-white border border-[#e8edf3] rounded-xl p-1.5 animate-[dropdown-in_0.15s_ease-out] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                changeOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                item.danger
                  ? 'text-[#dc2626] hover:bg-[#fef2f2] disabled:hover:bg-transparent'
                  : 'text-[#334155] hover:bg-[#f8fafc] disabled:hover:bg-transparent'
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