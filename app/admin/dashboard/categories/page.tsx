'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconDelete,
  IconEdit,
  IconEyeOpened,
  IconFolder,
  IconHandle,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@douyinfe/semi-icons';
import CategoryIcon from '@/app/components/CategoryIcon';
import { Category, supabase } from '@/app/lib/supabase';
import { useAdminData } from '../_components/useAdminData';

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
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const router = useRouter();

  const filteredCategories = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return categories
      .filter((category) => {
        if (!query) return true;
        return category.name.toLowerCase().includes(query);
      })
      .sort((a, b) => a.order - b.order);
  }, [categories, keyword]);

  const handleDelete = async (category: Category) => {
    setDeletingId(category.id);

    try {
      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;

      Toast.success('分类已删除');
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
    const linkCount = linkCountByCategory.get(category.id)?.total || 0;

    Modal.confirm({
      title: '删除分类',
      content:
        linkCount > 0
          ? `该分类下还有 ${linkCount} 个链接，删除分类会同时删除这些链接。确定继续吗？`
          : `确定删除「${category.name}」吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { type: 'danger', theme: 'solid' },
      onOk: () => {
        void handleDelete(category);
      },
    });
  };

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
      const updates = normalizedCategories.map((category) =>
        supabase.from('categories').update({ order: category.order }).eq('id', category.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

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
      width: 96,
      render: (_text: unknown, record: Category) => (
        <Space spacing={6} align="center">
          <IconHandle className="admin-drag-handle" />
          <Text type="tertiary">#{record.order}</Text>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'name',
      render: (_text: unknown, record: Category) => (
        <Space spacing="medium" align="center">
          <div className="admin-icon-preview">
            <CategoryIcon icon={record.icon} />
          </div>
          <Space vertical spacing={2} align="start" style={{ minWidth: 0 }}>
            <Space spacing={8} wrap>
              <Text strong ellipsis={{ showTooltip: true }}>
                {record.name}
              </Text>
              {record.is_private && <Tag color="grey">私密</Tag>}
            </Space>
            <Text type="tertiary" size="small">
              {record.icon?.trim().startsWith('<svg') ? 'SVG 图标已配置' : '请编辑为 SVG 代码'}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '链接数',
      width: 160,
      render: (_text: unknown, record: Category) => {
        const count = linkCountByCategory.get(record.id) || { total: 0, privateCount: 0 };

        return (
          <Space spacing={8} wrap>
            <Tag>{count.total} 个链接</Tag>
            {count.privateCount > 0 && <Tag color="grey">私密 {count.privateCount}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '操作',
      width: 260,
      render: (_text: unknown, record: Category) => (
        <Space spacing={8} wrap>
          <Button
            size="small"
            icon={<IconEyeOpened />}
            onClick={() => router.push(`/admin/dashboard/links?category=${record.id}`)}
          >
            查看链接
          </Button>
          <Button
            size="small"
            icon={<IconEdit />}
            onClick={() => router.push(`/admin/dashboard/category/${record.id}`)}
          >
            编辑
          </Button>
          <Button
            size="small"
            type="danger"
            theme="borderless"
            icon={<IconDelete />}
            loading={deletingId === record.id}
            onClick={() => confirmDelete(record)}
          >
            删除
          </Button>
        </Space>
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
      <Space vertical spacing={24} style={{ width: '100%' }}>
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <h1 className="admin-page-title">分类管理</h1>
            <p className="admin-page-subtitle">维护首页导航分组，拖动行可以调整展示顺序。</p>
          </div>
          <Space wrap>
            <Button icon={<IconRefresh />} loading={refreshing} onClick={() => void loadData(true)}>
              刷新
            </Button>
            <Button
              theme="solid"
              type="primary"
              icon={<IconPlus />}
              onClick={() => router.push('/admin/dashboard/category/new')}
            >
              添加分类
            </Button>
          </Space>
        </Space>

        <Card bordered={false} shadows="hover" className="admin-table-card">
          <div className="admin-list-toolbar">
            <Input
              value={keyword}
              onChange={setKeyword}
              prefix={<IconSearch />}
              placeholder="搜索分类名称"
              showClear
              style={{ width: 320, maxWidth: '100%' }}
            />
            <Space spacing={8} wrap>
              <Tag color="grey">
                <IconFolder style={{ marginRight: 4 }} />
                {filteredCategories.length} / {categories.length} 个分类
              </Tag>
              {keyword && <Tag color="grey">搜索结果可直接拖拽排序</Tag>}
            </Space>
          </div>

          <Table<Category>
            rowKey="id"
            columns={columns}
            dataSource={filteredCategories}
            pagination={filteredCategories.length > 12 ? { pageSize: 12 } : false}
            empty={<Empty title="暂无分类" description="添加分类后，首页导航会按排序展示。" />}
            onRow={(record) => {
              if (!record) return {};

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
        </Card>
      </Space>
    </div>
  );
}
