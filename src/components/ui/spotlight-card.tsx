import React, { useEffect, useRef, ReactNode, useSyncExternalStore } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean; // When true, ignores size prop and uses width/height or className
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
  pink: { base: 320, spread: 250 }
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96'
};

const checkTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
};

const subscribeTouchDevice = (callback: () => void) => {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = useSyncExternalStore(subscribeTouchDevice, checkTouchDevice, () => false);

  useEffect(() => {
    // Only enable mouse tracking on non-touch devices and larger screens
    if (!isTouchDevice) {
      const syncPointer = (e: PointerEvent) => {
        const { clientX: x, clientY: y } = e;

        if (cardRef.current) {
          cardRef.current.style.setProperty('--x', x.toFixed(2));
          cardRef.current.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
          cardRef.current.style.setProperty('--y', y.toFixed(2));
          cardRef.current.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
        }
      };

      document.addEventListener('pointermove', syncPointer);
      return () => document.removeEventListener('pointermove', syncPointer);
    }
  }, [isTouchDevice]);

  const { base, spread } = glowColorMap[glowColor];

  // Determine sizing
  const getSizeClasses = () => {
    if (customSize) {
      return ''; // Let className or inline styles handle sizing
    }
    return sizeMap[size];
  };

  const getInlineStyles = () => {
    const baseStyles: React.CSSProperties = {
      '--base': base as unknown as string,
      '--spread': spread as unknown as string,
      '--radius': '14',
      '--border': isTouchDevice ? '2' : '3', // Thinner borders on mobile
      '--backdrop': 'hsl(0 0% 10% / 0.8)',
      '--backup-border': 'hsl(0 0% 30% / 0.3)',
      '--size': isTouchDevice ? '100' : '200', // Smaller spotlight on mobile
      '--outer': isTouchDevice ? '0.5' : '1', // Reduced effects on mobile
      '--border-size': 'calc(var(--border, 2) * 1px)',
      '--spotlight-size': 'calc(var(--size, 150) * 1px)',
      '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
      backgroundImage: isTouchDevice
        ? `linear-gradient(135deg, hsl(var(--base) 50% 20% / 0.1), hsl(var(--base) 50% 10% / 0.05))` // Simple gradient for mobile
        : `radial-gradient(
            var(--spotlight-size) var(--spotlight-size) at
            calc(var(--x, 0) * 1px)
            calc(var(--y, 0) * 1px),
            hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)), transparent
          )`,
      backgroundColor: 'var(--backdrop, transparent)',
      backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
      backgroundPosition: '50% 50%',
      backgroundAttachment: isTouchDevice ? 'scroll' : 'fixed', // Scroll attachment for mobile performance
      border: 'var(--border-size) solid var(--backup-border)',
      position: 'relative',
      touchAction: 'pan-y',
    } as React.CSSProperties;

    // Add width and height if provided
    if (width !== undefined) {
      baseStyles.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return baseStyles;
  };

  // Simplified styles for mobile devices
  const getMobileStyles = () => {
    if (isTouchDevice) {
      return `
        [data-glow] {
          border: 2px solid hsl(${base} 50% 30% / 0.3);
          background: linear-gradient(135deg, hsl(${base} 50% 20% / 0.1), hsl(${base} 50% 10% / 0.05));
        }
        
        [data-glow]::before,
        [data-glow]::after {
          display: none; /* Disable complex effects on mobile */
        }
        
        [data-glow] [data-glow] {
          display: none; /* Disable inner glow on mobile */
        }
      `;
    }
    return '';
  };

  const beforeAfterStyles = `
    ${getMobileStyles()}
    
    [data-glow]::before,
    [data-glow]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -1);
      border: var(--border-size) solid transparent;
      border-radius: calc(var(--radius) * 1px);
      background-attachment: ${isTouchDevice ? 'scroll' : 'fixed'};
      background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat: no-repeat;
      background-position: 50% 50%;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
    }
    
    [data-glow]::before {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 50) * 1%) / var(--border-spot-opacity, ${isTouchDevice ? '0.5' : '1'})), transparent 100%
      );
      filter: brightness(${isTouchDevice ? '1.5' : '2'});
    }
    
    [data-glow]::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(0 100% 100% / var(--border-light-opacity, ${isTouchDevice ? '0.5' : '1'})), transparent 100%
      );
    }
    
    [data-glow] [data-glow] {
      position: absolute;
      inset: 0;
      will-change: ${isTouchDevice ? 'auto' : 'filter'};
      opacity: var(--outer, 1);
      border-radius: calc(var(--radius) * 1px);
      border-width: calc(var(--border-size) * ${isTouchDevice ? '10' : '20'});
      filter: blur(calc(var(--border-size) * ${isTouchDevice ? '5' : '10'}));
      background: none;
      pointer-events: none;
      border: none;
    }
    
    [data-glow] > [data-glow]::before {
      inset: ${isTouchDevice ? '-5px' : '-10px'};
      border-width: ${isTouchDevice ? '5px' : '10px'};
    }

    @media (max-width: 640px) {
      [data-glow] {
        padding: 1rem;
        gap: 0.75rem;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <div
        ref={cardRef}
        data-glow
        style={getInlineStyles()}
        className={`
          ${getSizeClasses()}
          ${!customSize ? 'aspect-[3/4]' : ''}
          rounded-xl sm:rounded-2xl
          relative 
          grid 
          grid-rows-[1fr_auto] 
          shadow-[0_0.5rem_1rem_-0.5rem_black] sm:shadow-[0_1rem_2rem_-1rem_black]
          p-3 sm:p-4 
          gap-3 sm:gap-4 
          backdrop-blur-[3px] sm:backdrop-blur-[5px]
          transition-all duration-200
          ${isTouchDevice ? 'active:scale-95' : 'hover:scale-[1.02]'}
          ${className}
        `}
      >
        {!isTouchDevice && <div data-glow></div>}
        {children}
      </div>
    </>
  );
};

export { GlowCard }
