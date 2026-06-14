'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Empty, Space, Spin, Tag, Typography } from '@douyinfe/semi-ui';
import {
  IconDownload,
  IconEyeOpened,
  IconFolder,
  IconFolderOpen,
  IconHistogram,
  IconLink,
  IconPlus,
  IconRefresh,
} from '@douyinfe/semi-icons';
import CategoryIcon from '@/app/components/CategoryIcon';
import { useAdminData } from './_components/useAdminData';

const { Text, Title } = Typography;

export default function AdminDashboard() {
  const { categories, links, loading, refreshing, stats, exportData, loadData } = useAdminData();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tagName = (event.target as HTMLElement).tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

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
    return (
      <div className="admin-content">
        <Spin size="large" tip="正在加载后台数据..." style={{ width: '100%', padding: '96px 0' }} />
      </div>
    );
  }

  const latestLinks = links.slice(0, 6);
  const visibleCategories = categories.slice(0, 6);

  return (
    <div className="admin-content">
      <div className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">后台概览</h1>
            <p className="admin-page-subtitle">这里只保留数据状态和常用入口；具体维护请从左侧导航进入分类或链接页面。</p>
          </div>

          <div className="admin-actions-row">
            <Button
              theme="solid"
              type="primary"
              icon={<IconPlus />}
              onClick={() => router.push('/admin/dashboard/link/new')}
            >
              添加链接
            </Button>
            <Button icon={<IconFolder />} onClick={() => router.push('/admin/dashboard/category/new')}>
              添加分类
            </Button>
            <Button icon={<IconDownload />} onClick={exportData}>
              导出
            </Button>
            <Button icon={<IconRefresh />} loading={refreshing} onClick={() => void loadData(true)}>
              刷新
            </Button>
          </div>
        </div>

        <div className="admin-stats-grid">
          <Card className="admin-stat-card" bordered={false} shadows="hover">
            <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space vertical spacing={4} align="start">
                <Text type="tertiary">总分类</Text>
                <Title heading={2} style={{ margin: 0 }}>
                  {stats.totalCategories}
                </Title>
                <Text type="secondary" size="small">
                  公开 {stats.publicCategories} · 私密 {stats.privateCategories}
                </Text>
              </Space>
              <IconFolderOpen size="extra-large" style={{ color: 'var(--semi-color-primary)' }} />
            </Space>
          </Card>

          <Card className="admin-stat-card" bordered={false} shadows="hover">
            <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space vertical spacing={4} align="start">
                <Text type="tertiary">总链接</Text>
                <Title heading={2} style={{ margin: 0 }}>
                  {stats.totalLinks}
                </Title>
                <Text type="secondary" size="small">
                  公开 {stats.publicLinks} · 私密 {stats.privateLinks}
                </Text>
              </Space>
              <IconLink size="extra-large" style={{ color: 'var(--semi-color-success)' }} />
            </Space>
          </Card>

          <Card className="admin-stat-card" bordered={false} shadows="hover">
            <Space vertical spacing={8} align="start">
              <Text type="tertiary">分类维护</Text>
              <Title heading={4} style={{ margin: 0 }}>
                独立页面
              </Title>
              <Button size="small" icon={<IconFolder />} onClick={() => router.push('/admin/dashboard/categories')}>
                打开分类管理
              </Button>
            </Space>
          </Card>

          <Card className="admin-stat-card" bordered={false} shadows="hover">
            <Space vertical spacing={8} align="start">
              <Text type="tertiary">链接维护</Text>
              <Title heading={4} style={{ margin: 0 }}>
                搜索与筛选
              </Title>
              <Button size="small" icon={<IconLink />} onClick={() => router.push('/admin/dashboard/links')}>
                打开链接管理
              </Button>
            </Space>
          </Card>
        </div>

        <div className="admin-overview-grid">
          <Card
            title="分类概览"
            bordered={false}
            shadows="hover"
            headerExtraContent={
              <Button theme="borderless" onClick={() => router.push('/admin/dashboard/categories')}>
                管理分类
              </Button>
            }
          >
            {visibleCategories.length > 0 ? (
              <Space vertical spacing="medium" style={{ width: '100%' }}>
                {visibleCategories.map((category) => (
                  <Space key={category.id} style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <div className="admin-icon-preview">
                        <CategoryIcon icon={category.icon} />
                      </div>
                      <Text strong>{category.name}</Text>
                    </Space>
                    {category.is_private && <Tag color="grey">私密</Tag>}
                  </Space>
                ))}
              </Space>
            ) : (
              <Empty title="暂无分类" description="先添加分类，再添加链接。" />
            )}
          </Card>

          <Card
            title="链接概览"
            bordered={false}
            shadows="hover"
            headerExtraContent={
              <Button theme="borderless" onClick={() => router.push('/admin/dashboard/links')}>
                管理链接
              </Button>
            }
          >
            {latestLinks.length > 0 ? (
              <Space vertical spacing="medium" style={{ width: '100%' }}>
                {latestLinks.map((link) => (
                  <Space key={link.id} style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                    <Space vertical spacing={2} align="start" style={{ minWidth: 0 }}>
                      <Text strong ellipsis={{ showTooltip: true }}>
                        {link.title}
                      </Text>
                      <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
                        {link.url}
                      </Text>
                    </Space>
                    <Button
                      size="small"
                      icon={<IconEyeOpened />}
                      onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                    />
                  </Space>
                ))}
              </Space>
            ) : (
              <Empty title="暂无链接" description="添加第一个链接后会在这里看到摘要。" />
            )}
          </Card>
        </div>

        <Card title="常用操作" bordered={false} shadows="hover">
          <div className="admin-actions-row">
            <Button
              icon={<IconLink />}
              theme="solid"
              type="primary"
              onClick={() => router.push('/admin/dashboard/link/new')}
            >
              添加链接
            </Button>
            <Button icon={<IconFolder />} onClick={() => router.push('/admin/dashboard/category/new')}>
              添加分类
            </Button>
            <Button icon={<IconHistogram />} onClick={() => router.push('/admin/diagnostic')}>
              认证诊断
            </Button>
            <Button icon={<IconEyeOpened />} onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}>
              查看网站
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
