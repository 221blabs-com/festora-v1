'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { GoArrowUpRight } from 'react-icons/go';

type CardNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
};

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
};

export interface CardNavProps {
  logo: string;
  logoAlt?: string;
  logoText?: string;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  headerActions?: React.ReactNode;
}

const CardNav: React.FC<CardNavProps> = ({
  logo,
  logoAlt = 'Logo',
  logoText,
  items,
  className = '',
  ease = 'power3.out',
  baseColor = 'color-mix(in srgb, var(--bg) 76%, transparent)',
  menuColor = 'var(--fg)',
  buttonBgColor = 'var(--primary)',
  buttonTextColor = '#fff',
  headerActions,
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLNavElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = () => {
    const navElement = navRef.current;
    if (!navElement) return 260;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return 260;

    const contentElement = navElement.querySelector('.card-nav-content') as HTMLElement | null;
    if (!contentElement) return 260;

    const previousStyles = {
      visibility: contentElement.style.visibility,
      pointerEvents: contentElement.style.pointerEvents,
      position: contentElement.style.position,
      height: contentElement.style.height,
      paddingTop: contentElement.style.paddingTop,
    };

    contentElement.style.visibility = 'visible';
    contentElement.style.pointerEvents = 'auto';
    contentElement.style.position = 'static';
    contentElement.style.height = 'auto';
    contentElement.style.paddingTop = '8px';
    contentElement.offsetHeight;
    const contentHeight = contentElement.scrollHeight;

    contentElement.style.visibility = previousStyles.visibility;
    contentElement.style.pointerEvents = previousStyles.pointerEvents;
    contentElement.style.position = previousStyles.position;
    contentElement.style.height = previousStyles.height;
    contentElement.style.paddingTop = previousStyles.paddingTop;

    return 60 + contentHeight + 16;
  };

  const createTimeline = () => {
    const navElement = navRef.current;
    if (!navElement) return null;

    gsap.set(navElement, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });

    const timeline = gsap.timeline({ paused: true });
    timeline.to(navElement, { height: calculateHeight, duration: 0.4, ease });
    timeline.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');
    return timeline;
  };

  useLayoutEffect(() => {
    const timeline = createTimeline();
    timelineRef.current = timeline;

    return () => {
      timeline?.kill();
      timelineRef.current = null;
    };
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!timelineRef.current) return;

      timelineRef.current.kill();
      const nextTimeline = createTimeline();
      if (!nextTimeline) return;

      if (isExpanded) nextTimeline.progress(1);
      timelineRef.current = nextTimeline;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  const toggleMenu = () => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      timeline.play(0);
      return;
    }

    setIsHamburgerOpen(false);
    timeline.eventCallback('onReverseComplete', () => setIsExpanded(false));
    timeline.reverse();
  };

  const setCardRef = (index: number) => (element: HTMLDivElement | null) => {
    if (element) cardsRef.current[index] = element;
  };

  return (
    <div className={`card-nav-container fixed left-1/2 top-3 z-[99] w-[calc(100%-1rem)] max-w-[1880px] -translate-x-1/2 ${className}`}>
      <nav
        ref={navRef}
        className={`nav-glass-shell card-nav relative block h-[60px] overflow-hidden rounded-xl border border-[var(--border-subtle)] p-0 shadow-[0_10px_38px_rgba(0,0,0,0.28)] backdrop-blur-2xl will-change-[height] ${isExpanded ? 'open' : ''}`}
        style={{ backgroundColor: baseColor }}
        aria-label="Main navigation"
      >
        <div className="card-nav-top absolute inset-x-0 top-0 z-[2] flex h-[60px] items-center justify-between p-2 pl-[1.1rem]">
          <button
            type="button"
            className={`hamburger-menu group order-3 flex h-full cursor-pointer flex-col items-center justify-center gap-[6px] border-0 bg-transparent p-2 text-[var(--fg)] md:order-none ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            aria-expanded={isExpanded}
            style={{ color: menuColor }}
          >
            <span className={`hamburger-line h-[2px] w-[30px] origin-center bg-current transition-transform duration-300 ${isHamburgerOpen ? 'translate-y-[4px] rotate-45' : ''}`} />
            <span className={`hamburger-line h-[2px] w-[30px] origin-center bg-current transition-transform duration-300 ${isHamburgerOpen ? '-translate-y-[4px] -rotate-45' : ''}`} />
          </button>

          <Link
            href="/"
            aria-label="Festora home"
            className="logo-container order-1 flex items-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:order-none"
            onClick={() => isExpanded && toggleMenu()}
          >
            <Image src={logo} alt={logoAlt} width={36} height={36} className="logo h-7 w-auto object-contain" priority />
            {logoText && <span className="ml-2 font-[family-name:var(--font-marcellus)] text-lg font-bold uppercase tracking-[0.12em] text-[var(--primary)]">{logoText}</span>}
          </Link>

          {headerActions ? (
            <div className="card-nav-actions order-2 flex items-center gap-2 md:order-none">{headerActions}</div>
          ) : (
            <button
              type="button"
              className="card-nav-cta-button hidden h-full cursor-pointer items-center rounded-lg border-0 px-4 font-medium transition-colors duration-300 md:inline-flex"
              style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
            >
              Get Started
            </button>
          )}
        </div>

        <div
          className={`card-nav-content absolute bottom-0 left-0 right-0 top-[60px] z-[1] flex flex-col items-stretch justify-start gap-2 p-2 ${
            isExpanded ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
          } md:flex-row md:items-end md:gap-3`}
          aria-hidden={!isExpanded}
        >
          {items.slice(0, 3).map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              ref={setCardRef(index)}
              className="nav-card relative flex h-auto min-h-[60px] min-w-0 flex-[1_1_auto] select-none flex-col gap-2 rounded-lg p-[12px_16px] md:h-full md:min-h-0 md:flex-[1_1_0%]"
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label text-lg font-medium tracking-[-0.5px] md:text-[22px]">{item.label}</div>
              <div className="nav-card-links mt-auto flex flex-col gap-1">
                {item.links.map((link) => (
                  <Link
                    key={`${item.label}-${link.href}`}
                    className="nav-card-link inline-flex items-center gap-[6px] text-[15px] no-underline transition-opacity duration-300 hover:opacity-75 md:text-base"
                    href={link.href}
                    aria-label={link.ariaLabel}
                    onClick={() => isExpanded && toggleMenu()}
                  >
                    <GoArrowUpRight className="nav-card-link-icon shrink-0" aria-hidden="true" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
