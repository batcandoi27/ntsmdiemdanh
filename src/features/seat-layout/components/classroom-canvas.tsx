// ============================================================================
// SEAT LAYOUT EDITOR - CLASSROOM CANVAS COMPONENT
// Bố cục phòng học: Mỗi Tổ trong 1 Box thống nhất, có Line ngăn cách & Nút xóa Tổ
// ============================================================================

import React, { useMemo } from 'react';
import { ClassroomLayout, TableDef, ID, EditorStudent, StudentRole, SeatSpecialType } from '../domain/types';
import { TableNode } from './table-node';
import { DraggedEntity, SelectedEntity } from '../hooks/useSeatLayoutEditor';
import { getAutoTheme } from '@/design-system/tokens/auto-themes';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClassroomCanvasProps {
  layout: ClassroomLayout;
  students?: EditorStudent[];
  assignedStudentMap?: Map<string, { seatId: string; locked?: boolean }>;
  selectedEntity: SelectedEntity;
  hoverSeatId: ID | null;
  draggedEntity: DraggedEntity;
  viewMode: 'edit' | 'view' | 'presentation';
  zoom: number;
  onSelectTable: (tableId: ID) => void;
  onSelectSeat: (seatId: ID) => void;
  onAssignStudent: (student: EditorStudent, seatId: ID) => void;
  onSwapSeats: (sourceSeatId: ID, targetSeatId: ID) => void;
  onUnassignSeat: (seatId: ID) => void;
  onToggleLockSeat: (seatId: ID) => void;
  onToggleSpecialSeat: (seatId: ID, isSpecial: boolean, type?: SeatSpecialType, note?: string) => void;
  onSetRole?: (seatId: ID, role: StudentRole) => void;
  onSetColor?: (seatId: ID, color?: string) => void;
  onAddSeatToTable?: (tableId: ID) => void;
  onDeleteTable: (tableId: ID) => void;
  onDeleteRow?: (rowNumber: number) => void;
  onAddDeskToRow?: (rowNumber: number) => void;
  onAddNewRow?: () => void;
  onDragStartSeat: (seatId: ID, studentName?: string) => void;
  onDragOverSeat: (seatId: ID) => void;
  onDragLeaveSeat: () => void;
  onDropSeat: (targetSeatId: ID) => void;
  onClearSelection: () => void;
}

