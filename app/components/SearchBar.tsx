'use client';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  // 检测是否正在输入"开门"
  const isTypingOpenDoor = value === '开' || value === '开门';

  return (
    <div className="relative w-full max-w-md group">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索..."
        className="w-full px-3 py-2 pl-9 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:bg-white/90 dark:focus:bg-gray-800/90 focus:ring-2 focus:ring-white/50 dark:focus:ring-gray-700/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:bg-white/90 dark:hover:bg-gray-800/90"
      />
      <svg
        className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-gray-600 dark:group-focus-within:text-gray-300 transition-colors duration-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="清除搜索"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* 隐私模式提示 */}
      {isTypingOpenDoor && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-amber-50 dark:bg-amber-900/90 backdrop-blur-md border border-amber-200 dark:border-amber-700 rounded-lg shadow-lg text-xs text-amber-900 dark:text-amber-100 flex items-center gap-2 animate-fadeIn">
          <span>🔑</span>
          <span>输入"开门"可显示隐藏内容</span>
        </div>
      )}
    </div>
  );
}
