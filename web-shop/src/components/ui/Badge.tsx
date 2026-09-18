import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'gray';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  style
}) => {
  return (
    <span className={`badge badge-${variant}`} style={style}>
      {children}
    </span>
  );
};
