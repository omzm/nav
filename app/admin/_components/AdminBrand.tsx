export default function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="admin-brand">
      <span className="admin-brand-mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.5L6 20V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 8.5h6M9 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="admin-brand-text">
        <strong>收藏夹</strong>
        {!compact && <small>内容管理工作台</small>}
      </span>
    </span>
  );
}
