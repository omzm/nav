'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Spin,
  Table,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconChevronDown,
  IconChevronUp,
  IconDelete,
  IconEdit,
  IconEyeOpened,
  IconHandle,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@douyinfe/semi-icons';
import CategoryIcon from '@/app/components/CategoryIcon';
import { Category, supabase } from '@/app/lib/supabase';
import { useAdminData } from '../_components/useAdminData';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

const { Text } = Typography;

export default function CategoriesPage() {
  const {
    categories,
    setCategories,
    linkCountByCategory,
    loading,
    refreshing,
    invalidateHomeCache,
    loadData,
  } = useAdminData();
  const [keyword, setKeyword] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const router = useRouter();
  // 与 admin.css 中 @media (max-width: 767px) 断点一致：移动端只渲染卡片列表，桌面端只渲染表格
  const isMobile = useMediaQuery('(max-width: 767px)');

  const filteredCategories = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return categories
      .filter((category) => {
        if (!query) return true;
        return category.name.toLowerCase().includes(query);
      })
      .sort((a, b) => a.order - b.order);
  }, [categories, keyword]);

  // 筛选生效时禁用拖拽：此时表格只显示子集，若仍按全量列表计算拖拽位置会错位
  const isFiltering = filteredCategories.length !== categories.length;

  const handleDelete = async (category: Category) => {
    setDeletingId(category.id);

    try {
      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;

      Toast.success('分类已删除');
      setCategoryToDelete(null);
      await invalidateHomeCache();
      await loadData(true);
    } catch (error) {
      console.error('删除分类失败:', error);
      Toast.error('删除分类失败，请稍后重试');
    } finally {
      setDeletingId('');
    }
  };

  const confirmDelete = (category: Category) => {
    setCategoryToDelete(category);
  };

  // 手机端上移/下移（触屏无拖拽，用按钮代替；筛选时与拖拽一样禁用）
  const moveCategory = useCallback(
    async (id: string, direction: -1 | 1) => {
      if (isFiltering) return;
      const orderedCategories = [...categories].sort((a, b) => a.order - b.order);
      const index = orderedCategories.findIndex((category) => category.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= orderedCategories.length) return;

      const nextCategories = [...orderedCategories];
      [nextCategories[index], nextCategories[target]] = [nextCategories[target], nextCategories[index]];
      const normalizedCategories = nextCategories.map((category, orderIndex) => ({
        ...category,
        order: orderIndex + 1,
      }));
      setCategories(normalizedCategories);

      try {
        const { error } = await supabase.rpc('reorder_categories', {
          p_ordered_ids: normalizedCategories.map((category) => category.id),
        });
        if (error) throw error;
        Toast.success('分类排序已保存');
        await invalidateHomeCache();
        await loadData(true);
      } catch (error) {
        console.error('移动分类排序失败:', error);
        Toast.error('移动失败，已重新加载数据');
        await loadData(true);
      }
    },
    [isFiltering, categories, setCategories, invalidateHomeCache, loadData]
  );

  const categoryToDeleteLinkCount = categoryToDelete ? linkCountByCategory.get(categoryToDelete.id)?.total || 0 : 0;

  const handleDrop = async () => {
    const sourceId = dragItem.current;
    const targetId = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;

    if (!sourceId || !targetId || sourceId === targetId) return;

    const orderedCategories = [...categories].sort((a, b) => a.order - b.order);
    const sourceIndex = orderedCategories.findIndex((category) => category.id === sourceId);
    const targetIndex = orderedCategories.findIndex((category) => category.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextCategories = [...orderedCategories];
    const [movedCategory] = nextCategories.splice(sourceIndex, 1);
    nextCategories.splice(targetIndex, 0, movedCategory);

    const normalizedCategories = nextCategories.map((category, index) => ({
      ...category,
      order: index + 1,
    }));

    setCategories(normalizedCategories);

    try {
      // 一次 RPC 批量写入排序（替代之前的 N 条逐条 UPDATE）
      const { error } = await supabase.rpc('reorder_categories', {
        p_ordered_ids: normalizedCategories.map((category) => category.id),
      });
      if (error) throw error;

      Toast.success('分类排序已保存');
      await invalidateHomeCache();
      await loadData(true);
    } catch (error) {
      console.error('保存分类排序失败:', error);
      Toast.error('保存排序失败，已重新加载数据');
      await loadData(true);
    }
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'order',
      width: 80,
      render: (_text: unknown, record: Category) => (
        <span className="admin-sort-cell"><IconHandle className="admin-drag-handle" /><span>{String(record.order).padStart(2, '0')}</span></span>
      ),
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      render: (_text: unknown, record: Category) => (
        <div className="admin-cell">
          <div className="admin-icon-preview"><CategoryIcon icon={record.icon} /></div>
          <span className="admin-cell-title">{record.name}</span>
        </div>
      ),
    },
    {
      title: '收录链接',
      width: 130,
      render: (_text: unknown, record: Category) => {
        const count = linkCountByCategory.get(record.id) || { total: 0, privateCount: 0 };
        return <span className="admin-cell-content"><span>{count.total} 个链接</span>{count.privateCount > 0 && <span className="admin-cell-caption">含 {count.privateCount} 个私密链接</span>}</span>;
      },
    },
    {
      title: '可见性',
      width: 100,
      render: (_text: unknown, record: Category) => <span className={'admin-visibility' + (record.is_private ? ' is-private' : '')}>{record.is_private ? '私密' : '公开'}</span>,
    },
    {
      title: '操作',
      width: 168,
      render: (_text: unknown, record: Category) => (
        <div className="admin-table-actions">
          <Button size="small" theme="borderless" type="tertiary" icon={<IconEyeOpened aria-hidden="true" />} aria-label={'查看 ' + record.name + ' 的链接'} title="查看链接" onClick={() => router.push('/admin/dashboard/links?category=' + record.id)} />
          <Button size="small" theme="borderless" type="tertiary" icon={<IconPlus aria-hidden="true" />} aria-label={'在 ' + record.name + ' 下添加链接'} title="添加链接" onClick={() => router.push('/admin/dashboard/link/new?category=' + record.id)} />
          <Button size="small" theme="borderless" type="tertiary" icon={<IconEdit aria-hidden="true" />} aria-label={'编辑 ' + record.name} title="编辑分类" onClick={() => router.push('/admin/dashboard/category/' + record.id)} />
          <Button size="small" type="danger" theme="borderless" icon={<IconDelete aria-hidden="true" />} aria-label={'删除 ' + record.name} title="删除分类" loading={deletingId === record.id} onClick={() => confirmDelete(record)} />
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="admin-content">
        <Spin size="large" tip="正在加载分类..." style={{ width: '100%', padding: '96px 0' }} />
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-stack">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">分类管理</h1>
            <p className="admin-page-subtitle">整理导航分组，让每个链接各就其位。</p>
          </div>
          <div className="admin-actions-row">
            <Button icon={<IconRefresh aria-hidden="true" />} loading={refreshing} onClick={() => void loadData(true)}>
              刷新
            </Button>
            <Button
              theme="solid"
              type="primary"
              icon={<IconPlus aria-hidden="true" />}
              onClick={() => router.push('/admin/dashboard/category/new')}
            >
              添加分类
            </Button>
          </div>
        </div>

        <Card bordered={false} shadows="hover" className="admin-table-card">
          <div className="admin-list-toolbar">
            <div className="admin-toolbar-filters">
              <Input className="admin-search-input" value={keyword} onChange={setKeyword} prefix={<IconSearch aria-hidden="true" />} placeholder="搜索分类名称…" aria-label="搜索分类" showClear />
              {keyword && <Button theme="borderless" type="tertiary" size="small" onClick={() => setKeyword('')}>清除筛选</Button>}
              {isFiltering && <Text type="tertiary" size="small">筛选时暂不支持拖拽排序</Text>}
            </div>
            <span className="admin-result-count">共 <strong>{filteredCategories.length}</strong> 个分类{keyword && ' / ' + categories.length + ' 个'}</span>
          </div>

          {!isMobile && (
          <div className="admin-table-scroll">
            <Table<Category>
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={filteredCategories}
              pagination={filteredCategories.length > 12 ? { pageSize: 12 } : false}
              empty={<Empty title="暂无分类" description="添加分类后，首页导航会按排序展示。" />}
              onRow={(record) => {
                if (!record) return {};

                return {
                  draggable: !isFiltering,
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
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const count = linkCountByCategory.get(category.id) || { total: 0, privateCount: 0 };

                return (
                  <article className="admin-mobile-card" key={category.id}>
                    <div className="admin-mobile-card-head">
                      <div className="admin-icon-preview">
                        <CategoryIcon icon={category.icon} />
                      </div>
                      <div className="admin-mobile-card-title">
                        <Text strong>{category.name}</Text>
                        <Text type="tertiary" size="small">
                          排序 #{category.order}
                        </Text>
                      </div>
                      {category.is_private && <Tag color="orange">私密</Tag>}
                    </div>

                    <div className="admin-mobile-card-tags">
                      <Tag>{count.total} 个链接</Tag>
                      {count.privateCount > 0 && <Tag color="orange">私密 {count.privateCount}</Tag>}
                    </div>

                    <div className="admin-mobile-card-actions">
                      <Button
                        size="small"
                        icon={<IconEyeOpened aria-hidden="true" />}
                        onClick={() => router.push(`/admin/dashboard/links?category=${category.id}`)}
                      >
                        查看链接
                      </Button>
                      {!isFiltering && (
                        <>
                          <Button
                            size="small"
                            icon={<IconChevronUp aria-hidden="true" />}
                            aria-label={'上移 ' + category.name}
                            title="上移"
                            onClick={() => void moveCategory(category.id, -1)}
                          />
                          <Button
                            size="small"
                            icon={<IconChevronDown aria-hidden="true" />}
                            aria-label={'下移 ' + category.name}
                            title="下移"
                            onClick={() => void moveCategory(category.id, 1)}
                          />
                        </>
                      )}
                      <Button
                        size="small"
                        icon={<IconEdit aria-hidden="true" />}
                        onClick={() => router.push(`/admin/dashboard/category/${category.id}`)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="small"
                        type="danger"
                        theme="borderless"
                        icon={<IconDelete aria-hidden="true" />}
                        loading={deletingId === category.id}
                        onClick={() => confirmDelete(category)}
                      >
                        删除
                      </Button>
                    </div>
                  </article>
                );
              })
            ) : (
              <Empty title="暂无分类" description="添加分类后，首页导航会按排序展示。" />
            )}
          </div>
          )}
          <div className="admin-table-note"><IconHandle aria-hidden="true" /><span>{isFiltering ? '清除筛选后，可拖动表格行调整分类在首页的顺序。' : '拖动表格行，即可调整分类在首页的顺序。'}</span></div>
        </Card>
      </div>

      <Modal
        title="删除分类"
        visible={Boolean(categoryToDelete)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{
          type: 'danger',
          theme: 'solid',
          loading: Boolean(categoryToDelete && deletingId === categoryToDelete.id),
        }}
        onOk={() => {
          if (categoryToDelete) void handleDelete(categoryToDelete);
        }}
        onCancel={() => {
          if (!deletingId) setCategoryToDelete(null);
        }}
      >
        <Text>
          {categoryToDeleteLinkCount > 0
            ? `该分类下还有 ${categoryToDeleteLinkCount} 个链接，删除分类会同时删除这些链接。确定继续吗？`
            : `确定删除「${categoryToDelete?.name}」吗？`}
        </Text>
      </Modal>
    </div>
  );
}
