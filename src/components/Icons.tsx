import type { ReactNode } from 'react';

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const PenIcon = () => (
  <Svg>
    <path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.6 18.8z" />
    <path d="M13.5 7l3.5 3.5" />
  </Svg>
);
export const HighlighterIcon = () => (
  <Svg>
    <path d="M9 15l-4 4h5l2-2" />
    <path d="M9 15l7.6-7.6a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L12 18z" />
  </Svg>
);
export const EraserIcon = () => (
  <Svg>
    <path d="M7 20h12" />
    <path d="M5.5 14.5l8.8-8.8a2 2 0 012.8 0l2.2 2.2a2 2 0 010 2.8L12 18H8.9z" />
  </Svg>
);
export const TextIcon = () => (
  <Svg>
    <path d="M5 6V4h14v2M12 4v16M9 20h6" />
  </Svg>
);
export const SelectIcon = () => (
  <Svg>
    <path d="M5 3l14 7-6 2-2 6z" />
  </Svg>
);
export const UndoIcon = () => (
  <Svg>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h10a6 6 0 010 12" transform="translate(0 -6)" />
  </Svg>
);
export const RedoIcon = () => (
  <Svg>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H10a6 6 0 000 12" transform="translate(0 -6)" />
  </Svg>
);
export const PlusIcon = () => (
  <Svg>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const BackIcon = () => (
  <Svg>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const ChevronLeftIcon = () => (
  <Svg>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const ChevronRightIcon = () => (
  <Svg>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);
export const ImageIcon = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="2" />
    <path d="M21 17l-5-5-9 8" />
  </Svg>
);
export const ClipIcon = () => (
  <Svg>
    <path d="M20 11.5l-8.2 8.2a5 5 0 01-7-7L13 4.5a3.4 3.4 0 014.8 4.8l-8.2 8.2a1.7 1.7 0 01-2.4-2.4L14.5 8" />
  </Svg>
);
export const PdfIcon = () => (
  <Svg>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
);
export const ShareIcon = () => (
  <Svg>
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </Svg>
);
export const TrashIcon = () => (
  <Svg>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
);
export const CopyIcon = () => (
  <Svg>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </Svg>
);
export const PagesIcon = () => (
  <Svg>
    <rect x="4" y="3" width="11" height="15" rx="2" />
    <path d="M9 21h9a2 2 0 002-2V8" />
  </Svg>
);
export const HandIcon = () => (
  <Svg>
    <path d="M8 13V5.5a1.5 1.5 0 013 0V11M11 10.5V4a1.5 1.5 0 013 0v6.5M14 10V5.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7h-.5a6 6 0 01-4.6-2.2L3.6 16a1.6 1.6 0 012.4-2.1L8 16" />
  </Svg>
);
