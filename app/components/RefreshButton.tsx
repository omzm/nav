'use client';

export default function RefreshButton() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <button
      onClick={handleRefresh}
      className="fixed bottom-[8.5rem] sm:bottom-[9rem] right-4 sm:right-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center group"
      aria-label="刷新页面"
      type="button"
    >
      <svg
        className="w-6 h-6 text-gray-600 dark:text-gray-300 transition-transform duration-300 group-hover:rotate-180"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}
