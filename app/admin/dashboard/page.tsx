'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Empty, Spin } from '@douyinfe/semi-ui';
import {
  IconChevronRight,
  IconDownload,
  IconEdit,
  IconFolder,
  IconGlobe,
  IconLink,
  IconLock,
  IconPlus,
  IconRefresh,
  IconServer,
} from '@douyinfe/semi-icons';
import CategoryIcon from '@/app/components/CategoryIcon';
import LinkIcon from '../_components/LinkIcon';
import { useAdminData } from './_components/useAdminData';

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function AdminDashboard() {
  const {
    categories, links, categoryMap, linkCountByCategory,
    loading, refreshing, stats, exportData, loadData,
  } = useAdminData();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        router.push('/admin/dashboard/link/new');
      } else if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        router.push('/admin/dashboard/category/new');
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void loadData(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadData, router]);

  if (loading) {
    return <div className="admin-content"><Spin tip="正在加载工作台…" style={{ width: '100%', padding: '96px 0' }} /></div>;
  }

  const latestLinks = [...links]
    .sort((a, b) => (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0))
    .slice(0, 5);
  const visibleCategories = [...categories]
    .sort((a, b) => (linkCountByCategory.get(b.id)?.total || 0) - (linkCountByCategory.get(a.id)?.total || 0))
    .slice(0, 5);
  const maxCategoryCount = Math.max(1, ...visibleCategories.map((category) => linkCountByCategory.get(category.id)?.total || 0));
  const statCards = [
    { label: '收录链接', value: stats.totalLinks, icon: IconLink, tone: '', caption: '分布于 ' + stats.totalCategories + ' 个分类' },
    { label: '公开链接', value: stats.publicLinks, icon: IconGlobe, tone: 'is-green', caption: '在首页默认展示' },
    { label: '私密链接', value: stats.privateLinks, icon: IconLock, tone: 'is-amber', caption: '在隐私模式中展示' },
    { label: '导航分类', value: stats.totalCategories, icon: IconFolder, tone: 'is-purple', caption: '公开 ' + stats.publicCategories + ' · 私密 ' + stats.privateCategories },
  ];

  return (
    <div className="admin-content">
      <div className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">工作台</h1>
            <p className="admin-page-subtitle">查看收录情况，继续整理你的分类与链接。</p>
          </div>
          <div className="admin-actions-row">
            <Button icon={<IconRefresh aria-hidden="true" />} loading={refreshing} onClick={() => void loadData(true)}>刷新数据</Button>
            <Button theme="solid" type="primary" icon={<IconPlus aria-hidden="true" />} onClick={() => router.push('/admin/dashboard/link/new')}>添加链接</Button>
          </div>
        </div>

        <div className="admin-stats-grid">
          {statCards.map(({ label, value, icon: Icon, tone, caption }) => (
            <article className="admin-stat-card" key={label}>
              <div className="admin-stat-top">
                <span>{label}</span>
                <span className={'admin-stat-icon ' + tone}><Icon aria-hidden="true" /></span>
              </div>
              <strong className="admin-stat-value">{value.toLocaleString('zh-CN')}</strong>
              <p className="admin-stat-caption">{caption}</p>
            </article>
          ))}
        </div>

        <div className="admin-overview-grid">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div><h2>分类分布</h2><p>链接最多的 {visibleCategories.length} 个分类</p></div>
              <Link className="admin-inline-link" href="/admin/dashboard/categories">全部分类 <IconChevronRight aria-hidden="true" /></Link>
            </div>
            {visibleCategories.length ? (
              <div className="admin-category-list">
                {visibleCategories.map((category) => {
                  const count = linkCountByCategory.get(category.id)?.total || 0;
                  return (
                    <button className="admin-category-row" key={category.id} onClick={() => router.push('/admin/dashboard/links?category=' + category.id)}>
                      <span className="admin-icon-preview"><CategoryIcon icon={category.icon} /></span>
                      <span className="admin-category-detail">
                        <span className="admin-category-label">
                          <span className="admin-category-name"><span>{category.name}</span>{category.is_private && <IconLock aria-label="私密分类" />}</span>
                          <span className="admin-category-count">{count} 个链接</span>
                        </span>
                        <span className="admin-category-bar" aria-hidden="true"><span style={{ width: (count / maxCategoryCount) * 100 + '%' }} /></span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Empty title="从第一个分类开始" description="为收藏建立分类，让好用的网站各就其位。">
                <Button size="small" onClick={() => router.push('/admin/dashboard/category/new')}>添加分类</Button>
              </Empty>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div><h2>最近添加</h2><p>最新收录的网站与工具</p></div>
              <Link className="admin-inline-link" href="/admin/dashboard/links">全部链接 <IconChevronRight aria-hidden="true" /></Link>
            </div>
            {latestLinks.length ? (
              <div className="admin-recent-list">
                {latestLinks.map((link) => (
                  <div className="admin-recent-row" key={link.id}>
                    <span className="admin-icon-preview"><LinkIcon link={link} /></span>
                    <div className="admin-recent-info">
                      <a className="admin-recent-title" href={link.url} target="_blank" rel="noopener noreferrer" title={link.title}>{link.title}</a>
                      <span className="admin-recent-domain">{getHostname(link.url)}</span>
                    </div>
                    <span className="admin-recent-category">{categoryMap.get(link.category_id)?.name || '未分类'}</span>
                    <Button theme="borderless" type="tertiary" icon={<IconEdit aria-hidden="true" />} aria-label={'编辑 ' + link.title} title="编辑链接" onClick={() => router.push('/admin/dashboard/link/' + link.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="还没有收录链接" description="添加一个常用网站，开始建立你的收藏夹。">
                <Button size="small" onClick={() => router.push('/admin/dashboard/link/new')}>添加链接</Button>
              </Empty>
            )}
          </section>
        </div>

        <div className="admin-quick-actions">
          <button className="admin-quick-action" onClick={() => router.push('/admin/dashboard/category/new')}>
            <IconFolder aria-hidden="true" /><span><strong>添加分类</strong><small>为收藏建立新的分组</small></span><IconChevronRight aria-hidden="true" />
          </button>
          <button className="admin-quick-action" onClick={exportData}>
            <IconDownload aria-hidden="true" /><span><strong>导出备份</strong><small>保存全部分类与链接</small></span><IconChevronRight aria-hidden="true" />
          </button>
          <button className="admin-quick-action" onClick={() => router.push('/admin/init')}>
            <IconServer aria-hidden="true" /><span><strong>数据库检查</strong><small>查看数据与连接状态</small></span><IconChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
