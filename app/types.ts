export interface NavLink {
  id?: string;
  title: string;
  url: string;
  description: string;
  icon?: string;
  isPrivate?: boolean;
}

export interface HotLink {
  title: string;
  url: string;
  icon?: string;
  clickCount: number;
}

export interface NavCategory {
  id: string;
  name: string;
  icon: string;
  links: NavLink[];
  isPrivate?: boolean;
  /** 后台排序值（用于开门后私密分类归位；旧快照可能没有） */
  order?: number;
}

export interface NavSnapshot {
  categories: NavCategory[];
  hotLinks: HotLink[];
  stats: {
    categoryCount: number;
    linkCount: number;
    totalViewCount: number;
  };
  generatedAt: string;
}
