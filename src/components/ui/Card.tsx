import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ glow = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        'bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4',
        glow ? 'shadow-lg shadow-violet-900/20' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
