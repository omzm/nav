/**
 * 数据库不可用时展示的服务错误提示（服务端组件）。
 * 用于 /admin 与 /admin/setup：此时无法判断管理员是否已配置，
 * 不能展示登录表单或初始化向导，避免误导用户。
 */
export default function DbErrorNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">数据库连接失败</h1>
        <p className="mt-2 text-sm text-gray-500">
          无法读取管理员配置，请检查数据库服务状态后重试。
        </p>
      </div>
    </div>
  );
}
