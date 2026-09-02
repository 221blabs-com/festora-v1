import React, { useEffect, useRef, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean; // When true, ignores size prop and uses width/height or className
}

const glowColorMap = {
  blue: {
    base: 220,
    spread: 200,
    rgb: '59, 130, 246', // blue-500
    shadow: 'rgba(59, 130, 246, 0.3)'
  },
  purple: {
    base: 280,
    spread: 300,
    rgb: '147, 51, 234', // purple-600
    shadow: 'rgba(147, 51, 234, 0.3)'
  },
  green: {
    base: 120,
    spread: 200,
    rgb: '34, 197, 94', // green-500
    shadow: 'rgba(34, 197, 94, 0.3)'
  },
  red: {
    base: 0,
    spread: 200,
    rgb: '239, 68, 68', // red-500
    shadow: 'rgba(239, 68, 68, 0.3)'
  },
  orange: {
    base: 30,
    spread: 200,
    rgb: '249, 115, 22', // orange-500
    shadow: 'rgba(249, 115, 22, 0.3)'
  }
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96'
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

  useEffect(() => {
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

    return () => {
      document.removeEventListener('pointermove', syncPointer);
    };
  }, []);

  const colorConfig = glowColorMap[glowColor];

  // Determine size classes
  const sizeClasses = customSize ? '' : sizeMap[size];

  // Custom size styles
  const customStyles: React.CSSProperties = {};
  if (customSize && width) customStyles.width = width;
  if (customSize && height) customStyles.height = height;

  return (
    <div
      ref={cardRef}
      className={`
        glow-card group relative overflow-hidden rounded-2xl backdrop-blur-xl
        bg-white/80 dark:bg-black/20 
        border-2 border-gray-300/50 dark:border-white/10 
        shadow-xl dark:shadow-none
        transition-all duration-300
        hover:border-gray-400/70 dark:hover:border-white/20
        hover:shadow-2xl dark:hover:shadow-none
        ${sizeClasses}
        ${className}
      `}
      style={{
        ...customStyles,
        '--glow-hue': colorConfig.base,
        '--glow-spread': colorConfig.spread,
        '--glow-rgb': colorConfig.rgb,
        '--glow-shadow': colorConfig.shadow,
      } as React.CSSProperties}
    >
      {/* Intense Animated Glow Effect on Hover */}
      <div
        className="glow-effect absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at var(--x, 0)px var(--y, 0)px, ${colorConfig.shadow}, transparent 30%)`,
        }}
      />

      {/* Intense Border Glow on Hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, 
            rgba(${colorConfig.rgb}, 0.3) 0%, 
            rgba(${colorConfig.rgb}, 0.15) 25%, 
            transparent 50%, 
            rgba(${colorConfig.rgb}, 0.15) 75%, 
            rgba(${colorConfig.rgb}, 0.3) 100%)`,
          boxShadow: `0 0 40px rgba(${colorConfig.rgb}, 0.6), 0 0 80px rgba(${colorConfig.rgb}, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
        }}
      />

      {/* Content - Direct children without extra wrapper */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>

      {/* Subtle Inner Shadow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 -1px 0 rgba(255, 255, 255, 0.1)',
        }}
      />
    </div>
  );
};

export { GlowCard };
