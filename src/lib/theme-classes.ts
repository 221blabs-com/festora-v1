import { useTheme } from '@/contexts/theme-provider';

/**
 * SSR-safe theme class utility that prevents hydration mismatches
 * Returns consistent classes during SSR and initial client render
 */
export function useThemeClasses() {
  const { mounted } = useTheme();

  const getThemeClasses = (lightClass: string, darkClass: string = '') => {
    // During SSR and initial client render, use only the light class to prevent hydration mismatch
    if (!mounted) {
      return lightClass;
    }

    // After hydration, use proper theme-aware classes
    return darkClass ? `${lightClass} ${darkClass}` : lightClass;
  };

  return { getThemeClasses, mounted };
}

/**
 * Common theme-aware text color classes
 */
export const themeTextClasses = {
  primary: 'text-gray-900 dark:text-white',
  secondary: 'text-gray-700 dark:text-gray-300',
  muted: 'text-gray-600 dark:text-gray-400',
  accent: 'text-gray-800 dark:text-gray-200',
  disabled: 'text-gray-500 dark:text-gray-500',
};

/**
 * Common theme-aware background classes
 */
export const themeBgClasses = {
  card: 'bg-white/10 dark:bg-black/20',
  surface: 'bg-gray-50 dark:bg-gray-900',
  elevated: 'bg-white dark:bg-gray-800',
};

/**
 * Common theme-aware border classes
 */
export const themeBorderClasses = {
  subtle: 'border-gray-200 dark:border-white/10',
  normal: 'border-gray-300 dark:border-white/20',
  strong: 'border-gray-400 dark:border-white/30',
};
