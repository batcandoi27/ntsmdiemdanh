// ============================================================================
// SEAT LAYOUT EDITOR - SEAT NODE COMPONENT
// Thiết kế tối ưu: Icon giới tính ở giữa trên, tên học sinh 2 từ to rõ ở giữa, chức vụ ở dưới
// ============================================================================

import React, { useState, useMemo } from 'react';
import { SeatDef, SeatAssignment, ID, StudentRole, SeatSpecialType, EditorStudent } from '../domain/types';
import { DraggedEntity } from '../hooks/useSeatLayoutEditor';
import { SeatContextMenu, ROLE_OPTIONS, COLOR_OPTIONS } from './seat-context-menu';
import { formatOptimalStudentName, buildTwoWordNameCountMap } from '../domain/name-formatter';
import { Lock, Star, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SeatNodeProps {
  seat: SeatDef;
  assignment?: SeatAssignment;
  students?: EditorStudent[];
  assignedStudentMap?: Map<string, { seatId: string; locked?: boolean }>;
  isSelected?: boolean;
  isHovered?: boolean;
  draggedEntity?: DraggedEntity;
  viewMode?: 'edit' | 'view' | 'presentation';
  onSelect?: (seatId: ID) => void;
  onAssignStudent?: (student: EditorStudent, seatId: ID) => void;
  onSwapSeats?: (sourceSeatId: ID, targetSeatId: ID) => void;
  onUnassign?: (seatId: ID) => void;
  onToggleLock?: (seatId: ID) => void;
  onToggleSpecial?: (seatId: ID, isSpecial: boolean, type?: SeatSpecialType, note?: string) => void;
  onSetRole?: (seatId: ID, role: StudentRole) => void;
  onSetColor?: (seatId: ID, color?: string) => void;
  onDragStart?: (seatId: ID, studentName?: string) => void;
  onDragOver?: (seatId: ID) => void;
  onDragLeave?: () => void;
  onDrop?: (seatId: ID) => void;
}

export const SeatNode: React.FC<SeatNodeProps> = ({
  seat,
  assignment,
  students = [],
  assignedStudentMap = new Map(),
  isSelected = false,
  isHovered = false,
  draggedEntity,
  viewMode = 'edit',
  onSelect,
  onAssignStudent,
  onUnassign,
  onToggleLock,
  onToggleSpecial,
  onSetRole,
  onSetColor,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isOccupied = !!assignment;
  const isLocked = assignment?.locked || false;
  const isSpecial = seat.isSpecial || false;

  // Giới tính
  const isFemale = assignment?.gender === 'female' || assignment?.gender === 'Nữ';

  // Icon chức vụ cán sự
  const roleInfo = assignment?.role ? ROLE_OPTIONS.find(r => r.role === assignment.role) : null;
  const showRole = roleInfo && roleInfo.role !== 'none';

  // Tùy chỉnh màu ghế
  const customColorDef = assignment?.customColor ? COLOR_OPTIONS.find(c => c.id === assignment.customColor) : null;

  // Bản đồ đếm tên 2 từ trong lớp để phát hiện trùng lặp
  const twoWordMap = useMemo(() => {
    return buildTwoWordNameCountMap(students.map(s => s.fullName));
  }, [students]);

  // Tên học sinh 2 từ to rõ (hoặc viết tắt họ đệm nếu trùng tên)
  const optimalDisplayName = useMemo(() => {
    if (!assignment?.studentName) return '';
    return formatOptimalStudentName(assignment.studentName, twoWordMap);
  }, [assignment?.studentName, twoWordMap]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (viewMode !== 'edit') return;
    e.dataTransfer.setData('text/plain', seat.id);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) {
      onDragStart(seat.id, assignment?.studentName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (viewMode !== 'edit') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (onDragOver) onDragOver(seat.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (viewMode !== 'edit') return;
    e.preventDefault();
    if (onDrop) onDrop(seat.id);
  };

  // Click vào ghế: Chọn ghế và mở Context Submenu
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) onSelect(seat.id);
    if (viewMode === 'edit') {
      setIsMenuOpen(prev => !prev);
    }
  };

  // Trạng thái hover khi kéo thả
  const isDragTarget = isHovered && draggedEntity;
  const isSwapTarget = isDragTarget && draggedEntity?.type === 'seat' && draggedEntity.sourceSeatId !== seat.id;

  return (
    <div className="relative flex-1 min-w-0">
      <div
        onClick={handleClick}
        draggable={viewMode === 'edit' && isOccupied}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative group flex flex-col justify-between items-center p-2 rounded-2xl border-2 transition-all duration-150 cursor-pointer select-none text-center min-h-[72px]",
          // Màu nền & viền phong phú
          customColorDef
            ? cn(customColorDef.bgClass, customColorDef.borderClass)
            : isOccupied
              ? isLocked
                ? "bg-amber-50/95 border-amber-400 shadow-2xs"
                : isFemale
                  ? "bg-rose-50/95 border-rose-300 hover:border-rose-400 shadow-2xs"
                  : "bg-sky-50/95 border-sky-300 hover:border-sky-400 shadow-2xs"
              : "bg-white/90 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30",
          // Selected highlight
          isSelected && "ring-4 ring-indigo-500/30 border-indigo-600 scale-[1.02] z-10 shadow-md",
          // Drag Target highlight
          isDragTarget && "ring-4 ring-emerald-500/40 border-emerald-500 bg-emerald-50 scale-105 z-20 shadow-lg",
          // Special seat highlight
          isSpecial && "border-amber-400 ring-2 ring-amber-300/40"
        )}
      >
        {/* Cờ Khóa / Đặc biệt ở góc */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 pointer-events-none">
          {isSpecial && (
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
          )}
          {isLocked && (
            <Lock className="w-3 h-3 text-amber-600" />
          )}
        </div>

        {/* Nội dung Ghế */}
        {isOccupied ? (
          <div className="w-full flex flex-col items-center justify-between h-full space-y-1">
            {/* 1. Icon Giới Tính ở giữa trên */}
            <div className="flex items-center justify-center">
              <span className="text-sm select-none leading-none" title={isFemale ? 'Nữ' : 'Nam'}>
                {isFemale ? '👧' : '👦'}
              </span>
            </div>

            {/* 2. Tên Học Sinh 2 từ to rõ ở giữa */}
            <p
              className="text-xs sm:text-[13px] font-black text-slate-950 leading-tight tracking-tight px-0.5 line-clamp-2 w-full text-center"
              title={assignment.studentName}
            >
              {optimalDisplayName}
            </p>

            {/* 3. Chức vụ nếu có ở dưới với màu sắc phân biệt */}
            {showRole ? (
              <div className={cn(
                "flex items-center justify-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md border max-w-full truncate",
                roleInfo?.badgeClass
              )}>
                <span>{roleInfo?.icon}</span>
                <span className="truncate">{roleInfo?.label}</span>
              </div>
            ) : (
              <div className="h-1" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center my-auto py-2">
            <span className="text-[11px] font-bold text-slate-300 italic">
              {isDragTarget ? "Thả vào đây" : "(Trống)"}
            </span>
          </div>
        )}

        {/* Hoán đổi Indicator Overlay khi kéo đè */}
        {isSwapTarget && (
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/90 text-white flex flex-col items-center justify-center p-1 font-black text-[9px] animate-in fade-in zoom-in-95 z-30">
            <ArrowLeftRight className="w-3.5 h-3.5 mb-0.5 animate-pulse" />
            <span>HOÁN ĐỔI</span>
          </div>
        )}
      </div>

      {/* Interactive Context Sub-Menu Popover */}
      <SeatContextMenu
        seat={seat}
        assignment={assignment}
        isOpen={isMenuOpen && viewMode === 'edit'}
        students={students}
        assignedStudentMap={assignedStudentMap}
        onClose={() => setIsMenuOpen(false)}
        onAssignStudent={(st, sId) => {
          if (onAssignStudent) onAssignStudent(st, sId);
          setIsMenuOpen(false);
        }}
        onUnassignSeat={(sId) => {
          if (onUnassign) onUnassign(sId);
          setIsMenuOpen(false);
        }}
        onToggleLock={(sId) => {
          if (onToggleLock) onToggleLock(sId);
        }}
        onToggleSpecial={(sId, isSp, type, note) => {
          if (onToggleSpecial) onToggleSpecial(sId, isSp, type, note);
        }}
        onSetRole={(sId, role) => {
          if (onSetRole) onSetRole(sId, role);
        }}
        onSetColor={(sId, color) => {
          if (onSetColor) onSetColor(sId, color);
        }}
        onStartSwap={(sId) => {
          if (onDragStart) onDragStart(sId, assignment?.studentName);
        }}
      />
    </div>
  );
};
