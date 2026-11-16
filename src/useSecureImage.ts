import { useState, useEffect, createElement } from 'react';
import { fetchPrivateBlob } from './api/client';

export function useSecureImage(src?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setUrl(null);
      return;
    }

    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/images/')) {
      setUrl(src);
      return;
    }

    const match = src.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const uploadId = match ? match[1] : null;

    let active = true;
    let createdUrl: string | null = null;

    if (uploadId) {
      fetchPrivateBlob(uploadId)
        .then((blob) => {
          if (!active) return;
          createdUrl = URL.createObjectURL(blob);
          setUrl(createdUrl);
        })
        .catch(() => {
          if (!active) return;
          setUrl(src);
        });
    } else {
      setUrl(src);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  return url;
}

export function SecureImage({
  src,
  alt = '',
  className = '',
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  const resolved = useSecureImage(src);
  if (!resolved) return null;
  return createElement('img', { src: resolved, alt, className });
}
