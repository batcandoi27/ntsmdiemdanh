// ============================================================================
// SEAT LAYOUT EDITOR - CLASSROOM OBJECT NODE COMPONENT
// Hiển thị các vật thể phòng học: Bảng, Bàn GV, Cửa chính/phụ, Cửa sổ, Tủ
// ============================================================================

import React from 'react';
import { ClassroomObject, ID } from '../domain/types';
import {
  Square,
  DoorOpen,
  Maximize2,
  Tv,
  Archive,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClassroomObjectNodeProps {
  object: ClassroomObject;
  isSelected?: boolean;
  onSelect?: (id: ID) => void;
}

export const ClassroomObjectNode: React.FC<ClassroomObjectNodeProps> = ({
  object,
  isSelected = false,
  onSelect
}) => {
  const { type, name, width, height } = object;

  if (type === 'board') {
    return (
      <div
        onClick={() => onSelect && onSelect(object.id)}
        style={{ width: `${width}px`, minHeight: `${height}px` }}
        className={cn(
          "bg-slate-900 text-white rounded-2xl px-4 py-2 border-2 border-slate-700 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all",
          isSelected && "ring-4 ring-indigo-500/30 border-indigo-500"
        )}
      >
        <Square className="w-4 h-4 text-emerald-400 fill-emerald-400" />
        <span className="font-black text-xs tracking-widest text-emerald-300 uppercase">
          {name || 'BẢNG CHÍNH LỚP HỌC'}
        </span>
      </div>
    );
  }

  if (type === 'teacher_desk') {
    return (
      <div
        onClick={() => onSelect && onSelect(object.id)}
        style={{ width: `${width}px`, minHeight: `${height}px` }}
        className={cn(
          "bg-indigo-50/90 text-indigo-950 rounded-2xl p-2.5 border-2 border-indigo-400 shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-indigo-100",
          isSelected && "ring-4 ring-indigo-500/30 border-indigo-600"
        )}
      >
        <GraduationCap className="w-4 h-4 text-indigo-700" />
        <span className="font-black text-[10px] tracking-wider uppercase text-indigo-900">
          {name || 'BÀN GIÁO VIÊN'}
        </span>
      </div>
    );
  }

  if (type === 'door_main' || type === 'door_sub') {
    return (
      <div
        onClick={() => onSelect && onSelect(object.id)}
        style={{ width: `${width}px`, height: `${height}px` }}
        className={cn(
          "bg-amber-50 rounded-2xl p-2 border-2 border-dashed border-amber-500 text-amber-900 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all",
          isSelected && "ring-4 ring-amber-500/30"
        )}
      >
        <DoorOpen className="w-5 h-5 text-amber-600" />
        <span className="font-extrabold text-[8px] text-center uppercase leading-tight">
          {type === 'door_main' ? 'CỬA TRƯỚC' : 'CỬA SAU'}
        </span>
      </div>
    );
  }

  if (type === 'window') {
    return (
      <div
        onClick={() => onSelect && onSelect(object.id)}
        style={{ width: `${width}px`, height: `${height}px` }}
        className={cn(
          "bg-sky-50 rounded-xl border-2 border-sky-400 text-sky-800 flex flex-col items-center justify-center p-1 cursor-pointer transition-all",
          isSelected && "ring-4 ring-sky-500/30"
        )}
      >
        <Maximize2 className="w-4 h-4 text-sky-600" />
        <span className="font-bold text-[8px] uppercase">CỬA SỔ</span>
      </div>
    );
  }

  // Mặc định
  return (
    <div
      onClick={() => onSelect && onSelect(object.id)}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="bg-slate-100 rounded-2xl p-2 border border-slate-300 text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <Archive className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-bold">{name}</span>
    </div>
  );
};
