'use client';

import { useEffect } from 'react';

/**
 * 首页键盘快捷键：Ctrl/⌘ + K 聚焦搜索框。
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
