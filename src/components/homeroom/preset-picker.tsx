"use client";

import React, { useState } from 'react';
import { Sparkles, ChevronDown, Check } from 'lucide-react';
import { HOMEROOM_PRESETS, HomeroomPresetItem } from '@/types/homeroom-presets';
import { cn } from '@/lib/utils';

interface PresetPickerProps {
  applicableForm: 'event' | 'weekly_plan' | 'handbook' | 'intervention' | 'parent_contact';
  onSelect: (preset: HomeroomPresetItem) => void;
  className?: string;
}

export function PresetPicker({ applicableForm, onSelect, className }: PresetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const presets = HOMEROOM_PRESETS.filter(p => p.applicable_form === applicableForm);

  const handlePick = (item: HomeroomPresetItem) => {
    setSelectedId(item.id);
    onSelect(item);
    setTimeout(() => {
      setSelectedId(null);
      setIsOpen(false);
    }, 250);
  };

  if (presets.length === 0) return null;

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition-all shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span>Gợi ý tự điền mẫu ({presets.length})</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 max-h-72 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Chọn mẫu gợi ý để tự động điền:
          </div>
          {presets.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item)}
                className={cn(
                  "w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start justify-between gap-2",
                  isSelected ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {item.points_delta !== undefined && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-black",
                        item.points_delta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {item.points_delta > 0 ? `+${item.points_delta}` : item.points_delta}đ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
