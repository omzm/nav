/**
 * 节流函数 - 限制函数执行频率
 * @param func 要节流的函数
 * @param limit 时间间隔（毫秒）
 */
export function throttle<Args extends unknown[]>(
  func: (...args: Args) => void,
  limit: number
): (...args: Args) => void {
  let inThrottle = false;

  return (...args: Args) => {
    if (!inThrottle) {
      inThrottle = true;
      func(...args);
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
