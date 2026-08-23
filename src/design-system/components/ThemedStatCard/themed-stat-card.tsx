import React from 'react';
import { cn } from '@/lib/utils';
import { getAutoTheme } from '@/design-system/tokens/auto-themes';
import { LucideIcon } from 'lucide-react';

export interface ThemedStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  label: string;
  value: string | number;
  subtext?: string | React.ReactNode;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  onClick?: () => void;
}

/**
 * ThemedStatCard - Thẻ thống kê KPI tự động áp dụng màu pastel + viền chuẩn theo bộ đếm index
 */
export const ThemedStatCard: React.FC<ThemedStatCardProps> = ({
  index = 0,
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendText,
  className,
  onClick,
  ...props
}) => {
  const theme = getAutoTheme(index);

  return (
    <div
      onClick={onClick}
      className={cn(
        theme.bg,
        theme.border,
        'rounded-3xl p-4 sm:p-5 shadow-xs transition-all duration-200 flex items-center justify-between gap-3',
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]' : '',
        className
      )}
      {...props}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <span className="text-[11px] sm:text-xs font-bold text-slate-600 block truncate">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl sm:text-3xl font-black tracking-tight', theme.titleColor)}>
            {value}
          </span>
          {trendText && (
            <span
              className={cn(
                'text-[10px] font-extrabold px-1.5 py-0.5 rounded-full',
                trend === 'up'
                  ? 'bg-emerald-100 text-emerald-800'
                  : trend === 'down'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              )}
            >
              {trendText}
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
            {subtext}
          </p>
        )}
      </div>

      {Icon && (
        <div
          className={cn(
            'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border',
            theme.numberBadge,
            theme.innerBorder
          )}
        >
          <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', theme.iconColor)} />
        </div>
      )}
    </div>
  );
};
