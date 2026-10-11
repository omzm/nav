'use client';

import Image from 'next/image';

export default function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="admin-brand">
      <span className="admin-brand-mark" aria-hidden="true">
        <Image src="/icon.svg" width={22} height={22} alt="" />
      </span>
      <span className="admin-brand-text">
        <strong>收藏夹</strong>
        {!compact && <small>内容管理工作台</small>}
      </span>
    </span>
  );
}
