// ============================================================================
// SEAT LAYOUT EDITOR - PROPERTIES PANEL COMPONENT
// Bảng thuộc tính khi click chọn Bàn, Ghế hoặc Vật thể
// ============================================================================

import React from 'react';
import { ClassroomLayout, ID, SeatSpecialType } from '../domain/types';
import { SelectedEntity } from '../hooks/useSeatLayoutEditor';
import {
  Sliders,
  X,
  Lock,
  Unlock,
  Star,
  UserMinus,
  Trash2,
  Tag,
  Eye,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PropertiesPanelProps {
  layout: ClassroomLayout;
  selectedEntity: SelectedEntity;
  onClose: () => void;
  onToggleLockSeat?: (seatId: ID) => void;
  onToggleSpecialSeat?: (seatId: ID, isSpecial: boolean, type?: SeatSpecialType, note?: string) => void;
  onUnassignSeat?: (seatId: ID) => void;
  onDeleteTable?: (tableId: ID) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  layout,
  selectedEntity,
  onClose,
  onToggleLockSeat,
  onToggleSpecialSeat,
  onUnassignSeat,
  onDeleteTable
}) => {
  if (!selectedEntity) return null;

  const { type, id } = selectedEntity;

  // 1. Khi chọn Ghế (Seat)
  if (type === 'seat') {
    const seat = layout.seats[id];
    const assign = layout.assignments[id];
    if (!seat) return null;

    const table = layout.tables[seat.tableId];
    const isLocked = assign?.locked || false;
    const isSpecial = seat.isSpecial || false;

    return (
      <div className="w-80 bg-white rounded-3xl border border-slate-200 shadow-xl p-4 space-y-4 animate-in slide-in-from-right-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
              S
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-900 uppercase">
                Thuộc Tính Ghế {seat.label || seat.seatNumber}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                {table ? table.name : 'Bàn học'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thông tin học sinh đang ngồi */}
        {assign ? (
          <div className="space-y-2 bg-slate-50 rounded-2xl p-3 border border-slate-200">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Học sinh đang ngồi:
            </span>
            <p className="text-sm font-black text-slate-900 leading-tight">
              {assign.studentName}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>{assign.gender === 'female' || assign.gender === 'Nữ' ? '👧 Nữ' : '👦 Nam'}</span>
              {assign.studentCode && <span>• {assign.studentCode}</span>}
            </div>

            {/* Nút thao tác nhanh với học sinh */}
            <div className="pt-2 flex items-center gap-1.5 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => onToggleLockSeat && onToggleLockSeat(seat.id)}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1",
                  isLocked
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                )}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Đã khóa 🔒' : 'Khóa vị trí'}</span>
              </button>

              <button
                type="button"
                onClick={() => onUnassignSeat && onUnassignSeat(seat.id)}
                className="py-1.5 px-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
                title="Gỡ học sinh khỏi ghế"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Gỡ</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-4 text-center border border-dashed border-slate-300">
            <span className="text-xs font-bold text-slate-400">
              Ghế đang trống. Hãy kéo học sinh từ danh sách bên trái vào đây.
            </span>
          </div>
        )}

        {/* Đánh dấu vị trí đặc biệt (Cận thị, Chiều cao, Kỷ luật...) */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>Đánh dấu vị trí đặc biệt:</span>
          </label>

          <div className="space-y-1.5">
            {[
              { id: 'none', label: 'Bình thường' },
              { id: 'eyesight', label: '👁 Ưu tiên thị lực (Gần bảng)' },
              { id: 'height', label: '📏 Ưu tiên chiều cao' },
              { id: 'discipline', label: '🎯 Giáo viên quan sát đặc biệt' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (onToggleSpecialSeat) {
                    onToggleSpecialSeat(
                      seat.id,
                      opt.id !== 'none',
                      opt.id as any,
                      opt.label
                    );
                  }
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                  (isSpecial && seat.specialType === opt.id) || (!isSpecial && opt.id === 'none')
                    ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Khi chọn Bàn (Table)
  if (type === 'table') {
    const table = layout.tables[id];
    if (!table) return null;

    return (
      <div className="w-80 bg-white rounded-3xl border border-slate-200 shadow-xl p-4 space-y-4 animate-in slide-in-from-right-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
              T
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-900 uppercase">
                {table.name}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                Dãy {table.row} • Bàn số {table.col}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-bold">Số chỗ ngồi:</span>
            <span className="font-black text-slate-900">{table.seatsCount} chỗ</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-bold">Số ghế đã xếp:</span>
            <span className="font-black text-indigo-600">
              {table.seatIds.filter(sId => !!layout.assignments[sId]).length} / {table.seatsCount}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onDeleteTable && onDeleteTable(table.id)}
            className="w-full py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa Bàn Này Khỏi Sơ Đồ</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
