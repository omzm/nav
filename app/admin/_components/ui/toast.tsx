'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: ReactNode;
}

const listeners = new Set<(item: Omit<ToastItem, 'id'>) => void>();
let nextId = 1;

function emit(type: ToastType, message: ReactNode) {
  const item = { id: nextId++, type, message };
  listeners.forEach((fn) => fn(item));
}

/**
 * 通知（替代 Semi Toast）。用法与原来一致：
 *   import { toast } from '@/app/admin/_components/ui/toast';
 *   toast.success('已保存'); toast.error('失败'); toast.warning('...'); toast.info('...');
 * 需要在后台布局中挂载一次 <ToastProvider />。
 */
export const toast = {
  success: (message: ReactNode) => emit('success', message),
  error: (message: ReactNode) => emit('error', message),
  warning: (message: ReactNode) => emit('warning', message),
  info: (message: ReactNode) => emit('info', message),
};

const styles: Record<ToastType, { bar: string; icon: ReactNode }> = {
  success: {
    bar: 'bg-[#16a34a]',
    icon: (
      <svg className="w-4 h-4 text-[#16a34a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    bar: 'bg-[#dc2626]',
    icon: (
      <svg className="w-4 h-4 text-[#dc2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  warning: {
    bar: 'bg-[#d97706]',
    icon: (
      <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  info: {
    bar: 'bg-[#2563eb]',
    icon: (
      <svg className="w-4 h-4 text-[#2563eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const push = useCallback((item: Omit<ToastItem, 'id'>) => {
    const full: ToastItem = { ...item, id: nextId++ };
    setItems((prev) => [...prev.slice(-3), full]);
    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== full.id));
      timers.current.delete(full.id);
    }, 3200);
    timers.current.set(full.id, timer);
  }, []);

  useEffect(() => {
    listeners.add(push);
    return () => {
      listeners.delete(push);
    };
  }, [push]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const dismiss = (id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  };

  return (
    <>
      {children}
      {createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none w-max max-w-[calc(100vw-32px)]">
          {items.map((item) => (
            <div
              key={item.id}
              className="pointer-events-auto flex items-center gap-2.5 pl-1 pr-3 py-1 bg-white rounded-xl shadow-[0_8px_30px_rgba(15,23,42,0.16)] border border-[#e8edf3] animate-[toast-in_0.22s_cubic-bezier(0.32,0.72,0,1)]"
            >
              <span className={`w-1 self-stretch rounded-full ${styles[item.type].bar}`} />
              {styles[item.type].icon}
              <span className="text-[13px] text-[#1e293b] py-1.5">{item.message}</span>
              <button
                type="button"
                aria-label="关闭通知"
                onClick={() => dismiss(item.id)}
                className="p-1 rounded-md text-[#94a3b8] hover:text-[#475569] hover:bg-[#f1f5f9] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
        </div>,
        document.body
      )}
    </>
  );
}
