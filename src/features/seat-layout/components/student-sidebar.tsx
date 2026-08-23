// ============================================================================
// SEAT LAYOUT EDITOR - STUDENT SIDEBAR COMPONENT
// Danh sách học sinh hỗ trợ kéo chỉnh kích thước chiều rộng & ẩn hiện
// ============================================================================

import React, { useRef } from 'react';
import { EditorStudent, ID } from '../domain/types';
import { Search, Lock, CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StudentSidebarProps {
  students: EditorStudent[];
  assignedStudentMap: Map<ID, { seatId: ID; locked?: boolean }>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  genderFilter: 'all' | 'male' | 'female';
  onGenderFilterChange: (gender: 'all' | 'male' | 'female') => void;
  statusFilter: 'all' | 'unassigned' | 'assigned' | 'locked';
  onStatusFilterChange: (status: 'all' | 'unassigned' | 'assigned' | 'locked') => void;
  selectedStudentId?: ID;
  width?: number;
  onWidthChange?: (newWidth: number) => void;
  onSelectStudent?: (student: EditorStudent, seatId?: ID) => void;
  onDragStartStudent?: (student: EditorStudent) => void;
  onDragEndStudent?: () => void;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  students,
  assignedStudentMap,
  searchQuery,
  onSearchChange,
  genderFilter,
  onGenderFilterChange,
  statusFilter,
  onStatusFilterChange,
  selectedStudentId,
  width = 300,
  onWidthChange,
  onSelectStudent,
  onDragStartStudent,
  onDragEndStudent
}) => {
  const resizingRef = useRef(false);

  const totalCount = students.length;
  let assignedCount = 0;
  let lockedCount = 0;

  assignedStudentMap.forEach((info) => {
    assignedCount++;
    if (info.locked) lockedCount++;
  });

  const unassignedCount = Math.max(0, totalCount - assignedCount);

  // Xử lý kéo thay đổi chiều rộng Sidebar bằng Pointer Events
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    resizingRef.current = true;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    document.body.classList.add('select-none');

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(480, Math.max(220, startWidth + delta));
      if (onWidthChange) onWidthChange(nextWidth);
    };

    const onPointerUp = () => {
      resizingRef.current = false;
      document.body.classList.remove('select-none');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <div
      style={{ width: `${width}px` }}
      className="relative bg-white rounded-3xl border border-slate-200 shadow-sm p-3.5 flex flex-col h-[750px] space-y-3 shrink-0 select-none"
    >
      {/* 1. Header Sidebar */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
            Danh Sách Học Sinh
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
            {students.length} HS
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
          Kéo thả học sinh vào bàn để xếp chỗ
        </p>
      </div>

      {/* 2. Ô tìm kiếm */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm họ tên học sinh..."
          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
        />
      </div>

      {/* 3. Bộ lọc trạng thái */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 text-[10px] font-bold">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'unassigned', label: `Chưa (${unassignedCount})` },
          { id: 'assigned', label: `Đã xếp (${assignedCount})` },
          { id: 'locked', label: `Khóa (${lockedCount})` },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onStatusFilterChange(f.id as any)}
            className={cn(
              "py-1 rounded-xl transition-all text-center truncate",
              statusFilter === f.id
                ? "bg-white text-indigo-900 shadow-2xs font-black"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 4. Bộ lọc giới tính */}
      <div className="flex items-center gap-1">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'male', label: 'Nam 👦' },
          { id: 'female', label: 'Nữ 👧' },
        ].map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onGenderFilterChange(g.id as any)}
            className={cn(
              "px-2 py-1 rounded-xl text-[10px] font-bold transition-colors border",
              genderFilter === g.id
                ? "bg-indigo-50 text-indigo-900 border-indigo-300"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 5. Danh sách học sinh cuộn */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
        {students.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-bold">
            Không tìm thấy học sinh phù hợp
          </div>
        ) : (
          students.map((st, idx) => {
            const assignInfo = assignedStudentMap.get(st.id);
            const isAssigned = !!assignInfo;
            const isLocked = assignInfo?.locked || false;
            const isFemale = st.gender === 'female' || st.gender === 'Nữ';

            return (
              <div
                key={st.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify(st));
                  e.dataTransfer.effectAllowed = 'copyMove';
                  if (onDragStartStudent) onDragStartStudent(st);
                }}
                onDragEnd={() => {
                  if (onDragEndStudent) onDragEndStudent();
                }}
                onClick={() => onSelectStudent && onSelectStudent(st, assignInfo?.seatId)}
                className={cn(
                  "group p-2 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none",
                  isAssigned
                    ? isLocked
                      ? "bg-amber-50/70 border-amber-300 hover:border-amber-400"
                      : "bg-emerald-50/70 border-emerald-300 hover:border-emerald-400"
                    : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30",
                  selectedStudentId === st.id && "ring-2 ring-indigo-500 border-indigo-500"
                )}
              >
                {/* STT & Icon Giới tính & Tên */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripVertical className="w-3 h-3 text-slate-400 shrink-0 opacity-60 group-hover:opacity-100" />
                  <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                    {st.stt ?? idx + 1}
                  </span>
                  <span className="text-xs shrink-0 select-none">
                    {isFemale ? '👧' : '👦'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate leading-tight">
                      {st.fullName}
                    </p>
                  </div>
                </div>

                {/* Huy hiệu trạng thái */}
                <div className="shrink-0">
                  {isAssigned ? (
                    isLocked ? (
                      <span title="Vị trí đã khóa" className="p-1 rounded-lg bg-amber-200 text-amber-900 inline-block">
                        <Lock className="w-3 h-3" />
                      </span>
                    ) : (
                      <span title="Đã có chỗ ngồi" className="p-1 rounded-lg bg-emerald-200 text-emerald-900 inline-block">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    )
                  ) : (
                    <span title="Chưa xếp chỗ" className="p-1 rounded-lg bg-slate-100 text-slate-400 inline-block">
                      <Circle className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Drag Handle chỉnh độ rộng cạnh phải */}
      <div
        onPointerDown={handleResizeStart}
        className="absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize hover:bg-indigo-500/20 active:bg-indigo-500/40 rounded-r-3xl transition-colors flex items-center justify-center group"
        title="Kéo sang trái/phải để điều chỉnh độ rộng danh sách học sinh"
      >
        <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-indigo-500 rounded-full" />
      </div>
    </div>
  );
};
