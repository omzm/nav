/**
 * 节流函数 - 限制函数执行频率
 * leading 立即执行一次；节流窗口内最后一次调用在 trailing 补执行，
 * 保证结束状态不丢失（比如滚动停止后的最终进度）。
 * @param func 要节流的函数
 * @param limit 时间间隔（毫秒）
 */
export function throttle<Args extends unknown[]>(
  func: (...args: Args) => void,
  limit: number
): (...args: Args) => void {
  let inThrottle = false;
  let lastArgs: Args | null = null;

  return (...args: Args) => {
    if (!inThrottle) {
      inThrottle = true;
      func(...args);
      setTimeout(() => {
        inThrottle = false;
        // trailing：窗口内有被吞掉的调用，补执行最后一次
        if (lastArgs) {
          const trailingArgs = lastArgs;
          lastArgs = null;
          func(...trailingArgs);
          inThrottle = true;
          setTimeout(() => {
            inThrottle = false;
          }, limit);
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}
