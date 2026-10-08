'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  side?: 'left' | 'right';
}

/** 抽屉（替代 Semi SideSheet，用于移动端导航） */
export default function Drawer({ open, onClose, children, width = 280, side = 'left' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="presentation">
      <div
        className="absolute inset-0 bg-black/45 animate-[modal-mask-in_0.18s_ease-out]"
        onClick={onClose}
      />
      <div
        style={{ width }}
        className={`absolute top-0 bottom-0 ${
          side === 'left' ? 'left-0' : 'right-0'
        } bg-white shadow-2xl flex flex-col animate-[drawer-in_0.25s_cubic-bezier(0.32,0.72,0,1)]`}
      >
        {children}
      </div>
      <style>{`@keyframes modal-mask-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes drawer-in { from { transform: translateX(${side === 'left' ? '-100%' : '100%'}); } to { transform: translateX(0); } }`}</style>
    </div>,
    document.body
  );
}
