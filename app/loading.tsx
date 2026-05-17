export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
      <aside className="hidden lg:flex w-64 flex-col bg-white/95 dark:bg-gray-900/95 border-r border-gray-200 dark:border-gray-700/50">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-9 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700/50 space-y-2">
          <div className="h-3 w-24 mx-auto rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-3 w-28 mx-auto rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative overflow-hidden border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
          <div
            className="absolute inset-0 bg-cover bg-center bg-gradient-to-br from-blue-400 to-indigo-600"
            style={{ backgroundImage: 'url(https://bing.img.run/uhd.php)' }}
          />
          <div className="relative px-4 py-3">
            <div className="flex justify-end mb-2 lg:hidden">
              <div className="w-10 h-10 rounded-lg bg-white/20 animate-pulse" />
            </div>
            <div className="flex justify-center mb-3">
              <div className="h-8 w-28 rounded bg-white/50 animate-pulse" />
            </div>
            <div className="flex justify-center px-2 sm:px-0">
              <div className="w-full max-w-md h-10 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-md animate-pulse" />
            </div>
            <div className="flex justify-center px-2 sm:px-0 mt-3 sm:mt-4">
              <div className="w-full max-w-md h-6 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md animate-pulse" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="max-w-[1600px] mx-auto space-y-10">
            {Array.from({ length: 3 }).map((_, sectionIndex) => (
              <section key={sectionIndex}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div>
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
                    <div className="h-3 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
                  {Array.from({ length: 8 }).map((_, cardIndex) => (
                    <div
                      key={cardIndex}
                      className="min-h-16 sm:min-h-0 p-1.5 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm"
                    >
                      <div className="flex h-full flex-col items-center justify-center gap-1 sm:h-auto sm:flex-row sm:items-start sm:justify-start sm:gap-0 sm:space-x-3">
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
                        <div className="w-full flex-1 min-w-0 pt-1">
                          <div className="h-3 sm:h-4 w-2/3 mx-auto sm:mx-0 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
                          <div className="hidden sm:block h-3 w-full rounded bg-gray-100 dark:bg-gray-700/70 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
