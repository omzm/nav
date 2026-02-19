// 虚拟滚动配置
export const VIRTUAL_SCROLL_CONFIG = {
  // 超过这个数量的链接才启用虚拟滚动
  THRESHOLD: 50,

  // 预渲染的项目数量（上下各渲染几个）
  OVERSCAN_COUNT: 2,

  // 卡片高度估算
  CARD_HEIGHT: 120,

  // 分类标题高度
  HEADER_HEIGHT: 80,

  // 间距
  GAP: 12,

  // 底部间距
  MARGIN_BOTTOM: 80,

  // 响应式列数配置
  COLUMNS: {
    mobile: 1,    // < 640px
    sm: 2,        // >= 640px
    lg: 2,        // >= 1024px
    xl: 3,        // >= 1280px
    '2xl': 4,     // >= 1536px
  },
};
