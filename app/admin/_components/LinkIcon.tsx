'use client';

import { useState } from 'react';
import { IconLink } from '@douyinfe/semi-icons';
import { getFaviconUrl } from '@/app/utils/favicon';

export function isIconUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function isEmojiIcon(value: string) {
  return !isIconUrl(value) && /\p{Emoji}/u.test(value);
}

export default function LinkIcon({ link }: { link: { url: string; icon?: string | null } }) {
  const [failedUrl, setFailedUrl] = useState('');
  const customIcon = link.icon?.trim() || '';

  if (customIcon && isEmojiIcon(customIcon)) {
    return <span className="admin-link-emoji" aria-hidden="true">{customIcon}</span>;
  }

  const imageUrl = isIconUrl(customIcon) ? customIcon : getFaviconUrl(link.url);

  if (!imageUrl || failedUrl === imageUrl) {
    return <IconLink aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Admin link icons can come from arbitrary external domains.
    <img className="admin-link-icon" src={imageUrl} alt="" loading="lazy" onError={() => setFailedUrl(imageUrl)} />
  );
}
