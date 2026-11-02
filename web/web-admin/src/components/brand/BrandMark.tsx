/** Anchor Box mark (vector version of app/assets/logos/anchor_mark_*.png). Inherits `color`. */
export function BrandMark({ size = 22, title }: { size?: number; title?: string }) {
  return (
    <svg
      className="ab-brand-mark"
      viewBox="0 0 48 66"
      width={(size * 48) / 66}
      height={size}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path fillRule="evenodd" d="M24 2a7 7 0 1 1 0 14a7 7 0 0 1 0-14zm0 3.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 0 0 0-6.8z" />
      <rect x="11" y="18" width="26" height="5" rx="2.5" />
      <rect x="21.5" y="15" width="5" height="42" rx="2" />
      <path d="M7 42 Q10 56 24 60 Q38 56 41 42" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M1.5 45 L8 32.5 L14 45.5 Z" />
      <path d="M46.5 45 L40 32.5 L34 45.5 Z" />
      <path d="M18.5 58 L24 64.5 L29.5 58 Z" />
    </svg>
  );
}

export function BrandLogo({ size = 22 }: { size?: number }) {
  return (
    <span className="ab-brand-logo">
      <BrandMark size={size} />
      <span className="ab-brand-wordmark">Anchor Box</span>
    </span>
  );
}
