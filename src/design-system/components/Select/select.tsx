import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      leftIcon,
      containerClassName,
      id,
      disabled,
      children,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const hasValue = value !== undefined && value !== '' && value !== null;

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs sm:text-sm font-semibold text-text-primary flex items-center justify-between select-none"
          >
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 text-text-tertiary pointer-events-none flex items-center justify-center shrink-0 z-10">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            className={cn(
              'w-full bg-surface-card text-text-primary text-sm sm:text-base font-semibold rounded-xl border border-border-default shadow-xs transition-all duration-150 appearance-none cursor-pointer',
              'hover:border-border-strong hover:bg-surface-hover/50',
              'focus:outline-none focus:border-border-focus focus:ring-4 focus:ring-sky-500/15',
              'disabled:bg-surface-subtle disabled:text-text-disabled disabled:cursor-not-allowed disabled:border-border-subtle',
              'min-h-[44px] py-2 pl-3.5 pr-10',
              leftIcon ? 'pl-10' : '',
              !hasValue && placeholder ? 'text-text-secondary font-normal' : 'text-text-primary',
              error ? 'border-danger focus:border-danger focus:ring-rose-500/15 bg-rose-50/20 text-danger' : '',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-text-secondary">
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="text-text-primary bg-surface-card font-medium py-1.5"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3.5 text-text-secondary pointer-events-none flex items-center justify-center shrink-0">
            {error ? (
              <AlertCircle className="w-5 h-5 text-danger" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-secondary transition-transform duration-200" />
            )}
          </div>
        </div>
        {error ? (
          <p className="text-xs font-semibold text-danger flex items-center gap-1 mt-0.5 animate-in fade-in-50">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-text-tertiary mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
