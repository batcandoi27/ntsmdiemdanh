"use client";

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeroomTooltipProps {
  content: string;
  title?: string;
  className?: string;
  size?: number;
}

export function HomeroomTooltip({
  content,
  title,
  className,
  size = 15
}: HomeroomTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative inline-flex items-center group", className)}>
      <button
        type="button"
        aria-label={title || "Hướng dẫn & Chú thích"}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        <HelpCircle size={size} className="shrink-0" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          {title && <div className="font-bold text-indigo-300 mb-1">{title}</div>}
          <div className="leading-relaxed text-slate-200">{content}</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
