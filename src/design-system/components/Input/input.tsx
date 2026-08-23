import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs sm:text-sm font-semibold text-text-primary flex items-center justify-between select-none"
          >
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 text-text-tertiary pointer-events-none flex items-center justify-center shrink-0">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full bg-surface-card text-text-primary text-sm sm:text-base font-medium rounded-xl border border-border-default shadow-xs transition-all duration-150',
              'placeholder:text-text-disabled placeholder:font-normal',
              'hover:border-border-strong hover:bg-surface-card',
              'focus:outline-none focus:border-border-focus focus:ring-4 focus:ring-sky-500/15',
              'disabled:bg-surface-subtle disabled:text-text-disabled disabled:cursor-not-allowed disabled:border-border-subtle',
              'min-h-[44px] py-2 px-3.5',
              leftIcon ? 'pl-10' : '',
              rightIcon || error ? 'pr-10' : '',
              error ? 'border-danger focus:border-danger focus:ring-rose-500/15 bg-rose-50/20 text-danger' : '',
              className
            )}
            {...props}
          />
          {error ? (
            <div className="absolute right-3.5 text-danger pointer-events-none flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            rightIcon && (
              <div className="absolute right-3.5 text-text-tertiary flex items-center justify-center shrink-0">
                {rightIcon}
              </div>
            )
          )}
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

Input.displayName = 'Input';
