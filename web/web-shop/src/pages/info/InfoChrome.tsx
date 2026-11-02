import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useReveal } from '../landing/useScrollProgress';
import '../landing/landing.css';
import './info.css';

export function InfoPage({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);
  return <div className="ab-landing ab-info" ref={rootRef}>{children}</div>;
}

export interface SubNavLink { id: string; label: string }

export function SubNav({ title, links, action }: { title: string; links: SubNavLink[]; action?: ReactNode }) {
  const [current, setCurrent] = useState('');

  useEffect(() => {
    const sections = links.map(({ id }) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!sections.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: '-120px 0px -55% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [links]);

  return (
    <div className="ab-subnav">
      <div className="ab-container ab-subnav-inner">
        <strong>{title}</strong>
        <nav aria-label={`Mục trong trang ${title}`}>
          {links.map(({ id, label }) => (
            <a key={id} href={`#${id}`} className={current === id ? 'is-current' : undefined} aria-current={current === id ? 'location' : undefined}>{label}</a>
          ))}
        </nav>
        {action}
      </div>
    </div>
  );
}

export function PageHero({ eyebrow, title, lead, crumb, children }: { eyebrow: string; title: ReactNode; lead: ReactNode; crumb: string; children?: ReactNode }) {
  return (
    <header className="ab-page-hero">
      <div className="ab-container">
        <nav className="ab-breadcrumb" aria-label="Đường dẫn" data-reveal><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">{crumb}</span></nav>
        <p className="ab-eyebrow" data-reveal>{eyebrow}</p>
        <h1 className="ab-hero-title" data-reveal>{title}</h1>
        <p className="ab-hero-sub" data-reveal>{lead}</p>
        {children}
      </div>
    </header>
  );
}

export function CtaBand({ title, body, primary, secondary }: { title: string; body: string; primary: { to: string; label: string }; secondary?: { to: string; label: string } }) {
  return (
    <div className="ab-container">
      <div className="ab-cta-band" data-reveal>
        <div>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
        <div className="ab-cta-actions">
          <Link to={primary.to} className="ab-btn ab-btn-primary">{primary.label}</Link>
          {secondary && <Link to={secondary.to} className="ab-btn-link">{secondary.label} <ChevronRight size={16} aria-hidden /></Link>}
        </div>
      </div>
    </div>
  );
}
