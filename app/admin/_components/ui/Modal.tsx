'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
  closeOnMask?: boolean;
}

/** 弹窗（替代 Semi Modal，挂载到 body） */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 480,
  closeOnMask = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] animate-[modal-mask-in_0.18s_ease-out]"
      onMouseDown={(e) => {
        if (closeOnMask && e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{ maxWidth }}
        className="w-full bg-white rounded-2xl overflow-hidden animate-[modal-panel-in_0.22s_cubic-bezier(0.32,0.72,0,1)]"
      >
        {(title || true) && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#f1f5f9]">
            <div className="text-[15px] font-semibold text-[#1e293b]">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="p-1.5 -m-1 rounded-lg text-[#94a3b8] hover:text-[#475569] hover:bg-[#f1f5f9] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4 text-sm text-[#334155]">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#f1f5f9] bg-[#fafbfc]">
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes modal-mask-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes modal-panel-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>,
    document.body
  );
}
