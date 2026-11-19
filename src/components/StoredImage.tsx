import { useEffect, useState } from 'react';
import { fileUrl } from '../services/db';

/** An image kept in IndexedDB, shown through a cached object URL. */
export function StoredImage({
  fileId,
  alt = '',
  className,
  style,
}: {
  fileId: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void fileUrl(fileId).then((url) => live && setSrc(url));
    return () => {
      live = false;
    };
  }, [fileId]);
  if (!src)
    return <div className={`${className ?? ''} stored-image--loading`} style={style} aria-hidden />;
  return <img src={src} alt={alt} className={className} style={style} draggable={false} />;
}
