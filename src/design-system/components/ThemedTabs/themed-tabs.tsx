import React from 'react';
import { cn } from '@/lib/utils';
import { getThemedTabClass } from '@/design-system/tokens/auto-themes';
import { LucideIcon } from 'lucide-react';

export interface ThemedTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

export interface ThemedTabsProps {
  tabs: ThemedTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * ThemedTabs - Bộ Tabs tự động có màu nền pastel khác biệt khi inactive và kích hoạt màu đậm rực rỡ khi active theo thứ tự index
 */
export const ThemedTabs: React.FC<ThemedTabsProps> = ({
  tabs,
  activeId,
  onSelect,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto py-1 max-w-full scrollbar-none', className)}>
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId;
        const themeClass = getThemedTabClass(idx, isActive);
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={cn(
              'px-3.5 sm:px-4 py-2 rounded-2xl text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer outline-none select-none',
              themeClass
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                  isActive ? 'bg-white/25 text-white' : 'bg-black/10 text-slate-800'
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
