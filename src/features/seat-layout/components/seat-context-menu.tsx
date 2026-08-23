// ============================================================================
// SEAT LAYOUT EDITOR - SEAT CONTEXT MENU / POPOVER
// Menu ngữ cảnh trực quan khi bấm vào bất kỳ vị trí ghế nào
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { SeatDef, SeatAssignment, StudentRole, SeatSpecialType, EditorStudent, ID } from '../domain/types';
import {
  Lock,
  Unlock,
  Star,
  UserMinus,
  ArrowLeftRight,
  Palette,
  Crown,
  BookOpen,
  Scale,
  Smile,
  Flag,
  UserCheck,
  Coins,
  X,
  Check,
  Search,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SeatContextMenuProps {
  seat: SeatDef;
  assignment?: SeatAssignment;
  isOpen: boolean;
  students: EditorStudent[];
  assignedStudentMap: Map<string, { seatId: string; locked?: boolean }>;
  onClose: () => void;
  onAssignStudent: (student: EditorStudent, seatId: ID) => void;
  onUnassignSeat: (seatId: ID) => void;
  onToggleLock: (seatId: ID) => void;
  onToggleSpecial: (seatId: ID, isSpecial: boolean, type?: SeatSpecialType, note?: string) => void;
  onSetRole: (seatId: ID, role: StudentRole) => void;
  onSetColor: (seatId: ID, color?: string) => void;
  onStartSwap: (seatId: ID) => void;
}

export const ROLE_OPTIONS: {
  role: StudentRole;
  label: string;
  icon: string;
  badgeClass: string;
  colorName: string;
}[] = [
  { role: 'none', label: 'Học sinh', icon: '👤', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', colorName: 'Mặc định' },
  { role: 'monitor', label: 'Lớp trưởng', icon: '👑', badgeClass: 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs font-black', colorName: 'Vàng Hoàng Kim' },
  { role: 'vice_academic', label: 'Lớp phó học tập', icon: '📚', badgeClass: 'bg-indigo-100 text-indigo-950 border-indigo-300 shadow-2xs font-black', colorName: 'Xanh Dương Đậm' },
  { role: 'vice_discipline', label: 'Lớp phó kỷ luật', icon: '⚖️', badgeClass: 'bg-rose-100 text-rose-950 border-rose-300 shadow-2xs font-black', colorName: 'Đỏ Rượu' },
  { role: 'vice_activity', label: 'Lớp phó phong trào', icon: '🎨', badgeClass: 'bg-purple-100 text-purple-950 border-purple-300 shadow-2xs font-black', colorName: 'Tím Quý Phái' },
  { role: 'group_leader', label: 'Tổ trưởng', icon: '🚩', badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs font-black', colorName: 'Xanh Lá Cây' },
  { role: 'group_vice', label: 'Tổ phó', icon: '🏳️', badgeClass: 'bg-teal-100 text-teal-950 border-teal-300 shadow-2xs font-black', colorName: 'Xanh Ngọc Bích' },
  { role: 'treasurer', label: 'Thủ quỹ', icon: '💰', badgeClass: 'bg-orange-100 text-orange-950 border-orange-300 shadow-2xs font-black', colorName: 'Cam Đồng' },
];

export const COLOR_OPTIONS: { id: string; name: string; bgClass: string; borderClass: string }[] = [
  { id: 'default', name: 'Mặc định (theo giới tính)', bgClass: 'bg-white', borderClass: 'border-slate-300' },
  { id: 'blue', name: 'Xanh Lam', bgClass: 'bg-sky-100', borderClass: 'border-sky-400' },
  { id: 'pink', name: 'Hồng Phấn', bgClass: 'bg-pink-100', borderClass: 'border-pink-400' },
  { id: 'emerald', name: 'Xanh Lá', bgClass: 'bg-emerald-100', borderClass: 'border-emerald-400' },
  { id: 'amber', name: 'Vàng Cam', bgClass: 'bg-amber-100', borderClass: 'border-amber-400' },
  { id: 'purple', name: 'Tím Lavender', bgClass: 'bg-purple-100', borderClass: 'border-purple-400' },
];

export const SeatContextMenu: React.FC<SeatContextMenuProps> = ({
  seat,
  assignment,
  isOpen,
  students,
  assignedStudentMap,
  onClose,
  onAssignStudent,
  onUnassignSeat,
  onToggleLock,
  onToggleSpecial,
  onSetRole,
  onSetColor,
  onStartSwap
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'assign' | 'role' | 'color' | 'special'>('main');
  const [studentSearch, setStudentSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOccupied = !!assignment;
  const isLocked = assignment?.locked || false;
  const isSpecial = seat.isSpecial || false;

  // Lọc học sinh cho tab chọn nhanh
  const filteredStudents = students.filter(st => {
    const name = st.fullName.toLowerCase();
    return name.includes(studentSearch.toLowerCase());
  });

  return (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white rounded-3xl border border-slate-200 shadow-2xl p-3 text-xs animate-in fade-in zoom-in-95 font-sans"
    >
      {/* Header Modal */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-[10px]">
            {seat.label || seat.seatNumber}
          </span>
          <div className="min-w-0">
            <h4 className="font-black text-slate-900 truncate text-xs leading-tight">
              {isOccupied ? assignment.studentName : `Ghế ${seat.label || seat.seatNumber} (Trống)`}
            </h4>
            {isOccupied && assignment.role && assignment.role !== 'none' && (
              <span className="text-[10px] text-amber-600 font-bold">
                {ROLE_OPTIONS.find(r => r.role === assignment.role)?.icon}{' '}
                {ROLE_OPTIONS.find(r => r.role === assignment.role)?.label}
              </span>
            )}
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

      {/* TAB 1: MAIN MENU */}
      {activeTab === 'main' && (
        <div className="space-y-1.5">
          {/* Nút 1: Chọn / Đổi học sinh */}
          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className="w-full flex items-center justify-between p-2 rounded-xl text-left font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>{isOccupied ? 'Đổi học sinh khác' : 'Chèn học sinh vào ghế'}</span>
            </div>
            <span className="text-slate-400 text-[10px]">›</span>
          </button>

          {/* Nút 2: Đổi chỗ với ghế khác */}
          {isOccupied && (
            <button
              type="button"
              onClick={() => {
                onStartSwap(seat.id);
                onClose();
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl text-left font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                <span>Hoán đổi chỗ ngồi (Swap)</span>
              </div>
            </button>
          )}

          {/* Nút 3: Gán Chức Vụ Ban Cán Sự */}
          {isOccupied && (
            <button
              type="button"
              onClick={() => setActiveTab('role')}
              className="w-full flex items-center justify-between p-2 rounded-xl text-left font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Chỉnh sửa Chức vụ</span>
              </div>
              <span className="text-slate-400 text-[10px]">›</span>
            </button>
          )}

          {/* Nút 4: Sửa màu ghế */}
          <button
            type="button"
            onClick={() => setActiveTab('color')}
            className="w-full flex items-center justify-between p-2 rounded-xl text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-600" />
              <span>Đổi màu ghế</span>
            </div>
            <span className="text-slate-400 text-[10px]">›</span>
          </button>

          {/* Nút 5: Đánh dấu vị trí đặc biệt */}
          <button
            type="button"
            onClick={() => setActiveTab('special')}
            className="w-full flex items-center justify-between p-2 rounded-xl text-left font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Vị trí đặc biệt (Thị lực / Chiều cao)</span>
            </div>
            <span className="text-slate-400 text-[10px]">›</span>
          </button>

          {/* Footer Quick Toggles */}
          {isOccupied && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleLock(seat.id)}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all",
                  isLocked
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Đã khóa 🔒' : 'Khóa'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUnassignSeat(seat.id);
                  onClose();
                }}
                className="py-1.5 px-2 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Gỡ</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHÈN / ĐỔI HỌC SINH */}
      {activeTab === 'assign' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ← Quay lại
            </button>
            <span className="font-bold text-slate-800 text-xs">Chọn học sinh</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên học sinh..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredStudents.map(st => {
              const currentAssignment = assignedStudentMap.get(st.id);
              const isHere = assignment?.studentId === st.id;
              const isFemale = st.gender === 'female' || st.gender === 'Nữ';

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onAssignStudent(st, seat.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full text-left p-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors",
                    isHere
                      ? "bg-indigo-100 text-indigo-900"
                      : "hover:bg-slate-100 text-slate-800"
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{isFemale ? '👧' : '👦'}</span>
                    <span className="truncate">{st.stt ? `${st.stt}. ` : ''}{st.fullName}</span>
                  </div>
                  {currentAssignment && !isHere && (
                    <span className="text-[9px] text-slate-400 font-normal">Đã có chỗ</span>
                  )}
                  {isHere && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CHỌN CHỨC VỤ BAN CÁN SỰ */}
      {activeTab === 'role' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ← Quay lại
            </button>
            <span className="font-bold text-slate-800 text-xs">Chức vụ cán sự</span>
          </div>

          <div className="space-y-1">
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.role}
                type="button"
                onClick={() => {
                  onSetRole(seat.id, opt.role);
                  setActiveTab('main');
                }}
                className={cn(
                  "w-full text-left p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors",
                  (assignment?.role === opt.role) || (!assignment?.role && opt.role === 'none')
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "hover:bg-slate-100 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
                {((assignment?.role === opt.role) || (!assignment?.role && opt.role === 'none')) && (
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CHỌN MÀU GHẾ */}
      {activeTab === 'color' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ← Quay lại
            </button>
            <span className="font-bold text-slate-800 text-xs">Đổi màu ghế</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSetColor(seat.id, c.id === 'default' ? undefined : c.id);
                  setActiveTab('main');
                }}
                className={cn(
                  "p-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all",
                  c.bgClass,
                  c.borderClass,
                  assignment?.customColor === c.id || (!assignment?.customColor && c.id === 'default')
                    ? "ring-2 ring-indigo-500 shadow-sm"
                    : ""
                )}
              >
                <span className="text-[11px] text-slate-800">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: VỊ TRÍ ĐẶC BIỆT */}
      {activeTab === 'special' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ← Quay lại
            </button>
            <span className="font-bold text-slate-800 text-xs">Vị trí đặc biệt</span>
          </div>

          <div className="space-y-1">
            {[
              { id: 'none', label: 'Bình thường' },
              { id: 'eyesight', label: '👁 Ưu tiên thị lực (Gần bảng)' },
              { id: 'height', label: '📏 Ưu tiên chiều cao' },
              { id: 'discipline', label: '🎯 Giáo viên theo dõi đặc biệt' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onToggleSpecial(
                    seat.id,
                    opt.id !== 'none',
                    opt.id as any,
                    opt.label
                  );
                  setActiveTab('main');
                }}
                className={cn(
                  "w-full text-left p-2 rounded-xl text-xs font-bold transition-all border",
                  (isSpecial && seat.specialType === opt.id) || (!isSpecial && opt.id === 'none')
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
