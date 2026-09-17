import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showDots?: boolean;
}

export function Spinner({ className = '', inline = false }: SpinnerProps & { inline?: boolean }) {
  if (inline) {
    return (
      <div className={`flex items-center justify-center gap-1 bg-transparent !m-0 !p-0 ${className}`}>
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[4rem] ${className}`}>
      <div className="flex gap-2.5">
        <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_8px_var(--primary)]"></div>
        <div className="w-2.5 h-2.5 bg-[var(--gold)] rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_10px_var(--gold)]"></div>
        <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full animate-bounce shadow-[0_0_8px_var(--primary)]"></div>
      </div>
    </div>
  );
}
