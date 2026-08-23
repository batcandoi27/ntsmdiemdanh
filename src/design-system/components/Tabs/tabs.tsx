import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'segmented' | 'underline' | 'pills';
  className?: string;
}

export const Tabs = ({
  tabs,
  activeTab,
  onChange,
  variant = 'segmented',
  className,
}: TabsProps) => {
  if (variant === 'underline') {
    return (
      <div className={cn('flex items-center gap-2 border-b border-border-subtle overflow-x-auto scrollbar-hide', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all shrink-0 select-none -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-full font-bold',
                    isActive ? 'bg-primary-soft text-primary' : 'bg-surface-section text-text-tertiary'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: segmented
  return (
    <div
      className={cn(
        'inline-flex p-1 bg-surface-section border border-border-subtle rounded-2xl gap-1 overflow-x-auto scrollbar-hide max-w-full',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 shrink-0 select-none',
              isActive
                ? 'bg-surface-card text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-card/60'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded-md font-bold',
                  isActive ? 'bg-primary text-white' : 'bg-border-subtle text-text-tertiary'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
