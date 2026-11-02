import { useCallback, useRef } from 'react';
import { useScrollProgress } from './useScrollProgress';

const TEXT =
  'Anchor Box không cố làm mọi thứ. Nó làm thật tốt một việc: giữ bưu kiện của bạn an toàn, cho tới khi bạn về nhà.';
const WORDS = TEXT.split(' ');

/** Pinned paragraph whose words light up one by one as the user scrolls (Apple "text reveal"). */
export function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);

  const onFrame = useCallback((p: number) => {
    const lit = Math.round(p * 1.15 * WORDS.length);
    wordsRef.current.forEach((word, i) => word.classList.toggle('is-lit', i < lit));
  }, []);
  useScrollProgress(sectionRef, onFrame);

  return (
    <section className="ab-manifesto" ref={sectionRef} aria-label="Anchor Box">
      <div className="ab-manifesto-sticky">
        <p className="ab-manifesto-text">
          {WORDS.map((word, i) => (
            <span key={`${word}-${i}`} ref={(node) => { if (node) wordsRef.current[i] = node; }}>{word} </span>
          ))}
        </p>
      </div>
    </section>
  );
}
