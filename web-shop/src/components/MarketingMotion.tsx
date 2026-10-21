import { useEffect, useRef } from 'react';

// Animation is confined to public storytelling pages; checkout and account stay immediate.
export function useMarketingMotion(pathname: string) {
  useEffect(() => {
    if (!['/', '/technology', '/compare', '/app', '/how-it-works', '/about'].includes(pathname)) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const sections = [...document.querySelectorAll<HTMLElement>('main .section')];
    let observer: IntersectionObserver | undefined;
    const configure = () => {
      observer?.disconnect();
      sections.forEach(section => { section.classList.remove('motion-reveal', 'motion-visible'); });
      document.documentElement.classList.toggle('marketing-motion', !reduced.matches);
      if (reduced.matches || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('motion-visible'); observer?.unobserve(entry.target); }
      }), { threshold: 0.05 });
      sections.forEach(section => {
        // Never hide a section already on screen, or a focused target inside it.
        if (section.getBoundingClientRect().top < innerHeight) return;
        section.classList.add('motion-reveal'); observer?.observe(section);
      });
    };
    configure(); reduced.addEventListener('change', configure);
    return () => { observer?.disconnect(); reduced.removeEventListener('change', configure); document.documentElement.classList.remove('marketing-motion'); sections.forEach(section => section.classList.remove('motion-reveal', 'motion-visible')); };
  }, [pathname]);
}

export function ProductViewer({ scene = 'front', model = 'base', capacity }: { scene?: 'front' | 'lock'; model?: 'base' | 'pro'; capacity?: number }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const send = () => frame.current?.contentWindow?.postMessage({ type: 'SMARTBOX_VIEW', scene, model, capacity }, location.origin);
  useEffect(send, [scene, model, capacity]);
  useEffect(() => {
    const element = frame.current; if (!element) return;
    const observer = new IntersectionObserver(entries => element.contentWindow?.postMessage({ type: 'SMARTBOX_VISIBILITY', visible: entries[0].isIntersecting }, location.origin));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  return <iframe ref={frame} onLoad={send} className="product-viewer" src={`/viewer/index.html${location.search.includes('viewer=fallback') ? '?viewer=fallback' : ''}`} title="AnchorBox — mô hình 3D minh họa; kéo để xoay, mũi tên để đổi góc, cộng trừ để zoom, Home để đặt lại" />;
}
