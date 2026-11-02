import { useEffect, type RefObject } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 0 → 1 while `from` → `to` (eased), for mapping one scroll range onto one animation. */
export const segment = (p: number, from: number, to: number) => {
  const t = clamp01((p - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/**
 * Tracks how far the user has scrolled through a tall "pinned" section (0 at its top,
 * 1 when its bottom reaches the viewport bottom). `onFrame` runs at most once per
 * animation frame and should write CSS variables directly instead of setting state.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onFrame: (progress: number) => void,
  /** 'pinned': through a tall section. 'enter': 0 when its top touches the viewport bottom, 1 when it reaches the top. */
  mode: 'pinned' | 'enter' = 'pinned',
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (prefersReducedMotion()) {
      onFrame(1);
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      if (mode === 'enter') {
        onFrame(clamp01(1 - rect.top / window.innerHeight));
        return;
      }
      const travel = rect.height - window.innerHeight;
      onFrame(travel > 0 ? clamp01(-rect.top / travel) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
    // onFrame is intentionally read once per mount; callers keep it stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, mode]);
}

/**
 * Apple-style "staggered start": every [data-reveal] inside `root` fades up once it enters the
 * viewport. Siblings can stagger with style={{ '--i': index }}.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const targets = container.querySelectorAll<HTMLElement>('[data-reveal]');
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [root]);
}
