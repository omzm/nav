import { memo } from 'react';
import { NavCategory } from '../types';
import NavCard from './NavCard';

interface CategorySectionProps {
  category: NavCategory;
}

function CategorySection({ category }: CategorySectionProps) {
  return (
    <section className="mb-8 sm:mb-10 lg:mb-12 animate-fade-in">
      <div className="flex items-center space-x-2 sm:space-x-2.5 mb-3 sm:mb-4 group">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
          <span className="text-sm sm:text-base">{category.icon}</span>
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
            {category.name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {category.links.length} 个网站
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
        {category.links.map((link, index) => (
          <NavCard key={`${link.url}-${index}`} link={link} />
        ))}
      </div>
    </section>
  );
}

// 使用 React.memo 优化，只在 category 改变时重新渲染
export default memo(CategorySection, (prevProps, nextProps) => {
  return (
    prevProps.category.id === nextProps.category.id &&
    prevProps.category.links.length === nextProps.category.links.length
  );
});
