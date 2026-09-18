import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, Sparkles, CheckCircle2 } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeroHeaderProps {
  badge?: string;
  badgeIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  highlights?: string[];
  align?: 'left' | 'center';
  extraContent?: React.ReactNode;
}

export const PageHeroHeader: React.FC<PageHeroHeaderProps> = ({
  badge,
  badgeIcon = <Sparkles size={13} />,
  title,
  subtitle,
  breadcrumbs = [{ label: 'Trang chủ', to: '/' }],
  highlights,
  align = 'center',
  extraContent
}) => {
  const isCentered = align === 'center';

  return (
    <div className={`page-hero-banner ${isCentered ? 'hero-center' : 'hero-left'}`}>
      <div className="hero-ambient-glow" />
      <div className="hero-grid-pattern" />

      <div className="container hero-banner-container">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="hero-glass-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-home-link" title="Trang chủ">
              <Home size={13} />
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={idx} className="breadcrumb-segment">
                  <ChevronRight size={12} className="breadcrumb-arrow" />
                  {crumb.to && !isLast ? (
                    <Link to={crumb.to} className="breadcrumb-link">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="breadcrumb-current">{crumb.label}</span>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {/* Badge Pill */}
        {badge && (
          <div className="hero-tech-badge">
            <span className="tech-badge-icon">{badgeIcon}</span>
            <span className="tech-badge-text">{badge}</span>
          </div>
        )}

        {/* Main Title */}
        <h1 className="hero-banner-title">{title}</h1>

        {/* Subtitle */}
        {subtitle && <p className="hero-banner-subtitle">{subtitle}</p>}

        {/* Key Feature Chips / Highlights */}
        {highlights && highlights.length > 0 && (
          <div className="hero-highlights-row">
            {highlights.map((text, idx) => (
              <div key={idx} className="hero-highlight-chip">
                <CheckCircle2 size={14} className="highlight-check-icon" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Extra Content (e.g. Search, Quick Filters) */}
        {extraContent && <div className="hero-banner-extra">{extraContent}</div>}
      </div>
    </div>
  );
};
