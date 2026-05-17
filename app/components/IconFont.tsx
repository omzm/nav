import { memo } from 'react';

interface IconFontProps {
  name: string;
  className?: string;
}

const PATHS: Record<string, string> = {
  'icon-book': 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5A2.5 2.5 0 0 1 17.5 21H6.5A2.5 2.5 0 0 1 4 18.5v-13Zm3 0h10M7 9h8M7 13h6',
  'icon-chart': 'M4 19h16M7 16V9m5 7V5m5 11v-6',
  'icon-cloud': 'M7 18h10.5a4.5 4.5 0 0 0 .7-8.95A6.5 6.5 0 0 0 5.7 10.4A3.9 3.9 0 0 0 7 18Z',
  'icon-code': 'm8 9-4 3 4 3m8-6 4 3-4 3m-2-9-4 12',
  'icon-delete': 'M5 7h14m-9 4v6m4-6v6M8 7l1 13h6l1-13M10 7V4h4v3',
  'icon-design': 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z',
  'icon-download': 'M12 3v11m0 0 4-4m-4 4-4-4M5 19h14',
  'icon-edit': 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Zm10-13 3 3',
  'icon-eye': 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'icon-folder': 'M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2h7.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10Z',
  'icon-folder-open': 'M3 8.5A2.5 2.5 0 0 1 5.5 6H9l2 2h7.5A2.5 2.5 0 0 1 21 10.5v1H7.5L5.5 19H18l3-7.5',
  'icon-lightning': 'M13 2 5 14h6l-1 8 8-12h-6l1-8Z',
  'icon-link': 'M10 13a5 5 0 0 0 7.1.2l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.2l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1',
  'icon-lock': 'M7 11V8a5 5 0 0 1 10 0v3M6.5 11h11A1.5 1.5 0 0 1 19 12.5v6A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-6A1.5 1.5 0 0 1 6.5 11Z',
  'icon-plus': 'M12 5v14M5 12h14',
  'icon-refresh': 'M20 6v5h-5M4 18v-5h5M18 11a6 6 0 0 0-10.4-4M6 13a6 6 0 0 0 10.4 4',
  'icon-robot': 'M12 5V3m-6 8a6 6 0 0 1 12 0v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5Zm3 1h.01M15 12h.01M9 16h6',
};

function normalizeIconName(name: string) {
  const classes = name.trim().split(/\s+/);
  return classes.find((item) => item.startsWith('icon-')) || classes[0] || 'icon-folder';
}

function IconFont({ name, className = '' }: IconFontProps) {
  const iconName = normalizeIconName(name);
  const path = PATHS[iconName] || PATHS['icon-folder'];

  return (
    <svg
      className={`inline-block h-[1em] w-[1em] flex-shrink-0 align-[-0.125em] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export default memo(IconFont);
