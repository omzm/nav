/**
 * 防抖函数 - 延迟执行，等待停止触发后执行
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 */
export function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number
): ((...args: Args) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args) => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = undefined;
      func(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  return debounced;
}
