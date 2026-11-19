/** Minimal inline icon set (stroke icons, 24×24, currentColor). */
const PATHS: Record<string, string> = {
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  note: 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h7M9 17h5',
  notebook: 'M5 3h13a1 1 0 011 1v16a1 1 0 01-1 1H5zM9 3v18M12 8h4',
  all: 'M4 5h16M4 12h16M4 19h16',
  pin: 'M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  restore: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5',
  tag: 'M3 12V4h8l9 9-8 8zM7.5 8.5h.01',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  highlighter: 'M9 15l-3 3v3h3l3-3M9 15l7-11 4 3-8 11zM9 15l3 3',
  eraser: 'M8 20h12M5 15l9-9 5 5-8 8H8z',
  select: 'M5 3l13 8-6 1.5L9 19z',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  page: 'M6 3h12v18H6z',
  pageAdd: 'M6 3h12v18H6zM12 9v6M9 12h6',
  pageDel: 'M6 3h12v18H6zM9 12h6',
  bold: 'M7 4h6a4 4 0 010 8H7zM7 12h7a4 4 0 010 8H7z',
  italic: 'M14 4h-4M14 20h-4M14 4l-4 16',
  underline: 'M7 4v7a5 5 0 0010 0V4M5 21h14',
  strike: 'M5 12h14M16 6a4 4 0 00-4-2c-2.5 0-4 1.3-4 3 0 4 8 3 8 7 0 1.8-1.7 3-4 3a5 5 0 01-4.5-2.5',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  olist: 'M10 6h10M10 12h10M10 18h10M4 5l1-1v4M4 14h2l-2 3h2',
  check: 'M4 5h5v5H4zM5 7.5l1.2 1.2L8 6.5M12 7h8M4 14h5v5H4zM12 16h8',
  quote: 'M7 7h4v4c0 3-2 5-4 6M14 7h4v4c0 3-2 5-4 6',
  mark: 'M4 20h16M7 16l9-9 3 3-9 9H7z',
  clear: 'M5 5l14 14M9 4h10M13 4l-2 6M7 20l2.5-7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  zoomIn: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M11 8v6M8 11h6',
  zoomOut: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M8 11h6',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V12M11 11V4.5a1.5 1.5 0 013 0V12M14 11.5V6a1.5 1.5 0 013 0v8c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 012.5-1.6L8 14',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
