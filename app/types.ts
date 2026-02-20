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
}
