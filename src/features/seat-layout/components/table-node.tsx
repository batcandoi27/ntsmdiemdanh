// ============================================================================
// SEAT LAYOUT EDITOR - TABLE NODE COMPONENT
// ============================================================================

import React from 'react';
import { TableDef, SeatDef, SeatAssignment, ID, EditorStudent, StudentRole, SeatSpecialType } from '../domain/types';
import { SeatNode } from './seat-node';
import { DraggedEntity } from '../hooks/useSeatLayoutEditor';
import { getAutoTheme } from '@/design-system/tokens/auto-themes';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TableNodeProps {
  table: TableDef;
  seats: Record<ID, SeatDef>;
  assignments: Record<ID, SeatAssignment>;
  students?: EditorStudent[];
  assignedStudentMap?: Map<string, { seatId: string; locked?: boolean }>;
  selectedSeatId?: ID;
  selectedTableId?: ID;
  hoverSeatId?: ID | null;
  draggedEntity?: DraggedEntity;
  viewMode?: 'edit' | 'view' | 'presentation';
  onSelectTable?: (tableId: ID) => void;
  onSelectSeat?: (seatId: ID) => void;
  onAssignStudent?: (student: EditorStudent, seatId: ID) => void;
  onSwapSeats?: (sourceSeatId: ID, targetSeatId: ID) => void;
  onUnassignSeat?: (seatId: ID) => void;
  onToggleLockSeat?: (seatId: ID) => void;
  onToggleSpecialSeat?: (seatId: ID, isSpecial: boolean, type?: SeatSpecialType, note?: string) => void;
  onSetRole?: (seatId: ID, role: StudentRole) => void;
  onSetColor?: (seatId: ID, color?: string) => void;
  onDeleteTable?: (tableId: ID) => void;
  onDragStartSeat?: (seatId: ID, studentName?: string) => void;
  onDragOverSeat?: (seatId: ID) => void;
  onDragLeaveSeat?: () => void;
  onDropSeat?: (seatId: ID) => void;
}

export const TableNode: React.FC<TableNodeProps> = ({
  table,
  seats,
  assignments,
  students = [],
  assignedStudentMap = new Map(),
  selectedSeatId,
  selectedTableId,
  hoverSeatId,
  draggedEntity,
  viewMode = 'edit',
  onSelectTable,
  onSelectSeat,
  onAssignStudent,
  onSwapSeats,
  onUnassignSeat,
  onToggleLockSeat,
  onToggleSpecialSeat,
  onSetRole,
  onSetColor,
  onDeleteTable,
  onDragStartSeat,
  onDragOverSeat,
  onDragLeaveSeat,
  onDropSeat
}) => {
  const isSelected = selectedTableId === table.id;
  const theme = getAutoTheme((table.row - 1) % 8);

  const tableSeats = table.seatIds.map(id => seats[id]).filter(Boolean);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (onSelectTable) onSelectTable(table.id);
      }}
      className={cn(
        "group/table rounded-2xl p-1.5 border-2 transition-all duration-200 space-y-1 relative shadow-xs",
        theme.bg,
        theme.border,
        isSelected && "ring-4 ring-indigo-500/20 border-indigo-600 shadow-md",
        "hover:shadow-sm"
      )}
    >
      {/* 1. Header Bàn: Tên bàn nhỏ gọn + Nút xóa khi hover */}
      <div className="flex items-center justify-between px-1 text-[10px] font-black">
        <span className={cn("uppercase tracking-wider", theme.titleColor)}>
          {table.name}
        </span>

        {viewMode === 'edit' && onDeleteTable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Bạn có chắc muốn xóa "${table.name}"?`)) {
                onDeleteTable(table.id);
              }
            }}
            title="Xóa bàn này"
            className="opacity-0 group-hover/table:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-600 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Grid các Ghế bên trong Bàn (Liền khối) */}
      <div className={cn(
        "grid gap-1.5",
        table.seatsCount === 1 && "grid-cols-1",
        table.seatsCount === 2 && "grid-cols-2",
        table.seatsCount === 3 && "grid-cols-3",
        table.seatsCount === 4 && "grid-cols-2",
        table.seatsCount === 5 && "grid-cols-3",
        table.seatsCount === 6 && "grid-cols-3"
      )}>
        {tableSeats.map((seat) => (
          <SeatNode
            key={seat.id}
            seat={seat}
            assignment={assignments[seat.id]}
            students={students}
            assignedStudentMap={assignedStudentMap}
            isSelected={selectedSeatId === seat.id}
            isHovered={hoverSeatId === seat.id}
            draggedEntity={draggedEntity}
            viewMode={viewMode}
            onSelect={onSelectSeat}
            onAssignStudent={onAssignStudent}
            onSwapSeats={onSwapSeats}
            onUnassign={onUnassignSeat}
            onToggleLock={onToggleLockSeat}
            onToggleSpecial={onToggleSpecialSeat}
            onSetRole={onSetRole}
            onSetColor={onSetColor}
            onDragStart={onDragStartSeat}
            onDragOver={onDragOverSeat}
            onDragLeave={onDragLeaveSeat}
            onDrop={onDropSeat}
          />
        ))}
      </div>
    </div>
  );
};
