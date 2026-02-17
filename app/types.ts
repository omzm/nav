export interface NavLink {
  title: string;
  url: string;
  description: string;
  icon?: string;
  isPrivate?: boolean;
}

export interface NavCategory {
  id: string;
  name: string;
  icon: string;
  links: NavLink[];
  isPrivate?: boolean;
}
