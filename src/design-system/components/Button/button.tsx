import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    const sizeStyles = {
      xs: 'text-xs px-2.5 py-1 rounded-lg gap-1 min-h-[28px]',
      sm: 'text-xs sm:text-sm px-3 py-1.5 rounded-xl gap-1.5 min-h-[36px]',
      md: 'text-sm sm:text-base px-4 py-2 rounded-xl gap-2 min-h-[44px]',
      lg: 'text-base sm:text-lg px-6 py-3 rounded-2xl gap-2.5 min-h-[50px]',
    };

    const variantStyles = {
      primary:
        'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-sm shadow-sky-600/20 border border-sky-600/20',
      secondary:
        'bg-surface-card text-text-primary border border-border-default hover:bg-surface-hover hover:border-border-strong shadow-xs',
      outline:
        'bg-transparent text-primary border-2 border-primary/30 hover:bg-primary-soft hover:border-primary',
      subtle:
        'bg-primary-soft text-primary hover:bg-primary-soft/80 border border-primary/20',
      danger:
        'bg-danger text-white hover:bg-danger-hover active:bg-rose-700 shadow-sm shadow-rose-600/20 border border-rose-600/20',
      ghost:
        'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
      success:
        'bg-success text-white hover:bg-success-hover active:bg-emerald-700 shadow-sm shadow-emerald-600/20 border border-emerald-600/20',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
