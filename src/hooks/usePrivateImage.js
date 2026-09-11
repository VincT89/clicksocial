import { useEffect, useState } from 'react';
import { acquireImage, isNative } from '@/lib/mobile';

export default function usePrivateImage(src) {
  const [image, setImage] = useState({ source: null, url: '', error: '' });
  useEffect(() => {
    if (!isNative || !src) return;
    let active = true;
    let release = () => {};
    acquireImage(src).then(result => {
      release = result.release;
      if (active) setImage({ source: src, url: result.url, error: '' });
      else release();
    }).catch(error => { if (active) setImage({ source: src, url: '', error: error.message }); });
    return () => { active = false; release(); };
  }, [src]);
  return !isNative ? { url: src, error: '' } : image.source === src ? image : { url: '', error: '' };
}
