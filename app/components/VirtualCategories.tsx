'use client';

import { memo, useMemo, useRef, useEffect, useState } from 'react';
import { List, ListImperativeAPI } from 'react-window';
import { NavCategory } from '../types';
import CategorySection from './CategorySection';
import { VIRTUAL_SCROLL_CONFIG } from '../config/virtualScroll';

interface VirtualCategoriesProps {
  categories: NavCategory[];
}

function VirtualCategories({ categories }: VirtualCategoriesProps) {
  const listRef = useRef<ListImperativeAPI>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);
  const [itemHeight, setItemHeight] = useState(300);

  // 计算平均项目高度
  useEffect(() => {
    const calculateAverageHeight = () => {
      const totalLinks = categories.reduce((sum, cat) => sum + cat.links.length, 0);
      const avgLinksPerCategory = totalLinks / categories.length || 1;

      // 计算平均行数
      const getAvgColumns = () => {
        if (typeof window === 'undefined') return VIRTUAL_SCROLL_CONFIG.COLUMNS['2xl'];
        const width = window.innerWidth;
        if (width >= 1536) return VIRTUAL_SCROLL_CONFIG.COLUMNS['2xl'];
        if (width >= 1280) return VIRTUAL_SCROLL_CONFIG.COLUMNS.xl;
        if (width >= 1024) return VIRTUAL_SCROLL_CONFIG.COLUMNS.lg;
        if (width >= 640) return VIRTUAL_SCROLL_CONFIG.COLUMNS.sm;
        return VIRTUAL_SCROLL_CONFIG.COLUMNS.mobile;
      };

      const avgColumns = getAvgColumns();
      const avgRows = Math.ceil(avgLinksPerCategory / avgColumns);
      const { HEADER_HEIGHT, CARD_HEIGHT, GAP, MARGIN_BOTTOM } = VIRTUAL_SCROLL_CONFIG;

      const height = HEADER_HEIGHT + (avgRows * CARD_HEIGHT) + ((avgRows - 1) * GAP) + MARGIN_BOTTOM;
      setItemHeight(height);
    };

    calculateAverageHeight();

    const handleResize = () => {
      calculateAverageHeight();
    };

    const updateHeight = () => {
      if (containerRef.current) {
        const height = window.innerHeight - containerRef.current.offsetTop - 100;
        setContainerHeight(Math.max(height, 400));
      }
    };

    updateHeight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', updateHeight);
    };
  }, [categories]);

  // 判断是否使用虚拟滚动
  const shouldUseVirtualScroll = useMemo(() => {
    const totalLinks = categories.reduce((sum, cat) => sum + cat.links.length, 0);
    const useVirtual = totalLinks > VIRTUAL_SCROLL_CONFIG.THRESHOLD;

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 虚拟滚动: ${useVirtual ? '已启用' : '未启用'} (${totalLinks} 个链接)`);
    }

    return useVirtual;
  }, [categories]);

  // 不使用虚拟滚动的情况
  if (!shouldUseVirtualScroll) {
    return (
      <>
        {categories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </>
    );
  }

  // 使用虚拟滚动
  return (
    <div ref={containerRef} className="w-full">
      <List
        listRef={listRef}
        defaultHeight={containerHeight}
        rowCount={categories.length}
        rowHeight={itemHeight}
        overscanCount={VIRTUAL_SCROLL_CONFIG.OVERSCAN_COUNT}
        rowProps={{}}
        rowComponent={({ index, style }) => {
          const category = categories[index];
          return (
            <div style={style}>
              <CategorySection category={category} />
            </div>
          );
        }}
      >
        {null}
      </List>
    </div>
  );
}

export default memo(VirtualCategories);
