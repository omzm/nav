'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Table,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconDelete,
  IconEdit,
  IconExternalOpen,
  IconFilter,
  IconHandle,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@douyinfe/semi-icons';
import LinkIcon from '../../_components/LinkIcon';
import { Category, Link as NavLink, supabase } from '@/app/lib/supabase';
import { useAdminData } from '../_components/useAdminData';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

const { Text } = Typography;
const ALL_CATEGORIES = 'all';

function sortLinksByContext(links: NavLink[], categories: Category[], categoryFilter: string) {
  const categoryOrder = new Map(categories.map((category) => [category.id, category.order]));

  return [...links].sort((a, b) => {
    if (categoryFilter === ALL_CATEGORIES) {
      const categoryDiff = (categoryOrder.get(a.category_id) || 0) - (categoryOrder.get(b.category_id) || 0);
      if (categoryDiff !== 0) return categoryDiff;
    }

    return a.order - b.order;
  });
}

export default function LinksPage() {
  const {
    categories,
    links,
    setLinks,
    categoryMap,
    loading,
    refreshing,
    invalidateHomeCache,
    loadData,
  } = useAdminData();
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [deletingId, setDeletingId] = useState('');
  const [linkToDelete, setLinkToDelete] = useState<NavLink | null>(null);
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const router = useRouter();
  // 与 admin.css 中 @media (max-width: 767px) 断点一致：移动端只渲染卡片列表，桌面端只渲染表格
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category) {
      setCategoryFilter(category);
    }
  }, []);

  const syncCategoryFilter = useCallback((nextValue: string) => {
    setCategoryFilter(nextValue);

    const url = new URL(window.location.href);
    if (nextValue === ALL_CATEGORIES) {
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', nextValue);
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const sortedLinks = useMemo(
    () => sortLinksByContext(links, categories, categoryFilter),
    [categories, categoryFilter, links]
  );

  const filteredLinks = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return sortedLinks.filter((link) => {
      if (categoryFilter !== ALL_CATEGORIES && link.category_id !== categoryFilter) return false;
      if (!query) return true;

      const categoryName = categoryMap.get(link.category_id)?.name || '';
      return `${link.title} ${link.description} ${link.url} ${categoryName}`.toLowerCase().includes(query);
    });
  }, [categoryFilter, categoryMap, keyword, sortedLinks]);

  const selectedCategory = categoryFilter === ALL_CATEGORIES ? null : categoryMap.get(categoryFilter);
  const canSort = Boolean(selectedCategory);

  const handleDelete = async (link: NavLink) => {
    setDeletingId(link.id);

    try {
      const { error } = await supabase.from('links').delete().eq('id', link.id);
      if (error) throw error;

      Toast.success('链接已删除');
      setLinkToDelete(null);
      await invalidateHomeCache();
      await loadData(true);
    } catch (error) {
      console.error('删除链接失败:', error);
      Toast.error('删除链接失败，请稍后重试');
    } finally {
      setDeletingId('');
    }
  };

  const confirmDelete = (link: NavLink) => {
    setLinkToDelete(link);
  };

  const handleDrop = async () => {
    const sourceId = dragItem.current;
    const targetId = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;

    if (!canSort || !selectedCategory || !sourceId || !targetId || sourceId === targetId) return;

    const categoryLinks = links
      .filter((link) => link.category_id === selectedCategory.id)
      .sort((a, b) => a.order - b.order);
    const sourceIndex = categoryLinks.findIndex((link) => link.id === sourceId);
    const targetIndex = categoryLinks.findIndex((link) => link.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextCategoryLinks = [...categoryLinks];
    const [movedLink] = nextCategoryLinks.splice(sourceIndex, 1);
    nextCategoryLinks.splice(targetIndex, 0, movedLink);

    const normalizedLinks = nextCategoryLinks.map((link, index) => ({
      ...link,
      order: index + 1,
    }));
    const normalizedMap = new Map(normalizedLinks.map((link) => [link.id, link]));

    setLinks(
      links.map((link) => {
        return normalizedMap.get(link.id) || link;
      })
    );

    try {
      // 一次 RPC 批量写入排序（替代之前的 N 条逐条 UPDATE）
      const { error } = await supabase.rpc('reorder_links', {
        p_ordered_ids: normalizedLinks.map((link) => link.id),
      });
      if (error) throw error;

      Toast.success('链接排序已保存');
      await invalidateHomeCache();
      await loadData(true);
    } catch (error) {
      console.error('保存链接排序失败:', error);
      Toast.error('保存排序失败，已重新加载数据');
      await loadData(true);
    }
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'order',
      width: 80,
      render: (_text: unknown, record: NavLink) => (
        <span className="admin-sort-cell"><IconHandle className={canSort ? 'admin-drag-handle' : 'admin-drag-handle disabled'} /><span>{String(record.order).padStart(2, '0')}</span></span>
      ),
    },
    {
      title: '网站信息',
      dataIndex: 'title',
      render: (_text: unknown, record: NavLink) => (
        <div className="admin-cell">
          <div className="admin-icon-preview"><LinkIcon link={record} /></div>
          <div className="admin-cell-content">
            <a className="admin-cell-title" href={record.url} target="_blank" rel="noopener noreferrer" title={record.url}>{record.title}</a>
            <span className="admin-cell-caption" title={record.description}>{record.description}</span>
          </div>
        </div>
      ),
    },
    {
      title: '所属分类',
      width: 130,
      render: (_text: unknown, record: NavLink) => {
        const category = categoryMap.get(record.category_id);
        return category ? <Tag>{category.name}</Tag> : <Tag color="red">分类不存在</Tag>;
      },
    },
    {
      title: '可见性',
      width: 94,
      render: (_text: unknown, record: NavLink) => {
        const isPrivate = record.is_private || categoryMap.get(record.category_id)?.is_private;
        return <span className={'admin-visibility' + (isPrivate ? ' is-private' : '')}>{isPrivate ? '私密' : '公开'}</span>;
      },
    },
    {
      title: '操作',
      width: 124,
      render: (_text: unknown, record: NavLink) => (
        <div className="admin-table-actions">
          <Button size="small" theme="borderless" type="tertiary" icon={<IconExternalOpen aria-hidden="true" />} aria-label={'打开 ' + record.title} title="打开网站" onClick={() => window.open(record.url, '_blank', 'noopener,noreferrer')} />
          <Button size="small" theme="borderless" type="tertiary" icon={<IconEdit aria-hidden="true" />} aria-label={'编辑 ' + record.title} title="编辑链接" onClick={() => router.push('/admin/dashboard/link/' + record.id)} />
          <Button size="small" type="danger" theme="borderless" icon={<IconDelete aria-hidden="true" />} aria-label={'删除 ' + record.title} title="删除链接" loading={deletingId === record.id} onClick={() => confirmDelete(record)} />
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="admin-content">
        <Spin size="large" tip="正在加载链接..." style={{ width: '100%', padding: '96px 0' }} />
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">链接管理</h1>
            <p className="admin-page-subtitle">
              管理收录的网站，快速查找、编辑与整理。
            </p>
          </div>
          <div className="admin-actions-row">
            <Button icon={<IconRefresh aria-hidden="true" />} loading={refreshing} onClick={() => void loadData(true)}>
              刷新
            </Button>
            <Button
              theme="solid"
              type="primary"
              icon={<IconPlus aria-hidden="true" />}
              onClick={() => router.push('/admin/dashboard/link/new')}
            >
              添加链接
            </Button>
          </div>
        </div>

        <Card bordered={false} shadows="hover" className="admin-table-card">
          <div className="admin-list-toolbar">
            <div className="admin-toolbar-filters">
              <Input className="admin-search-input" value={keyword} onChange={setKeyword} prefix={<IconSearch aria-hidden="true" />} placeholder="搜索标题、描述或网址…" aria-label="搜索链接" showClear />
              <Select className="admin-category-filter" value={categoryFilter} onChange={(value) => syncCategoryFilter(value ? String(value) : ALL_CATEGORIES)} prefix={<IconFilter aria-hidden="true" />} aria-label="筛选分类">
                <Select.Option value={ALL_CATEGORIES}>全部分类</Select.Option>
                {categories.map((category) => <Select.Option key={category.id} value={category.id}>{category.name}</Select.Option>)}
              </Select>
              {(keyword || categoryFilter !== ALL_CATEGORIES) && <Button theme="borderless" type="tertiary" size="small" onClick={() => { setKeyword(''); syncCategoryFilter(ALL_CATEGORIES); }}>重置</Button>}
            </div>
            <span className="admin-result-count">共 <strong>{filteredLinks.length}</strong> 条链接</span>
          </div>

          {!isMobile && (
          <div className="admin-table-scroll">
            <Table<NavLink>
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={filteredLinks}
              pagination={filteredLinks.length > 12 ? { pageSize: 12 } : false}
              empty={<Empty title="暂无链接" description="添加链接后，首页会按分类与排序展示。" />}
              onRow={(record) => {
                if (!record || !canSort) return {};

                return {
                  draggable: true,
                  className: 'admin-draggable-row',
                  onDragStart: () => {
                    dragItem.current = record.id;
                  },
                  onDragEnter: () => {
                    dragOverItem.current = record.id;
                  },
                  onDragOver: (event) => {
                    event.preventDefault();
                  },
                  onDrop: () => {
                    void handleDrop();
                  },
                };
              }}
            />
          </div>
          )}

          {isMobile && (
          <div className="admin-mobile-list">
            {filteredLinks.length > 0 ? (
              filteredLinks.map((link) => {
                const category = categoryMap.get(link.category_id);

                return (
                  <article className="admin-mobile-card" key={link.id}>
                    <div className="admin-mobile-card-head">
                      <div className="admin-icon-preview"><LinkIcon link={link} /></div>
                      <div className="admin-mobile-card-title">
                        <Text strong>{link.title}</Text>
                        <Text type="tertiary" size="small">
                          排序 #{link.order}
                        </Text>
                      </div>
                      {link.is_private && <Tag color="orange">私密</Tag>}
                    </div>

                    <Text type="tertiary" size="small" className="admin-mobile-card-text">
                      {link.description}
                    </Text>
                    <Text type="tertiary" size="small" className="admin-mobile-card-text">
                      {link.url}
                    </Text>

                    <div className="admin-mobile-card-tags">
                      {category ? <Tag>{category.name}</Tag> : <Tag color="red">分类不存在</Tag>}
                    </div>

                    <div className="admin-mobile-card-actions">
                      <Button
                        size="small"
                        icon={<IconExternalOpen aria-hidden="true" />}
                        onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                      >
                        打开
                      </Button>
                      <Button
                        size="small"
                        icon={<IconEdit aria-hidden="true" />}
                        onClick={() => router.push(`/admin/dashboard/link/${link.id}`)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="small"
                        type="danger"
                        theme="borderless"
                        icon={<IconDelete aria-hidden="true" />}
                        loading={deletingId === link.id}
                        onClick={() => confirmDelete(link)}
                      >
                        删除
                      </Button>
                    </div>
                  </article>
                );
              })
            ) : (
              <Empty title="暂无链接" description="添加链接后，首页会按分类与排序展示。" />
            )}
          </div>
          )}
          <div className="admin-table-note"><IconHandle aria-hidden="true" /><span>{canSort ? selectedCategory?.name + ' · 拖动表格行调整链接顺序' : '选择一个分类后，即可拖动调整链接顺序。'}</span></div>
        </Card>
      </div>

      <Modal
        title="删除链接"
        visible={Boolean(linkToDelete)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ type: 'danger', theme: 'solid', loading: Boolean(linkToDelete && deletingId === linkToDelete.id) }}
        onOk={() => {
          if (linkToDelete) void handleDelete(linkToDelete);
        }}
        onCancel={() => {
          if (!deletingId) setLinkToDelete(null);
        }}
      >
        <Text>确定删除「{linkToDelete?.title}」吗？</Text>
      </Modal>
    </div>
  );
}
