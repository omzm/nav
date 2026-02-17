'use client';

import { NavCategory } from '../types';

interface SidebarProps {
  categories: NavCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  isOpen,
  onToggle,
}: SidebarProps) {
  // 处理分类点击，移动端自动收回侧边栏
  const handleCategoryClick = (categoryId: string | null) => {
    onSelectCategory(categoryId);
    // 在移动端点击后自动关闭侧边栏
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-30 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-0 w-64 sm:w-72 flex flex-col shadow-2xl lg:shadow-none border-r border-gray-200 dark:border-gray-700/50`}
      >
        {/* 侧边栏头部 */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-lg">
              <span className="text-sm sm:text-base">📑</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
              分类
            </h2>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
            aria-label="关闭侧边栏"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 分类列表 */}
        <nav className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-300 group ${
              selectedCategory === null
                ? 'bg-gray-100 dark:bg-gray-800/50'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
            }`}
          >
            <span className="flex items-center space-x-2 sm:space-x-2.5">
              <span className={`text-sm sm:text-base transition-transform duration-300 ${selectedCategory === null ? 'scale-110' : 'group-hover:scale-110'}`}>
                🏠
              </span>
              <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                selectedCategory === null
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>全部分类</span>
            </span>
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-300 group ${
                selectedCategory === category.id
                  ? 'bg-gray-100 dark:bg-gray-800/50'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}
            >
              <span className="flex items-center space-x-2 sm:space-x-2.5">
                <span className={`text-sm sm:text-base transition-transform duration-300 ${selectedCategory === category.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {category.icon}
                </span>
                <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                  selectedCategory === category.id
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>{category.name}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* 侧边栏底部装饰 */}
        <div className="p-2.5 sm:p-3 border-t border-gray-200 dark:border-gray-700/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            共 {categories.length} 个分类
          </div>
        </div>
      </aside>
    </>
  );
}
