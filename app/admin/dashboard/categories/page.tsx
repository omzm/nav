'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  Modal,
  Spinner,
} from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import {
  IconChevronDown,
  IconChevronUp,
  IconDelete,
  IconEdit,
  IconEye,
  IconHandle,
  IconMore,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@/app/admin/_components/ui/icons';
import CategoryIcon from '@/app/components/CategoryIcon';
import { Category, supabase } from '@/app/lib/supabase';
import { useAdminData } from '../_components/useAdminData';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

const PAGE_SIZE = 12;

const thClass =
  'px-4 py-[11px] text-left text-[11px] font-medium tracking-[0.4px] text-[#64748b] bg-[#fafbfe] border-b border-[#e8edf3] whitespace-nowrap';
const tdClass = 'px-4 py-3 align-middle text-xs text-[#1e293b] border-b border-[#eef1f6]';

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
  const [page, setPage] = useState(1);
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

  // 筛选变化时回到第一页
  useEffect(() => {
    setPage(1);
  }, [keyword]);

  // 筛选生效时禁用拖拽：此时表格只显示子集，若仍按全量列表计算拖拽位置会错位
  const isFiltering = filteredCategories.length !== categories.length;

  const showPagination = filteredCategories.length > PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = showPagination
    ? filteredCategories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : filteredCategories;

  const handleDelete = async (category: Category) => {
    setDeletingId(category.id);

    try {
      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;

      toast.success('分类已删除');
      setCategoryToDelete(null);
      await invalidateHomeCache();
      await loadData(true, { silent: true });
    } catch (error) {
      console.error('删除分类失败:', error);
      toast.error('删除分类失败，请稍后重试');
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
        toast.success('分类排序已保存');
        await invalidateHomeCache();
        await loadData(true, { silent: true });
      } catch (error) {
        console.error('移动分类排序失败:', error);
        toast.error('移动失败，已重新加载数据');
        await loadData(true, { silent: true });
      }
    },
    [isFiltering, categories, setCategories, invalidateHomeCache, loadData]
  );

  const categoryToDeleteLinkCount = categoryToDelete ? linkCountByCategory.get(categoryToDelete.id)?.total || 0 : 0;
  const isDeleting = Boolean(categoryToDelete && deletingId === categoryToDelete.id);
  const closeDeleteModal = () => {
    if (!deletingId) setCategoryToDelete(null);
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
    // 移除源行后，向下拖时目标下标前移 1，需修正插入位置（向上拖不受影响）
    const insertAt = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextCategories.splice(insertAt, 0, movedCategory);

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

      toast.success('分类排序已保存');
      await invalidateHomeCache();
      await loadData(true, { silent: true });
    } catch (error) {
      console.error('保存分类排序失败:', error);
      toast.error('保存排序失败，已重新加载数据');
      await loadData(true, { silent: true });
    }
  };

  if (loading) {
    return (
      <div className="admin-content">
        <div className="flex flex-col items-center justify-center w-full py-24 gap-3">
          <Spinner size="large" />
          <span className="text-[13px] text-[#64748b]">正在加载分类...</span>
        </div>
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
              variant="primary"
              icon={<IconPlus aria-hidden="true" />}
              onClick={() => router.push('/admin/dashboard/category/new')}
            >
              添加分类
            </Button>
          </div>
        </div>

        <Card className="admin-table-card" bodyClassName="p-0!">
          <div className="admin-list-toolbar">
            <div className="admin-toolbar-filters">
              <div className="relative w-[270px] max-w-full max-md:w-full">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  <IconSearch size={15} aria-hidden="true" />
                </span>
                <Input
                  className="pl-8"
                  value={keyword}
                  onChange={setKeyword}
                  placeholder="搜索分类名称…"
                  aria-label="搜索分类"
                />
              </div>
              {keyword && <Button variant="tertiary" size="small" onClick={() => setKeyword('')}>清除筛选</Button>}
              {isFiltering && <span className="text-xs text-[#94a3b8]">筛选时暂不支持拖拽排序</span>}
            </div>
            <span className="admin-result-count">共 <strong>{filteredCategories.length}</strong> 个分类{keyword && ' / ' + categories.length + ' 个'}</span>
          </div>

          {!isMobile && (
            <>
              <div className="admin-table-scroll">
                {pageItems.length > 0 ? (
                  <table className="w-full table-fixed min-w-[640px]">
                    <thead>
                      <tr>
                        <th className={`${thClass} w-20`}>排序</th>
                        <th className={thClass}>分类名称</th>
                        <th className={`${thClass} w-[130px]`}>收录链接</th>
                        <th className={`${thClass} w-[100px]`}>可见性</th>
                        <th className={`${thClass} w-[168px]`}>操作</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child_td]:border-b-0">
                      {pageItems.map((category) => {
                        const count = linkCountByCategory.get(category.id) || { total: 0, privateCount: 0 };
                        return (
                          <tr
                            key={category.id}
                            draggable={!isFiltering}
                            className={`admin-draggable-row transition-colors hover:bg-[#fafcff] ${isFiltering ? '' : 'cursor-move'}`}
                            onDragStart={(event) => {
                              dragItem.current = category.id;
                              // Firefox 要求 dataTransfer 写入数据才会触发拖拽
                              try {
                                event.dataTransfer?.setData('text/plain', category.id);
                                if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
                              } catch {
                                // 忽略不支持 dataTransfer 的环境
                              }
                            }}
                            onDragEnter={() => {
                              dragOverItem.current = category.id;
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                            }}
                            onDrop={() => {
                              void handleDrop();
                            }}
                          >
                            <td className={tdClass}>
                              <span className="admin-sort-cell">
                                <IconHandle className="admin-drag-handle" />
                                <span>{String(category.order).padStart(2, '0')}</span>
                              </span>
                            </td>
                            <td className={tdClass}>
                              <div className="admin-cell">
                                <div className="admin-icon-preview"><CategoryIcon icon={category.icon} /></div>
                                <span className="admin-cell-title">{category.name}</span>
                              </div>
                            </td>
                            <td className={tdClass}>
                              <span className="admin-cell-content">
                                <span>{count.total} 个链接</span>
                                {count.privateCount > 0 && <span className="admin-cell-caption">含 {count.privateCount} 个私密链接</span>}
                              </span>
                            </td>
                            <td className={tdClass}>
                              <span className={'admin-visibility' + (category.is_private ? ' is-private' : '')}>
                                {category.is_private ? '私密' : '公开'}
                              </span>
                            </td>
                            <td className={tdClass}>
                              <div className="admin-table-actions">
                                <Button size="small" variant="tertiary" icon={<IconEye aria-hidden="true" />} aria-label={'查看 ' + category.name + ' 的链接'} title="查看链接" className="w-7 px-0! text-[#8d9ab0]! hover:text-[#2563eb]" onClick={() => router.push('/admin/dashboard/links?category=' + category.id)} />
                                <Button size="small" variant="tertiary" icon={<IconPlus aria-hidden="true" />} aria-label={'在 ' + category.name + ' 下添加链接'} title="添加链接" className="w-7 px-0! text-[#8d9ab0]! hover:text-[#2563eb]" onClick={() => router.push('/admin/dashboard/link/new?category=' + category.id)} />
                                <Button size="small" variant="tertiary" icon={<IconEdit aria-hidden="true" />} aria-label={'编辑 ' + category.name} title="编辑分类" className="w-7 px-0! text-[#8d9ab0]! hover:text-[#2563eb]" onClick={() => router.push('/admin/dashboard/category/' + category.id)} />
                                <Button size="small" variant="tertiary" icon={<IconDelete aria-hidden="true" />} aria-label={'删除 ' + category.name} title="删除分类" loading={deletingId === category.id} className="w-7 px-0! text-[#c18c92]! hover:text-[#c95161] hover:bg-[#fff1f3]" onClick={() => confirmDelete(category)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <Empty title="暂无分类" description="添加分类后，首页导航会按排序展示。" />
                )}
              </div>
              {showPagination && (
                <div className="flex items-center justify-between gap-3 px-[18px] py-[13px] border-t border-[#eef1f6]">
                  <span className="text-xs text-[#94a3b8]">第 {safePage} / {totalPages} 页 · 共 {filteredCategories.length} 个分类</span>
                  <div className="flex items-center gap-2">
                    <Button size="small" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>上一页</Button>
                    <Button size="small" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>下一页</Button>
                  </div>
                </div>
              )}
            </>
          )}

          {isMobile && (
            <div className="admin-mobile-list">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category, sortIndex) => {
                  const count = linkCountByCategory.get(category.id) || { total: 0, privateCount: 0 };

                  return (
                    <article className="admin-mobile-card" key={category.id}>
                      <div className="admin-mobile-card-head">
                        <div className="admin-icon-preview">
                          <CategoryIcon icon={category.icon} />
                        </div>
                        <div className="admin-mobile-card-title">
                          <span className="admin-mobile-card-title-row">
                            <span className="admin-mobile-card-title-text font-semibold">{category.name}</span>
                            {category.is_private && <Badge color="amber">私密</Badge>}
                          </span>
                          <span className="admin-mobile-card-meta text-xs text-[#94a3b8]">
                            {count.total} 个链接{count.privateCount > 0 ? ` · 私密 ${count.privateCount}` : ''} · 排序 #{category.order}
                          </span>
                        </div>
                        <Dropdown
                          align="right"
                          trigger={
                            <Button
                              size="small"
                              variant="tertiary"
                              icon={<IconMore aria-hidden="true" />}
                              aria-label={'更多操作：' + category.name}
                              className="w-7 px-0!"
                            />
                          }
                          items={[
                            {
                              key: 'view',
                              label: <span className="flex items-center gap-2"><IconEye size={14} aria-hidden="true" />查看链接</span>,
                              onClick: () => router.push(`/admin/dashboard/links?category=${category.id}`),
                            },
                            {
                              key: 'edit',
                              label: <span className="flex items-center gap-2"><IconEdit size={14} aria-hidden="true" />编辑</span>,
                              onClick: () => router.push(`/admin/dashboard/category/${category.id}`),
                            },
                            {
                              key: 'delete',
                              label: <span className="flex items-center gap-2"><IconDelete size={14} aria-hidden="true" />删除</span>,
                              danger: true,
                              onClick: () => confirmDelete(category),
                            },
                          ]}
                        />
                      </div>

                      {!isFiltering && (
                        <div className="admin-mobile-card-actions admin-mobile-card-sort">
                          <Button
                            size="small"
                            icon={<IconChevronUp aria-hidden="true" />}
                            disabled={sortIndex <= 0}
                            onClick={() => void moveCategory(category.id, -1)}
                          >
                            上移
                          </Button>
                          <Button
                            size="small"
                            icon={<IconChevronDown aria-hidden="true" />}
                            disabled={sortIndex >= filteredCategories.length - 1}
                            onClick={() => void moveCategory(category.id, 1)}
                          >
                            下移
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })
              ) : (
                <Empty title="暂无分类" description="添加分类后，首页导航会按排序展示。" />
              )}
            </div>
          )}
          <div className="admin-table-note"><IconHandle aria-hidden="true" /><span>{isFiltering ? '清除筛选后，可调整分类在首页的顺序。' : (isMobile ? '用卡片上的上移 / 下移按钮，即可调整分类在首页的顺序。' : '拖动表格行，即可调整分类在首页的顺序。')}</span></div>
        </Card>
      </div>

      <Modal
        open={Boolean(categoryToDelete)}
        onClose={closeDeleteModal}
        title="删除分类"
        footer={
          <>
            <Button onClick={closeDeleteModal} disabled={isDeleting}>取消</Button>
            <Button
              variant="danger"
              loading={isDeleting}
              onClick={() => {
                if (categoryToDelete) void handleDelete(categoryToDelete);
              }}
            >
              删除
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-[#334155]">
          {categoryToDeleteLinkCount > 0
            ? `该分类下还有 ${categoryToDeleteLinkCount} 个链接，删除分类会同时删除这些链接。确定继续吗？`
            : `确定删除「${categoryToDelete?.name}」吗？`}
        </p>
      </Modal>
    </div>
  );
}
