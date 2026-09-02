'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/theme-provider';

export default function ThemeToggle() {
  const { theme, toggleTheme, ready } = useTheme();

  if (!ready) {
    return null;
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-[24px] w-[50px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        theme === 'dark' ? 'bg-[#090909]/50' : 'bg-[#e5e5e5]'
      }`}
      aria-label="Toggle theme"
    >
      <span className="sr-only">Use setting</span>
      <span
        className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        <span
          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in ${
            theme === 'dark' ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'
          }`}
          aria-hidden="true"
        >
          <Sun className="h-3 w-3 text-orange-500" />
        </span>
        <span
          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in ${
            theme === 'dark' ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'
          }`}
          aria-hidden="true"
        >
          <Moon className="h-3 w-3 text-slate-800" />
        </span>
      </span>
    </button>
  );
}
