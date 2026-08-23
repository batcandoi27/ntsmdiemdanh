import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-surface-card border border-border-subtle shadow-card',
      elevated: 'bg-surface-card border border-border-subtle shadow-cardHover',
      subtle: 'bg-surface-section border border-border-subtle',
      outline: 'bg-transparent border-2 border-border-default',
      interactive:
        'bg-surface-card border border-border-subtle shadow-card hover:shadow-cardHover hover:border-border-strong transition-all duration-200 cursor-pointer active:scale-[0.99]',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-card transition-colors',
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 pb-4 border-b border-border-subtle/80 mb-4', className)} {...props} />
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg sm:text-xl font-bold tracking-tight text-text-primary', className)} {...props} />
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-xs sm:text-sm text-text-secondary', className)} {...props} />
);
CardDescription.displayName = 'CardDescription';

export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)} {...props} />
);
CardContent.displayName = 'CardContent';

export const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center pt-4 border-t border-border-subtle/80 mt-4', className)} {...props} />
);
CardFooter.displayName = 'CardFooter';

/**
 * Section Component for Tier 3 Surface within a Card
 */
export const Section = ({
  className,
  title,
  action,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title?: string; action?: React.ReactNode }) => (
  <div className={cn('bg-surface-section rounded-xl p-4 border border-border-subtle flex flex-col gap-3', className)} {...props}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-subtle/60">
        {title && <h4 className="text-sm font-bold text-text-primary">{title}</h4>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);
Section.displayName = 'Section';
