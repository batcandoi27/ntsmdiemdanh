// ============================================================================
// SEAT LAYOUT EDITOR - VALIDATION BAR COMPONENT
// Thanh trạng thái thống kê sĩ số & cảnh báo thời gian thực
// ============================================================================

import React from 'react';
import { LayoutValidationResult } from '../domain/types';
import { Users, CheckCircle2, AlertTriangle, Lock, Armchair } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ValidationBarProps {
  validation: LayoutValidationResult;
}

export const ValidationBar: React.FC<ValidationBarProps> = ({ validation }) => {
  const {
    totalSeats,
    occupiedSeats,
    emptySeats,
    lockedSeats,
    totalStudents,
    assignedStudentsCount,
    unassignedStudentsCount,
    warnings,
    errors
  } = validation;

  const hasWarnings = warnings.length > 0 || errors.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* 1. Các chỉ số thống kê */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Sĩ số */}
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>Sĩ số:</span>
          <span className="font-black text-slate-900">{totalStudents} HS</span>
        </div>

        {/* Tổng ghế */}
        <div className="flex items-center gap-1.5 font-bold text-slate-700 border-l border-slate-200 pl-3">
          <Armchair className="w-3.5 h-3.5 text-slate-500" />
          <span>Sức chứa:</span>
          <span className="font-black text-slate-900">{totalSeats} ghế</span>
        </div>

        {/* Đã xếp */}
        <div className="flex items-center gap-1.5 font-bold text-slate-700 border-l border-slate-200 pl-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Đã xếp:</span>
          <span className="font-black text-emerald-600">{assignedStudentsCount} HS</span>
        </div>

        {/* Chưa xếp */}
        <div className="flex items-center gap-1.5 font-bold text-slate-700 border-l border-slate-200 pl-3">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Chưa xếp:</span>
          <span className={cn("font-black", unassignedStudentsCount > 0 ? "text-amber-600" : "text-slate-900")}>
            {unassignedStudentsCount} HS
          </span>
        </div>

        {/* Đã khóa */}
        {lockedSeats > 0 && (
          <div className="flex items-center gap-1.5 font-bold text-slate-700 border-l border-slate-200 pl-3">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Vị trí khóa:</span>
            <span className="font-black text-amber-700">{lockedSeats}</span>
          </div>
        )}
      </div>

      {/* 2. Cảnh báo thời gian thực */}
      {hasWarnings && (
        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/80 font-bold animate-in fade-in">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-md">
            {errors[0] || warnings[0]}
          </span>
        </div>
      )}
    </div>
  );
};