export const ClassroomCanvas: React.FC<ClassroomCanvasProps> = ({
  layout,
  students = [],
  assignedStudentMap = new Map(),
  selectedEntity,
  hoverSeatId,
  draggedEntity,
  viewMode,
  zoom,
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
  onDeleteRow,
  onAddDeskToRow,
  onAddNewRow,
  onDragStartSeat,
  onDragOverSeat,
  onDragLeaveSeat,
  onDropSeat,
  onClearSelection
}) => {
  const { tables, seats, assignments, boardPosition = 'top', teacherDeskSide = 'right', windowCountLeft = 2, windowCountRight = 2 } = layout;

  // Gom các bàn theo Dãy (row)
  const rowsGrouped = useMemo(() => {
    const map = new Map<number, TableDef[]>();
    for (const table of Object.values(tables)) {
      const list = map.get(table.row) || [];
      list.push(table);
      map.set(table.row, list);
    }
    return Array.from(map.entries())
      .sort(([rowA], [rowB]) => rowA - rowB)
      .map(([row, tableList]) => ({
        row,
        tables: tableList.sort((a, b) => a.col - b.col)
      }));
  }, [tables]);

  const selectedSeatId = selectedEntity?.type === 'seat' ? selectedEntity.id : undefined;
  const selectedTableId = selectedEntity?.type === 'table' ? selectedEntity.id : undefined;

  // Khối Bảng Lớp Học & Bàn Giáo Viên & Cửa Trước
  const FrontOfClassroom = (
    <div className="flex items-center justify-between gap-3 w-full bg-slate-100/90 p-3 rounded-2xl border-2 border-slate-300 shadow-xs select-none">
      {/* Vị trí Cửa Trước / Bàn GV tùy theo teacherDeskSide */}
      {teacherDeskSide === 'right' ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-100 text-sky-950 border border-sky-300 font-black text-xs shrink-0 shadow-2xs">
          <span>🚪 CỬA LỚP ➔</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs shrink-0 shadow-2xs">
          <span>👩‍🏫 BÀN GIÁO VIÊN</span>
        </div>
      )}

      {/* Bảng Lớp Học: Ghi to rõ, nền xanh đậm chữ trắng */}
      <div className="flex-1 text-center py-2.5 px-6 rounded-xl bg-emerald-950 text-white font-black text-sm uppercase tracking-widest shadow-inner border border-emerald-900">
        BẢNG LỚP HỌC
      </div>

      {teacherDeskSide === 'right' ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs shrink-0 shadow-2xs">
          <span>👩‍🏫 BÀN GIÁO VIÊN</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-100 text-sky-950 border border-sky-300 font-black text-xs shrink-0 shadow-2xs">
          <span>🚪 CỬA LỚP ➔</span>
        </div>
      )}
    </div>
  );

  // Khối Bảng Phụ Cuối Lớp
  const RearOfClassroom = (
    <div className="flex items-center justify-center gap-3 w-full bg-slate-800 text-slate-200 py-2 px-6 rounded-2xl font-black text-xs uppercase tracking-wider shadow-inner select-none border border-slate-700">
      <span>📋 BẢNG PHỤ / BẢNG TIN CUỐI LỚP</span>
    </div>
  );

  return (
    <div
      onClick={onClearSelection}
      className="flex-1 bg-slate-50/70 rounded-3xl border border-slate-200/80 p-5 overflow-auto min-h-[750px] relative font-sans select-none"
    >
      <div
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        className="transition-transform duration-150 space-y-4 max-w-5xl mx-auto"
      >
        {/* Phía Đầu Phòng Học */}
        {boardPosition === 'top' ? FrontOfClassroom : RearOfClassroom}

        {/* Khung tường có cửa sổ trái/phải và Sơ đồ các dãy bàn */}
        <div className="flex items-stretch gap-3">
          {/* Tường Trái */}
          <div className="flex flex-col justify-around py-4 px-1.5 bg-slate-200/70 rounded-2xl border border-slate-300 text-slate-500 font-bold text-[10px] select-none shrink-0 w-8 items-center space-y-2">
            <span className="[writing-mode:vertical-lr] tracking-widest text-[9px] uppercase font-black text-slate-600">
              TƯỜNG TRÁI
            </span>
            {Array.from({ length: windowCountLeft }).map((_, i) => (
              <span key={i} title="Cửa sổ" className="text-sm">🪟</span>
            ))}
          </div>

          {/* Sơ đồ các Dãy bàn: Mỗi Tổ bọc trong 1 Box pastel đồng nhất, giữa các Tổ có Divider */}
          <div className="flex-1 flex items-start gap-4 justify-center">
            {rowsGrouped.map(({ row, tables: rowTables }, idx) => {
              const theme = getAutoTheme((row - 1) % 8);
              const isLast = idx === rowsGrouped.length - 1;

              return (
                <React.Fragment key={row}>
                  {/* Unified Box Card cho từng Tổ */}
                  <div className={cn(
                    "flex-1 min-w-[210px] rounded-3xl p-3 border-2 space-y-3 shadow-xs transition-all",
                    theme.bg,
                    theme.border
                  )}>
                    {/* Header Tổ: Tên Tổ nổi bật + Nút Xóa Tổ */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-300/60">
                      <span className={cn("font-black text-xs uppercase tracking-widest", theme.titleColor)}>
                        TỔ {row}
                      </span>

                      {viewMode === 'edit' && onDeleteRow && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Bạn có chắc muốn xóa toàn bộ TỔ ${row}? (Các tổ khác sẽ tự động được đánh số lại)`)) {
                              onDeleteRow(row);
                            }
                          }}
                          title={`Xóa toàn bộ Tổ ${row}`}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100/80 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Các Bàn trong Tổ */}
                    <div className="space-y-2">
                      {rowTables.map((table) => (
                        <TableNode
                          key={table.id}
                          table={table}
                          seats={seats}
                          assignments={assignments}
                          students={students}
                          assignedStudentMap={assignedStudentMap}
                          selectedSeatId={selectedSeatId}
                          selectedTableId={selectedTableId}
                          hoverSeatId={hoverSeatId}
                          draggedEntity={draggedEntity}
                          viewMode={viewMode}
                          onSelectTable={onSelectTable}
                          onSelectSeat={onSelectSeat}
                          onAssignStudent={onAssignStudent}
                          onSwapSeats={onSwapSeats}
                          onUnassignSeat={onUnassignSeat}
                          onToggleLockSeat={onToggleLockSeat}
                          onToggleSpecialSeat={onToggleSpecialSeat}
                          onSetRole={onSetRole}
                          onSetColor={onSetColor}
                          onDeleteTable={onDeleteTable}
                          onDragStartSeat={onDragStartSeat}
                          onDragOverSeat={onDragOverSeat}
                          onDragLeaveSeat={onDragLeaveSeat}
                          onDropSeat={onDropSeat}
                        />
                      ))}

                      {/* Nút Thêm Bàn ở cuối Dãy */}
                      {viewMode === 'edit' && onAddDeskToRow && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddDeskToRow(row);
                          }}
                          className="w-full py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-white/80 hover:bg-white text-[10px] font-bold text-slate-600 hover:text-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm Bàn vào Tổ {row}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vạch kẻ phân cách giữa các Tổ */}
                  {!isLast && (
                    <div className="self-stretch w-px bg-slate-300/70 border-r border-dashed border-slate-300 my-2 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}

            {/* Nút Thêm Dãy Mới */}
            {viewMode === 'edit' && onAddNewRow && (
              <div className="pt-8">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNewRow();
                  }}
                  className="px-3 py-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/50 text-xs font-black text-slate-500 hover:text-indigo-700 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs h-full min-h-[200px]"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span className="[writing-mode:vertical-lr] tracking-wider uppercase text-[10px]">
                    + Thêm Dãy
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Tường Phải */}
          <div className="flex flex-col justify-around py-4 px-1.5 bg-slate-200/70 rounded-2xl border border-slate-300 text-slate-500 font-bold text-[10px] select-none shrink-0 w-8 items-center space-y-2">
            <span className="[writing-mode:vertical-lr] tracking-widest text-[9px] uppercase font-black text-slate-600">
              TƯỜNG PHẢI
            </span>
            {Array.from({ length: windowCountRight }).map((_, i) => (
              <span key={i} title="Cửa sổ" className="text-sm">🪟</span>
            ))}
          </div>
        </div>

        {/* Phía Cuối Phòng Học */}
        {boardPosition === 'top' ? RearOfClassroom : FrontOfClassroom}
      </div>
    </div>
  );
};
