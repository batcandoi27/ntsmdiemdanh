import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../Button/button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-border-default/80 bg-surface-card/60 my-4',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-section border border-border-subtle flex items-center justify-center text-text-tertiary mb-4 shadow-xs">
        {icon || <Inbox className="w-8 h-8 text-text-tertiary" />}
      </div>
      <h4 className="text-base sm:text-lg font-bold text-text-primary mb-1.5">{title}</h4>
      {description && (
        <p className="text-xs sm:text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
