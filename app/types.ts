export interface NavLink {
  title: string;
  url: string;
  description: string;
  icon?: string;
}

export interface NavCategory {
  id: string;
  name: string;
  icon: string;
  links: NavLink[];
}
