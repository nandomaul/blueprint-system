import type { IconName } from '../domain/model.ts';
const paths: Record<IconName | 'plus' | 'arrow' | 'close' | 'save' | 'zoom' | 'minus' | 'download' | 'upload' | 'history' | 'map' | 'trash' | 'hide', React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  login: <><path d="M14 4h6v16h-6M3 12h12m-4-4 4 4-4 4"/></>,
  play: <path d="m8 4 12 8-12 8z"/>, users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/></>,
  file: <><path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8m-8 4h6"/></>, check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  archive: <><path d="M4 9h16v12H4zM3 3h18v6H3zM9 13h6"/></>, layers: <><path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></>,
  link: <><path d="m10 14 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 -1) scale(.95)"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 16-6-6L3 21"/></>,
  settings: <><path d="m9 3-.6 3-2 .9-2.6-.9-2 3.5L4 11v2l-2.2 1.5 2 3.5 2.6-.9 2 .9.6 3h4l.6-3 2-.9 2.6.9 2-3.5L18 13v-2l2.2-1.5-2-3.5-2.6.9-2-.9-.6-3z"/><circle cx="11" cy="12" r="3"/></>,
  hide: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-11-3 3 3 3"/></>,
  plus: <path d="M12 4v16M4 12h16"/>, arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, close: <path d="m6 6 12 12M6 18 18 6"/>,
  save: <><path d="M4 3h13l4 4v14H3V3zM7 3v7h10V3M7 21v-7h10v7"/></>, zoom: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></>,
  minus: <path d="M4 12h16"/>, download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>, upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
  history: <><path d="M3 3v6h6M3 9a9 9 0 1 1 0 6M12 7v5l3 2"/></>, map: <><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4H5v4m7-4h7v4"/></>, trash: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>,
};
export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>; }
