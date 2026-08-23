import React from 'react';
import { cn } from '@/lib/utils';
import { getAutoTheme } from '@/design-system/tokens/auto-themes';
import { LucideIcon } from 'lucide-react';

export interface ThemedCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  index?: number;
  title?: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  showNumber?: boolean;
  innerContainer?: boolean;
  innerClassName?: string;
}

/**
 * ThemedCard - Khối Card tự động tạo màu nền pastel + viền phân cấp theo bộ đếm index
 */
export const ThemedCard: React.FC<ThemedCardProps> = ({
  index = 0,
  title,
  subtitle,
  badgeText,
  icon: Icon,
  actions,
  showNumber = true,
  innerContainer = true,
  innerClassName,
  className,
  children,
  ...props
}) => {
  const theme = getAutoTheme(index);

  return (
    <div
      className={cn(
        theme.bg,
        theme.border,
        'rounded-3xl p-4 sm:p-5 shadow-xs transition-all space-y-3.5 flex flex-col justify-between',
        className
      )}
      {...props}
    >
      {/* Header Bar */}
      {(title || badgeText || Icon || showNumber || actions) && (
        <div className="flex items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            {showNumber && (
              <div
                className={cn(
                  'w-7 h-7 rounded-xl text-xs flex items-center justify-center shrink-0 shadow-2xs',
                  theme.numberBadge
                )}
              >
                {index + 1}
              </div>
            )}

            {badgeText && (
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-2xs truncate',
                  theme.pillBadge
                )}
              >
                {Icon && <Icon className={cn('w-3.5 h-3.5 shrink-0', theme.iconColor)} />}
                <span className="truncate">{badgeText}</span>
              </div>
            )}

            {title && !badgeText && (
              <div className="min-w-0">
                <h3 className={cn('text-sm sm:text-base font-black tracking-tight truncate flex items-center gap-2', theme.titleColor)}>
                  {Icon && <Icon className={cn('w-4 h-4 shrink-0', theme.iconColor)} />}
                  <span>{title}</span>
                </h3>
                {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
              </div>
            )}
          </div>

          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Main Content Area */}
      {innerContainer ? (
        <div
          className={cn(
            theme.innerBg,
            theme.innerBorder,
            'rounded-2xl p-3.5 sm:p-4 border shadow-2xs space-y-3 flex-1',
            innerClassName
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
};
