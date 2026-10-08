'use client';

import { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconMenu = (p: P) => base({ ...p, children: <path d="M4 6h16M4 12h16M4 18h16" /> });
export const IconSearch = (p: P) =>
  base({ ...p, children: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></> });
export const IconPlus = (p: P) => base({ ...p, children: <path d="M12 5v14M5 12h14" /> });
export const IconEdit = (p: P) =>
  base({ ...p, children: <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></> });
export const IconDelete = (p: P) =>
  base({ ...p, children: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> });
export const IconRefresh = (p: P) =>
  base({ ...p, children: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></> });
export const IconChevronDown = (p: P) => base({ ...p, children: <path d="m6 9 6 6 6-6" /> });
export const IconChevronUp = (p: P) => base({ ...p, children: <path d="m18 15-6-6-6 6" /> });
export const IconChevronRight = (p: P) => base({ ...p, children: <path d="m9 18 6-6-6-6" /> });
export const IconChevronLeft = (p: P) => base({ ...p, children: <path d="m15 18-6-6 6-6" /> });
export const IconArrowRight = (p: P) =>
  base({ ...p, children: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></> });
export const IconMore = (p: P) =>
  base({ ...p, children: <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></> });
export const IconX = (p: P) => base({ ...p, children: <path d="M18 6 6 18M6 6l12 12" /> });
export const IconCheck = (p: P) => base({ ...p, children: <path d="M20 6 9 17l-5-5" /> });
export const IconLink = (p: P) =>
  base({ ...p, children: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></> });
export const IconGlobe = (p: P) =>
  base({ ...p, children: <><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></> });
export const IconImage = (p: P) =>
  base({ ...p, children: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></> });
export const IconFolder = (p: P) =>
  base({ ...p, children: <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /> });
export const IconHistogram = (p: P) =>
  base({ ...p, children: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 13v4" /><path d="M12 9v8" /><path d="M17 5v12" /></> });
export const IconExit = (p: P) =>
  base({ ...p, children: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></> });
export const IconExternalOpen = (p: P) =>
  base({ ...p, children: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></> });
export const IconLock = (p: P) =>
  base({ ...p, children: <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> });
export const IconEye = (p: P) =>
  base({ ...p, children: <><path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></> });
export const IconEyeClosed = (p: P) =>
  base({ ...p, children: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="2" y1="2" x2="22" y2="22" /></> });
export const IconHandle = (p: P) =>
  base({ ...p, children: <><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></> });
export const IconFilter = (p: P) =>
  base({ ...p, children: <path d="M22 3H2l8 9.46V19l4 2v-8.54Z" /> });
export const IconBulb = (p: P) =>
  base({ ...p, children: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></> });
export const IconSave = (p: P) =>
  base({ ...p, children: <><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></> });
export const IconSetting = (p: P) =>
  base({ ...p, children: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></> });
export const IconDownload = (p: P) =>
  base({ ...p, children: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></> });
export const IconKey = (p: P) =>
  base({ ...p, children: <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /> });
export const IconMail = (p: P) =>
  base({ ...p, children: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></> });
export const IconError = (p: P) =>
  base({ ...p, children: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></> });
export const IconPreview = (p: P) =>
  base({ ...p, children: <><path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></> });
export const IconFont = (p: P) =>
  base({ ...p, children: <><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></> });
export const IconTab = (p: P) =>
  base({ ...p, children: <><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="2" y1="9" x2="22" y2="9" /></> });
export const IconUrl = (p: P) =>
  base({ ...p, children: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></> });
