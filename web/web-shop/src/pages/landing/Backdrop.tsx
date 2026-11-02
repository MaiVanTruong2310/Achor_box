import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useScrollProgress';

const POSTER = '/brand/anchor-box-porch.webp';
const VIDEO = '/videos/smartbox-delivery.mp4';

/** Video only on wide screens, with motion allowed and no data saver; otherwise the still photo. */
function canPlayVideo() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !prefersReducedMotion() && !connection?.saveData && window.matchMedia('(min-width: 768px)').matches;
}

/** Fixed "wallpaper" behind the whole landing (like Apple Home), dimmed by a gray overlay. */
export function Backdrop() {
  const [video, setVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => setVideo(canPlayVideo()), []);

  useEffect(() => {
    if (!video) return;
    const onVisibility = () => {
      const element = videoRef.current;
      if (!element) return;
      if (document.hidden) element.pause();
      else element.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [video]);

  return (
    <div className="ab-backdrop" aria-hidden="true">
      {video ? (
        <video ref={videoRef} className="ab-backdrop-media" src={VIDEO} poster={POSTER} autoPlay muted loop playsInline preload="metadata" />
      ) : (
        <img className="ab-backdrop-media" src={POSTER} alt="" decoding="async" />
      )}
    </div>
  );
}
