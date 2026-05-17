import { memo } from 'react';
import IconFont from './IconFont';

interface CategoryIconProps {
  icon?: string;
  className?: string;
}

function CategoryIcon({ icon, className = '' }: CategoryIconProps) {
  const value = icon?.trim();

  if (!value) {
    return <span className={className}>•</span>;
  }

  if (value.startsWith('icon-') || value.includes(' icon-') || value.startsWith('iconfont ')) {
    return <IconFont name={value} className={className} />;
  }

  return <span className={className}>{value}</span>;
}

export default memo(CategoryIcon);
