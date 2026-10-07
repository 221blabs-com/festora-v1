'use client';

import Link from 'next/link';
import React from 'react';

export interface GlassIconsItem {
  icon: React.ReactElement;
  color: string;
  label: string;
  href?: string;
  onClick?: () => void;
  customClass?: string;
}

export interface GlassIconsProps {
  items: GlassIconsItem[];
  className?: string;
}

const gradientMapping: Record<string, string> = {
  red: 'linear-gradient(135deg, #e51b3e, #8f0922)',
  glass: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.06))',
};

const GlassIcons: React.FC<GlassIconsProps> = ({ items, className = '' }) => {
  const getBackgroundStyle = (color: string): React.CSSProperties => ({
    background: gradientMapping[color] || color,
  });

  return (
    <div className={`flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4 ${className}`}>
      {items.map((item) => {
        const contents = (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl transition-transform duration-300 ease-out [transform:rotate(3deg)] group-hover:[transform:rotate(6deg)_translate3d(-2px,-2px,0)]"
              style={{ ...getBackgroundStyle(item.color), boxShadow: '0.5em -0.5em 0.75em rgba(0,0,0,0.2)' }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl border border-white/25 bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-xl transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
            />
            <span className="relative z-10 inline-flex items-center justify-center gap-3 px-7 text-sm font-bold uppercase tracking-[0.1em] text-[var(--fg)] drop-shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </span>
          </>
        );

        const className = `glass-action group relative isolate inline-flex h-14 min-w-[190px] items-center justify-center overflow-visible rounded-2xl border-0 bg-transparent p-0 text-left outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${item.customClass || ''}`;

        return item.href ? (
          <Link key={item.label} href={item.href} aria-label={item.label} className={className} onClick={item.onClick}>
            {contents}
          </Link>
        ) : (
          <button key={item.label} type="button" aria-label={item.label} className={className} onClick={item.onClick}>
            {contents}
          </button>
        );
      })}
    </div>
  );
};

export default GlassIcons;
