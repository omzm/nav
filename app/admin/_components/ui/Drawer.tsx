'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockBodyScroll, unlockBodyScroll } from './scrollLock';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  side?: 'left' | 'right';
  /** 点击遮罩是否关闭，默认 true（保持现有行为） */
  closeOnMask?: boolean;
}

/** 抽屉（替代 Semi SideSheet，用于移动端导航） */
export default function Drawer({
  open,
  onClose,
  children,
  width = 280,
  side = 'left',
  closeOnMask = true,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    // 焦点管理：打开时聚焦面板内首个可聚焦元素，关闭时恢复之前焦点
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusTarget = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusTarget ?? panel)?.focus();
    return () => {
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="presentation">
      <div
        className="absolute inset-0 bg-black/45 animate-[modal-mask-in_0.18s_ease-out]"
        onClick={() => {
          if (closeOnMask) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ width }}
        className={`absolute top-0 bottom-0 ${
          side === 'left' ? 'left-0' : 'right-0'
        } bg-white flex flex-col animate-[drawer-in_0.25s_cubic-bezier(0.32,0.72,0,1)]`}
      >
        {children}
      </div>
      <style>{`@keyframes modal-mask-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes drawer-in { from { transform: translateX(${side === 'left' ? '-100%' : '100%'}); } to { transform: translateX(0); } }`}</style>
    </div>,
    document.body
  );
}
