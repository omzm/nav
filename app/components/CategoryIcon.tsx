import { memo } from 'react';
import IconFont from './IconFont';

interface CategoryIconProps {
  icon?: string;
  className?: string;
}

const BLOCKED_SVG_TAGS = ['script', 'style', 'foreignObject', 'iframe', 'object', 'embed', 'link', 'meta'];

function sanitizeSvgCode(rawSvg: string) {
  let svg = rawSvg.trim();

  if (!/^<svg[\s\S]*<\/svg>$/i.test(svg)) {
    return '';
  }

  svg = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  for (const tag of BLOCKED_SVG_TAGS) {
    svg = svg
      .replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi'), '')
      .replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }

  return svg
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|xlink:href)\s*=\s*(['"])\s*(?!#)[^'"]*\2/gi, '')
    .replace(/\s+(href|xlink:href)\s*=\s*(?!#)[^\s>]+/gi, '')
    .replace(/\s+src\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function CategoryIcon({ icon, className = '' }: CategoryIconProps) {
  const value = icon?.trim();

  if (!value) {
    return <span className={className}>-</span>;
  }

  const safeSvg = sanitizeSvgCode(value);

  if (safeSvg) {
    return (
      <span
        aria-hidden="true"
        className={`category-svg-icon ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: safeSvg }}
      />
    );
  }

  // Legacy fallback for existing rows that still store old iconfont class names.
  if (value.startsWith('icon-') || value.includes(' icon-') || value.startsWith('iconfont ')) {
    return <IconFont name={value} className={className} />;
  }

  return <span className={className}>{value}</span>;
}

export default memo(CategoryIcon);
