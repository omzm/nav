/**
 * 共享 body 滚动锁（引用计数）。
 * Modal 与 Drawer 各自加锁/解锁：同时打开时，先关的那个不会提前放开滚动。
 */
let lockCount = 0;
let prevOverflow = '';

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = prevOverflow;
  }
}
