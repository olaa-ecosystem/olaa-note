import { useEffect, useRef } from 'react';
import type { Page, PaperStyle } from '../../types/note';
import { renderPage } from './pageRenderer';

interface Props {
  page: Page;
  paper: PaperStyle;
  width: number;
  className?: string;
}

/** Static, low-resolution render of a page. Re-renders when the page object changes. */
export function PageThumbnail({ page, paper, width, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const handle = window.setTimeout(() => {
      void renderPage(canvas, page, paper, (width / 820) * dpr).then(() => {
        const target = ref.current;
        if (cancelled || !target) return;
        target.width = canvas.width;
        target.height = canvas.height;
        target.getContext('2d')?.drawImage(canvas, 0, 0);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [page, paper, width]);

  return <canvas ref={ref} className={className} style={{ width, aspectRatio: '820 / 1160' }} aria-hidden />;
}
