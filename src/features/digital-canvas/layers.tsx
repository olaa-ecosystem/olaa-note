import { memo } from 'react';
import { StoredImage } from '../../components/StoredImage';
import { HIGHLIGHT_OPACITY, strokePath } from '../inking-tools/strokePath';
import { paperCss } from '../page-management/paper';
import { pageSize, type Page } from '../page-management/types';
import type { FileItem, ImageItem, Item, Stroke, TextBox } from './items';

const pathCache = new WeakMap<Stroke, string>();
function cachedPath(stroke: Stroke): string {
  let d = pathCache.get(stroke);
  if (d === undefined) {
    d = strokePath(stroke);
    pathCache.set(stroke, d);
  }
  return d;
}

/** Paper pattern, or the imported PDF page image. */
export function Paper({ page }: { page: Page }) {
  return (
    <div
      className="paper__bg"
      style={page.background.kind === 'template' ? paperCss(page.template) : undefined}
    >
      {page.background.kind === 'image' && (
        <StoredImage fileId={page.background.fileId} className="paper__pdf" />
      )}
    </div>
  );
}

/** All strokes as SVG paths, drawn above text and images (annotations). */
export const InkLayer = memo(function InkLayer({
  items,
  width,
  height,
}: {
  items: Item[];
  width: number;
  height: number;
}) {
  return (
    <svg
      className="ink"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
    >
      {items.map((it) =>
        it.kind === 'stroke' ? (
          <path
            key={it.id}
            d={cachedPath(it)}
            fill={it.color}
            opacity={it.tool === 'highlighter' ? HIGHLIGHT_OPACITY : 1}
            className={it.tool === 'highlighter' ? 'ink--highlight' : undefined}
          />
        ) : null,
      )}
    </svg>
  );
});

export function ImageView({ item }: { item: ImageItem }) {
  return (
    <StoredImage
      fileId={item.fileId}
      className="item-image"
      style={{ width: item.width, height: item.height }}
    />
  );
}

export function FileCard({ item }: { item: FileItem }) {
  return (
    <div className="item-file">
      <span aria-hidden>📎</span>
      <span className="item-file__name">{item.name}</span>
    </div>
  );
}

export function StaticText({ item }: { item: TextBox }) {
  return <div className="item-text" dangerouslySetInnerHTML={{ __html: item.html }} />;
}

export function itemBox(item: Exclude<Item, Stroke>): React.CSSProperties {
  return { left: item.x, top: item.y, width: item.kind === 'file' ? 240 : item.width };
}

/** Non-interactive page, used for thumbnails. */
export function PageView({ page, scale }: { page: Page; scale: number }) {
  const { width, height } = pageSize(page);
  return (
    <div className="paper-frame" style={{ width: width * scale, height: height * scale }}>
      <div className="paper" style={{ width, height, transform: `scale(${scale})` }}>
        <Paper page={page} />
        {page.items.map((it) =>
          it.kind === 'stroke' ? null : (
            <div key={it.id} className="item" style={itemBox(it)}>
              {it.kind === 'image' ? (
                <ImageView item={it} />
              ) : it.kind === 'file' ? (
                <FileCard item={it} />
              ) : (
                <StaticText item={it} />
              )}
            </div>
          ),
        )}
        <InkLayer items={page.items} width={width} height={height} />
      </div>
    </div>
  );
}
