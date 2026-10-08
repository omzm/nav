'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Empty,
  Input,
  Modal,
  Select,
  Spinner,
} from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import {
  IconChevronDown,
  IconChevronUp,
  IconDelete,
  IconEdit,
  IconExternalOpen,
  IconHandle,
  IconMore,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@/app/admin/_components/ui/icons';
import LinkIcon from '../../_components/LinkIcon';
import { Category, Link as NavLink, supabase } from '@/app/lib/supabase';
import { useAdminData } from '../_components/useAdminData';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

const ALL_CATEGORIES = 'all';
const PAGE_SIZE = 12;

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

function LinksPageInner() {
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
  // 可见性筛选：all | public | private（私密 = 链接自身私密或所在分类私密）
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [deletingId, setDeletingId] = useState('');
  const [linkToDelete, setLinkToDelete] = useState<NavLink | null>(null);
  // 批量操作：选中的链接 id
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [page, setPage] = useState(1);
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const router = useRouter();
  // 与 admin.css 中 @media (max-width: 767px) 断点一致：移动端只渲染卡片列表，桌面端只渲染表格
  const isMobile = useMediaQuery('(max-width: 767px)');

  // URL 参数响应式同步：分类页/工作台 router.push 跳转过来时同组件不 remount，
  // 靠 searchParams 变化更新筛选
  const searchParams = useSearchParams();

  useEffect(() => {
    const category = searchParams.get('category');
    setCategoryFilter(category || ALL_CATEGORIES);
    // 工作台统计卡跳过来的可见性筛选
    const visibility = searchParams.get('visibility');
    setVisibilityFilter(visibility === 'public' || visibility === 'private' ? visibility : 'all');
  }, [searchParams]);

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

  // 可见性筛选与 URL 双向同步（all 时删除参数），与分类筛选保持一致：手动切换后刷新不丢失
  const syncVisibilityFilter = useCallback((nextValue: string) => {
    setVisibilityFilter(nextValue);

    const url = new URL(window.location.href);
    if (nextValue === 'all') {
      url.searchParams.delete('visibility');
    } else {
      url.searchParams.set('visibility', nextValue);
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const sortedLinks = useMemo(
    () => sortLinksByContext(links, categories, categoryFilter),
    [categories, categoryFilter, links]
  );

  const filteredLinks = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const privateCategoryIds = new Set(
      categories.filter((category) => category.is_private).map((category) => category.id)
    );

    return sortedLinks.filter((link) => {
      if (categoryFilter !== ALL_CATEGORIES && link.category_id !== categoryFilter) return false;
      const isPrivate = link.is_private || privateCategoryIds.has(link.category_id);
      if (visibilityFilter === 'public' && isPrivate) return false;
      if (visibilityFilter === 'private' && !isPrivate) return false;
      if (!query) return true;

      const categoryName = categoryMap.get(link.category_id)?.name || '';
      return `${link.title} ${link.description} ${link.url} ${categoryName}`.toLowerCase().includes(query);
    });
  }, [categories, categoryFilter, categoryMap, keyword, sortedLinks, visibilityFilter]);

  const selectedCategory = categoryFilter === ALL_CATEGORIES ? null : categoryMap.get(categoryFilter);
  const canSort = Boolean(selectedCategory);

  // 关键词筛选时看到的是子集，拖拽/按钮排序会错位，禁用（与分类页一致）
  const isFiltering = keyword.trim() !== '';

  // 排序以下标为准的列表：选中分类下的全量链接（不能用筛选后的 filteredLinks，下标会错位）
  const sortableLinks = useMemo(() => {
    if (!selectedCategory) return [];
    return links
      .filter((link) => link.category_id === selectedCategory.id)
      .sort((a, b) => a.order - b.order);
  }, [links, selectedCategory]);

  // 筛选变化时清空多选、回到第一页，避免对看不见的行做批量操作
  useEffect(() => {
    setSelectedIds([]);
    setPage(1);
  }, [keyword, categoryFilter, visibilityFilter]);

  // 数据变化后剔除已不存在的 id（如刚被删除的行）
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const alive = new Set(links.map((link) => link.id));
      const next = prev.filter((id) => alive.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [links]);

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((item) => item !== id)
    );
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(filteredLinks.map((link) => link.id));
  }, [filteredLinks]);

  // 分页（替代 Semi Table 内置分页）
  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageLinks = filteredLinks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // 表头全选：选中当前筛选的全部链接（与原 Semi rowSelection 行为一致）
  const allFilteredSelected =
    filteredLinks.length > 0 && filteredLinks.every((link) => selectedIds.includes(link.id));
  const someFilteredSelected = selectedIds.length > 0 && !allFilteredSelected;

  const handleDelete = async (link: NavLink) => {
    setDeletingId(link.id);

    try {
      const { error } = await supabase.from('links').delete().eq('id', link.id);
      if (error) throw error;

      toast.success('链接已删除');
      setLinkToDelete(null);
      await invalidateHomeCache();
      await loadData(true, { silent: true });
    } catch (error) {
      console.error('删除链接失败:', error);
      toast.error('删除链接失败，请稍后重试');
    } finally {
      setDeletingId('');
    }
  };

  const confirmDelete = (link: NavLink) => {
    setLinkToDelete(link);
  };

  // ---- 批量操作 ----
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setBatchBusy(true);
    try {
      const { error } = await supabase.from('links').delete().in('id', selectedIds);
      if (error) throw error;
      toast.success(`已删除 ${selectedIds.length} 条链接`);
      setSelectedIds([]);
      setShowBatchDelete(false);
      await invalidateHomeCache();
      await loadData(true, { silent: true });
    } catch (error) {
      console.error('批量删除链接失败:', error);
      toast.error('批量删除失败，请稍后重试');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBatchVisibility = async (isPrivate: boolean) => {
    if (selectedIds.length === 0) return;
    const selectedLinks = links.filter((link) => selectedIds.includes(link.id));
    // 私密分类下的链接有效可见性由分类决定：设为公开不会生效，提前说明避免误导
    let shadowedCount = 0;
    if (!isPrivate && selectedLinks.length > 0) {
      shadowedCount = selectedLinks.filter((link) => categoryMap.get(link.category_id)?.is_private).length;
      if (shadowedCount === selectedLinks.length) {
        toast.warning('所选链接都在私密分类下，设为公开不会生效（请先将分类设为公开）');
        return;
      }
    }
    setBatchBusy(true);
    try {
      const { error } = await supabase
        .from('links')
        .update({ is_private: isPrivate })
        .in('id', selectedIds);
      if (error) throw error;
      if (shadowedCount > 0) {
        toast.warning(`已设置，其中 ${shadowedCount} 条位于私密分类下仍显示为私密`);
      } else {
        toast.success(`已将 ${selectedIds.length} 条链接设为${isPrivate ? '私密' : '公开'}`);
      }
      setSelectedIds([]);
      await invalidateHomeCache();
      await loadData(true, { silent: true });
    } catch (error) {
      console.error('批量设置可见性失败:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBatchMove = async () => {
    if (selectedIds.length === 0 || !moveTargetId) {
      toast.warning('请选择目标分类');
      return;
    }
    const targetCategory = categoryMap.get(moveTargetId);
    if (!targetCategory) {
      toast.warning('目标分类不存在');
      return;
    }
    // 全部已在目标分类时无需移动
    const selectedLinks = links.filter((link) => selectedIds.includes(link.id));
    if (selectedLinks.length > 0 && selectedLinks.every((link) => link.category_id === moveTargetId)) {
      toast.info('所选链接已在该分类下');
      return;
    }

    setBatchBusy(true);
    // 标记分类更新是否已成功：若后续排序失败，链接实际已移动，提示必须准确
    let moved = false;
    try {
      // 1. 一次更新分类与可见性（可见性与目标分类保持一致，避免私密分类下出现公开链接）
      const { error: updateError } = await supabase
        .from('links')
        .update({ category_id: moveTargetId, is_private: Boolean(targetCategory.is_private) })
        .in('id', selectedIds);
      if (updateError) throw updateError;
      moved = true;

      // 2. 重排目标分类：原有链接按序 + 移入的链接按原顺序追加
      const { data: targetLinks, error: queryError } = await supabase
        .from('links')
        .select('id, order')
        .eq('category_id', moveTargetId)
        .order('order', { ascending: true });
      if (queryError) throw queryError;
      const movedSet = new Set(selectedIds);
      const stayingIds = (targetLinks || []).filter((link) => !movedSet.has(link.id)).map((link) => link.id);
      const movedIds = selectedLinks
        .sort((a, b) => a.order - b.order)
        .map((link) => link.id);
      const { error: rpcError } = await supabase.rpc('reorder_links', {
        p_ordered_ids: [...stayingIds, ...movedIds],
      });
      if (rpcError) throw rpcError;

      toast.success(`已将 ${selectedIds.length} 条链接移动到「${targetCategory.name}」`);
      setSelectedIds([]);
      setShowMoveModal(false);
      setMoveTargetId('');
      await invalidateHomeCache();
      await loadData(true, { silent: true });
    } catch (error) {
      console.error('批量移动链接失败:', error);
      if (moved) {
        // 分类已更新成功：刷新展示真实状态，并准确告知用户排序未保存
        toast.error('链接已移动，但排序保存失败，请手动调整顺序');
        await loadData(true, { silent: true });
      } else {
        toast.error('移动失败，请稍后重试');
      }
    } finally {
      setBatchBusy(false);
    }
  };

  // 手机端上移/下移（触屏无拖拽，用按钮代替；仅在选中分类可排序时可用）
  const moveLink = useCallback(
    async (id: string, direction: -1 | 1) => {
      if (!canSort || !selectedCategory) return;
      const categoryLinks = links
        .filter((link) => link.category_id === selectedCategory.id)
        .sort((a, b) => a.order - b.order);
      const index = categoryLinks.findIndex((link) => link.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= categoryLinks.length) return;

      const next = [...categoryLinks];
      [next[index], next[target]] = [next[target], next[index]];
      const orderMap = new Map(next.map((link, orderIndex) => [link.id, orderIndex + 1]));
      setLinks(links.map((link) => (orderMap.has(link.id) ? { ...link, order: orderMap.get(link.id)! } : link)));

      try {
        const { error } = await supabase.rpc('reorder_links', {
          p_ordered_ids: next.map((link) => link.id),
        });
        if (error) throw error;
        await invalidateHomeCache();
        await loadData(true, { silent: true });
      } catch (error) {
        console.error('移动链接排序失败:', error);
        toast.error('移动失败，已重新加载数据');
        await loadData(true, { silent: true });
      }
    },
    [canSort, selectedCategory, links, setLinks, invalidateHomeCache, loadData]
  );

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
    // 移除源行后，向下拖时目标下标前移 1，需修正插入位置（向上拖不受影响）
    const insertAt = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextCategoryLinks.splice(insertAt, 0, movedLink);

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

      toast.success('链接排序已保存');
      await invalidateHomeCache();
      await loadData(true, { silent: true });
    } catch (error) {
      console.error('保存链接排序失败:', error);
      toast.error('保存排序失败，已重新加载数据');
      await loadData(true, { silent: true });
    }
  };

  // 表格行拖拽属性（替代 Semi Table 的 onRow；仅选中分类且未筛选时可拖拽排序）
  const getRowDragProps = (record: NavLink): {
    draggable?: boolean;
    onDragStart?: (event: DragEvent<HTMLTableRowElement>) => void;
    onDragEnter?: () => void;
    onDragOver?: (event: DragEvent<HTMLTableRowElement>) => void;
    onDrop?: () => void;
  } => {
    if (!canSort) return {};
    return {
      draggable: !isFiltering,
      onDragStart: (event) => {
        dragItem.current = record.id;
        // Firefox 要求 dataTransfer 写入数据才会触发拖拽
        try {
          event.dataTransfer?.setData('text/plain', record.id);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        } catch {
          // 忽略不支持 dataTransfer 的环境
        }
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
  };

  if (loading) {
    return (
      <div className="admin-content">
        <div className="w-full py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="large" />
          <span className="text-[13px] text-[#64748b]">正在加载链接...</span>
        </div>
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
            <Button icon={<IconRefresh />} loading={refreshing} onClick={() => void loadData(true)}>
              刷新
            </Button>
            <Button
              variant="primary"
              icon={<IconPlus />}
              onClick={() => router.push('/admin/dashboard/link/new')}
            >
              添加链接
            </Button>
          </div>
        </div>

        <Card className="admin-table-card">
          <div className="admin-list-toolbar">
            <div className="admin-toolbar-filters">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none">
                  <IconSearch size={15} />
                </span>
                <Input
                  className="admin-search-input pl-9"
                  value={keyword}
                  onChange={setKeyword}
                  placeholder="搜索标题、描述或网址…"
                  aria-label="搜索链接"
                />
              </div>
              <Select
                className="admin-category-filter"
                value={categoryFilter}
                onChange={(value) => syncCategoryFilter(value || ALL_CATEGORIES)}
                options={[
                  { value: ALL_CATEGORIES, label: '全部分类' },
                  ...categories.map((category) => ({ value: category.id, label: category.name })),
                ]}
                searchable
              />
              <Select
                className="admin-category-filter"
                value={visibilityFilter}
                onChange={(value) => syncVisibilityFilter(value || 'all')}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'public', label: '公开' },
                  { value: 'private', label: '私密' },
                ]}
              />
              {(keyword || categoryFilter !== ALL_CATEGORIES || visibilityFilter !== 'all') && (
                <Button
                  size="small"
                  variant="tertiary"
                  onClick={() => {
                    setKeyword('');
                    syncCategoryFilter(ALL_CATEGORIES);
                    syncVisibilityFilter('all');
                  }}
                >
                  重置
                </Button>
              )}
            </div>
            <span className="admin-result-count">共 <strong>{filteredLinks.length}</strong> 条链接</span>
          </div>

          {selectedIds.length > 0 && (
            <div className="admin-batch-bar" role="toolbar" aria-label="批量操作">
              <span className="text-[13px] font-semibold text-[#1e293b]">已选 {selectedIds.length} 项</span>
              <Button size="small" variant="tertiary" onClick={selectAllFiltered}>
                全选 {filteredLinks.length} 条
              </Button>
              <Button size="small" variant="tertiary" onClick={() => setSelectedIds([])}>
                取消选择
              </Button>
              <span className="admin-batch-divider" />
              <Button size="small" onClick={() => setShowMoveModal(true)} loading={batchBusy}>
                移动到分类
              </Button>
              <Button size="small" onClick={() => void handleBatchVisibility(false)} loading={batchBusy}>
                设为公开
              </Button>
              <Button size="small" onClick={() => void handleBatchVisibility(true)} loading={batchBusy}>
                设为私密
              </Button>
              <Button size="small" variant="danger" onClick={() => setShowBatchDelete(true)} loading={batchBusy}>
                删除
              </Button>
            </div>
          )}

          {!isMobile && (
          <div className="admin-table-scroll">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fafbfe] text-left">
                  <th className="w-11 px-4 py-3">
                    <Checkbox
                      checked={allFilteredSelected}
                      indeterminate={someFilteredSelected}
                      onChange={() => {
                        if (allFilteredSelected) setSelectedIds([]);
                        else selectAllFiltered();
                      }}
                      ariaLabel="全选当前筛选结果"
                    />
                  </th>
                  <th className="w-20 px-4 py-3 text-[11px] font-medium tracking-wide text-[#94a3b8]">排序</th>
                  <th className="px-4 py-3 text-[11px] font-medium tracking-wide text-[#94a3b8]">网站信息</th>
                  <th className="w-[130px] px-4 py-3 text-[11px] font-medium tracking-wide text-[#94a3b8]">所属分类</th>
                  <th className="w-24 px-4 py-3 text-[11px] font-medium tracking-wide text-[#94a3b8]">可见性</th>
                  <th className="w-[124px] px-4 py-3 text-[11px] font-medium tracking-wide text-[#94a3b8]">操作</th>
                </tr>
              </thead>
              <tbody>
                {pageLinks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8">
                      <Empty title="暂无链接" description="添加链接后，首页会按分类与排序展示。" />
                    </td>
                  </tr>
                ) : (
                  pageLinks.map((link) => {
                    const category = categoryMap.get(link.category_id);
                    const isPrivate = link.is_private || category?.is_private;
                    const checked = selectedIds.includes(link.id);
                    return (
                      <tr
                        key={link.id}
                        className={`border-t border-[#eef1f6] hover:bg-[#fafcff] ${canSort ? 'admin-draggable-row' : ''}`}
                        {...getRowDragProps(link)}
                      >
                        <td className="px-4 py-3 align-middle">
                          <Checkbox
                            checked={checked}
                            onChange={(next) => toggleSelect(link.id, next)}
                            ariaLabel={'选择 ' + link.title}
                          />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="admin-sort-cell">
                            <IconHandle className={canSort ? 'admin-drag-handle' : 'admin-drag-handle disabled'} />
                            <span>{String(link.order).padStart(2, '0')}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="admin-cell">
                            <div className="admin-icon-preview"><LinkIcon link={link} /></div>
                            <div className="admin-cell-content">
                              <a className="admin-cell-title" href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>{link.title}</a>
                              <span className="admin-cell-caption" title={link.description}>{link.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {category ? <Badge>{category.name}</Badge> : <Badge color="red">分类不存在</Badge>}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className={'admin-visibility' + (isPrivate ? ' is-private' : '')}>{isPrivate ? '私密' : '公开'}</span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="admin-table-actions">
                            <Button size="small" variant="text" icon={<IconExternalOpen size={15} />} aria-label={'打开 ' + link.title} title="打开网站" onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')} />
                            <Button size="small" variant="text" icon={<IconEdit size={15} />} aria-label={'编辑 ' + link.title} title="编辑链接" onClick={() => router.push('/admin/dashboard/link/' + link.id)} />
                            <Button size="small" variant="text" icon={<span className="text-[#dc2626]"><IconDelete size={15} /></span>} aria-label={'删除 ' + link.title} title="删除链接" loading={deletingId === link.id} onClick={() => confirmDelete(link)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#eef1f6]">
                <span className="text-xs text-[#94a3b8]">第 {safePage} / {totalPages} 页</span>
                <div className="flex items-center gap-2">
                  <Button size="small" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    上一页
                  </Button>
                  <Button size="small" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}

          {isMobile && (
          <div className="admin-mobile-list">
            {filteredLinks.length > 0 ? (
              filteredLinks.map((link) => {
                const category = categoryMap.get(link.category_id);
                const checked = selectedIds.includes(link.id);
                const sortIndex = sortableLinks.findIndex((item) => item.id === link.id);

                return (
                  <article className="admin-mobile-card" key={link.id}>
                    <div className="admin-mobile-card-head">
                      <Checkbox
                        checked={checked}
                        onChange={(next) => toggleSelect(link.id, next)}
                        ariaLabel={'选择 ' + link.title}
                      />
                      <div className="admin-icon-preview"><LinkIcon link={link} /></div>
                      <div className="admin-mobile-card-title">
                        <span className="admin-mobile-card-title-row">
                          <span className="admin-mobile-card-title-text text-sm font-semibold text-[#1e293b]">{link.title}</span>
                          {link.is_private && <Badge color="amber" className="flex-none">私密</Badge>}
                        </span>
                        <span className="admin-mobile-card-meta text-xs text-[#94a3b8]">
                          {category ? category.name : '分类不存在'} · 排序 #{link.order}
                        </span>
                      </div>
                      <Dropdown
                        trigger={
                          <Button
                            size="small"
                            variant="tertiary"
                            icon={<IconMore size={15} />}
                            aria-label={'更多操作：' + link.title}
                          />
                        }
                        items={[
                          {
                            key: 'open',
                            label: (<span className="flex items-center gap-2"><IconExternalOpen size={14} />打开</span>),
                            onClick: () => window.open(link.url, '_blank', 'noopener,noreferrer'),
                          },
                          {
                            key: 'edit',
                            label: (<span className="flex items-center gap-2"><IconEdit size={14} />编辑</span>),
                            onClick: () => router.push(`/admin/dashboard/link/${link.id}`),
                          },
                          {
                            key: 'delete',
                            label: (<span className="flex items-center gap-2"><IconDelete size={14} />删除</span>),
                            danger: true,
                            onClick: () => confirmDelete(link),
                          },
                        ]}
                      />
                    </div>

                    {link.description ? (
                      <p className="admin-mobile-card-text text-xs text-[#94a3b8]">
                        {link.description}
                      </p>
                    ) : null}
                    <p className="admin-mobile-card-text admin-mobile-card-url text-xs text-[#94a3b8]">
                      {link.url}
                    </p>

                    {canSort && (
                      <div className="admin-mobile-card-actions admin-mobile-card-sort">
                        <Button
                          size="small"
                          className="flex-1"
                          icon={<IconChevronUp size={14} />}
                          disabled={isFiltering || sortIndex <= 0}
                          onClick={() => void moveLink(link.id, -1)}
                        >
                          上移
                        </Button>
                        <Button
                          size="small"
                          className="flex-1"
                          icon={<IconChevronDown size={14} />}
                          disabled={isFiltering || sortIndex < 0 || sortIndex >= sortableLinks.length - 1}
                          onClick={() => void moveLink(link.id, 1)}
                        >
                          下移
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <Empty title="暂无链接" description="添加链接后，首页会按分类与排序展示。" />
            )}
          </div>
          )}
          <div className="admin-table-note"><IconHandle /><span>{canSort ? (isFiltering ? '筛选时暂不支持拖拽排序' : selectedCategory?.name + ' · 拖动表格行调整链接顺序') : '选择一个分类后，即可拖动调整链接顺序。'}</span></div>
        </Card>
      </div>

      <Modal
        title="删除链接"
        open={Boolean(linkToDelete)}
        onClose={() => {
          if (!deletingId) setLinkToDelete(null);
        }}
        footer={
          <>
            <Button onClick={() => { if (!deletingId) setLinkToDelete(null); }}>
              取消
            </Button>
            <Button
              variant="danger"
              loading={Boolean(linkToDelete && deletingId === linkToDelete.id)}
              onClick={() => {
                if (linkToDelete) void handleDelete(linkToDelete);
              }}
            >
              删除
            </Button>
          </>
        }
      >
        <p>确定删除「{linkToDelete?.title}」吗？</p>
      </Modal>

      <Modal
        title={`批量删除 ${selectedIds.length} 条链接`}
        open={showBatchDelete}
        onClose={() => {
          if (!batchBusy) setShowBatchDelete(false);
        }}
        footer={
          <>
            <Button onClick={() => { if (!batchBusy) setShowBatchDelete(false); }}>
              取消
            </Button>
            <Button variant="danger" loading={batchBusy} onClick={() => void handleBatchDelete()}>
              删除
            </Button>
          </>
        }
      >
        <p>确定删除已选的 {selectedIds.length} 条链接吗？此操作不可撤销。</p>
      </Modal>

      <Modal
        title={`移动 ${selectedIds.length} 条链接`}
        open={showMoveModal}
        onClose={() => {
          if (!batchBusy) {
            setShowMoveModal(false);
            setMoveTargetId('');
          }
        }}
        footer={
          <>
            <Button onClick={() => { if (!batchBusy) { setShowMoveModal(false); setMoveTargetId(''); } }}>
              取消
            </Button>
            <Button variant="primary" loading={batchBusy} onClick={() => void handleBatchMove()}>
              移动
            </Button>
          </>
        }
      >
        <span className="block text-[13px] font-medium text-[#1e293b] mb-2">目标分类</span>
        <Select
          value={moveTargetId}
          onChange={setMoveTargetId}
          placeholder="请选择分类"
          searchable
          options={categories.map((category) => ({
            value: category.id,
            label: category.name + (category.is_private ? '（私密）' : ''),
          }))}
        />
        <p className="text-xs text-[#94a3b8] mt-2">
          链接将追加到目标分类末尾，公开/私密状态与目标分类保持一致。
        </p>
      </Modal>
    </div>
  );
}

// useSearchParams 需要 Suspense 边界（构建预渲染要求）
export default function LinksPage() {
  return (
    <Suspense>
      <LinksPageInner />
    </Suspense>
  );
}
