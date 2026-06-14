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
  IconExternalOpen,
  IconFilter,
  IconHandle,
  IconLink,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@douyinfe/semi-icons';
import { getFaviconUrl } from '@/app/utils/favicon';
import { Category, Link as NavLink, supabase } from '@/app/lib/supabase';
import { useAdminData } from '../_components/useAdminData';

const { Text } = Typography;
const ALL_CATEGORIES = 'all';

function isEmojiIcon(value: string) {
  return /[\p{Emoji}]/u.test(value);
}

function renderLinkIcon(link: NavLink) {
  const customIcon = link.icon?.trim() || '';

  if (customIcon && isEmojiIcon(customIcon)) {
    return <span style={{ fontSize: 24, lineHeight: 1 }}>{customIcon}</span>;
  }

  const iconUrl = customIcon && /^https?:\/\//i.test(customIcon) ? customIcon : getFaviconUrl(link.url);

  if (iconUrl) {
    return (
      <span
        aria-label="链接图标"
        role="img"
        style={{
          width: 28,
          height: 28,
          backgroundImage: `url("${iconUrl}")`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
        }}
      />
    );
  }

  return <IconLink size="large" style={{ color: 'var(--semi-color-text-2)' }} />;
}

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
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const router = useRouter();

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
    Modal.confirm({
      title: '删除链接',
      content: `确定删除「${link.title}」吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { type: 'danger', theme: 'solid' },
      onOk: () => {
        void handleDelete(link);
      },
    });
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
      const updates = normalizedLinks.map((link) =>
        supabase.from('links').update({ order: link.order }).eq('id', link.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

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
      width: 120,
      render: (_text: unknown, record: NavLink) => (
        <Space spacing={6} align="center">
          <IconHandle className={canSort ? 'admin-drag-handle' : 'admin-drag-handle disabled'} />
          <Text type="tertiary">#{record.order}</Text>
        </Space>
      ),
    },
    {
      title: '网站',
      dataIndex: 'title',
      render: (_text: unknown, record: NavLink) => (
        <Space spacing="medium" align="center">
          <div className="admin-icon-preview">{renderLinkIcon(record)}</div>
          <Space vertical spacing={2} align="start" style={{ minWidth: 0 }}>
            <Space spacing={8} wrap>
              <Text strong ellipsis={{ showTooltip: true }}>
                {record.title}
              </Text>
              {record.is_private && <Tag color="grey">私密</Tag>}
            </Space>
            <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
              {record.description}
            </Text>
            <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
              {record.url}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '分类',
      width: 180,
      render: (_text: unknown, record: NavLink) => {
        const category = categoryMap.get(record.category_id);

        return category ? (
          <Tag color="grey">{category.name}</Tag>
        ) : (
          <Tag color="grey">分类不存在</Tag>
        );
      },
    },
    {
      title: '操作',
      width: 240,
      render: (_text: unknown, record: NavLink) => (
        <Space spacing={8} wrap>
          <Button
            size="small"
            icon={<IconExternalOpen />}
            onClick={() => window.open(record.url, '_blank', 'noopener,noreferrer')}
          >
            打开
          </Button>
          <Button
            size="small"
            icon={<IconEdit />}
            onClick={() => router.push(`/admin/dashboard/link/${record.id}`)}
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
        <Spin size="large" tip="正在加载链接..." style={{ width: '100%', padding: '96px 0' }} />
      </div>
    );
  }

  return (
    <div className="admin-content">
      <Space vertical spacing={24} style={{ width: '100%' }}>
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <h1 className="admin-page-title">链接管理</h1>
            <p className="admin-page-subtitle">
              搜索、筛选并维护首页链接；选择具体分类后可以拖动调整该分类内的顺序。
            </p>
          </div>
          <Space wrap>
            <Button icon={<IconRefresh />} loading={refreshing} onClick={() => void loadData(true)}>
              刷新
            </Button>
            <Button
              theme="solid"
              type="primary"
              icon={<IconPlus />}
              onClick={() => router.push('/admin/dashboard/link/new')}
            >
              添加链接
            </Button>
          </Space>
        </Space>

        <Card bordered={false} shadows="hover" className="admin-table-card">
          <div className="admin-list-toolbar">
            <Space wrap>
              <Input
                value={keyword}
                onChange={setKeyword}
                prefix={<IconSearch />}
                placeholder="搜索标题、描述、URL 或分类"
                showClear
                style={{ width: 320, maxWidth: '100%' }}
              />
              <Select
                value={categoryFilter}
                onChange={(value) => syncCategoryFilter(value ? String(value) : ALL_CATEGORIES)}
                prefix={<IconFilter />}
                style={{ width: 220 }}
              >
                <Select.Option value={ALL_CATEGORIES}>全部分类</Select.Option>
                {categories.map((category) => (
                  <Select.Option key={category.id} value={category.id}>
                    {category.name}
                  </Select.Option>
                ))}
              </Select>
            </Space>

            <Space spacing={8} wrap>
              <Tag color="grey">
                <IconLink style={{ marginRight: 4 }} />
                {filteredLinks.length} / {links.length} 个链接
              </Tag>
              {canSort ? (
                <Tag color="grey">当前排序范围：{selectedCategory?.name}</Tag>
              ) : (
                <Tag color="grey">选择分类后可拖拽排序</Tag>
              )}
            </Space>
          </div>

          <Table<NavLink>
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
        </Card>
      </Space>
    </div>
  );
}
