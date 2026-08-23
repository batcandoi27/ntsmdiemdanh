// ============================================================================
// SEAT LAYOUT EDITOR - CLASSROOM GENERATOR MODAL
// Wizard tạo nhanh cấu trúc phòng học theo số dãy, số bàn & số học sinh/bàn
// ============================================================================

import React, { useState } from 'react';
import { ClassroomGeneratorParams } from '../domain/types';
import { Grid, X, Check, Sparkles } from 'lucide-react';

export interface ClassroomGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: ClassroomGeneratorParams) => void;
  currentRows?: number;
  currentTablesPerRow?: number;
  currentSeatsPerTable?: number;
}

export const ClassroomGeneratorModal: React.FC<ClassroomGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  currentRows = 4,
  currentTablesPerRow = 5,
  currentSeatsPerTable = 2
}) => {
  const [rows, setRows] = useState<number>(currentRows);
  const [tablesPerRow, setTablesPerRow] = useState<number>(currentTablesPerRow);
  const [seatsPerTable, setSeatsPerTable] = useState<number>(currentSeatsPerTable);
  const [includeBoard, setIncludeBoard] = useState(true);
  const [includeTeacherDesk, setIncludeTeacherDesk] = useState(true);
  const [includeDoors, setIncludeDoors] = useState(true);
  const [includeWindows, setIncludeWindows] = useState(true);

  if (!isOpen) return null;

  const totalSeats = rows * tablesPerRow * seatsPerTable;
  const totalTables = rows * tablesPerRow;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      rows,
      tablesPerRow,
      seatsPerTable,
      includeBoard,
      includeTeacherDesk,
      includeDoors,
      includeWindows
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                Tạo Cấu Trúc Lớp Học
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Tùy chỉnh số dãy bàn và số chỗ ngồi linh hoạt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Số dãy bàn */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số dãy bàn (Hàng dọc):
              </label>
              <select
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 4)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} dãy bàn</option>
                ))}
              </select>
            </div>

            {/* Số bàn mỗi dãy */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số bàn mỗi dãy:
              </label>
              <select
                value={tablesPerRow}
                onChange={(e) => setTablesPerRow(parseInt(e.target.value) || 5)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n} bàn</option>
                ))}
              </select>
            </div>
          </div>

          {/* Số học sinh mỗi bàn */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Kiểu bàn (Số học sinh / bàn):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: 1, label: 'Bàn đơn (1 HS)' },
                { val: 2, label: 'Bàn đôi (2 HS)' },
                { val: 3, label: 'Bàn 3 HS' },
                { val: 4, label: 'Bàn ghép (4 HS)' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSeatsPerTable(opt.val)}
                  className={`p-2 rounded-2xl border text-xs font-bold transition-all text-center ${
                    seatsPerTable === opt.val
                      ? 'bg-indigo-50 text-indigo-900 border-indigo-400 ring-2 ring-indigo-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tổng kết sức chứa */}
          <div className="bg-indigo-50/70 rounded-2xl p-3 border border-indigo-200/80 flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-900">Tổng sức chứa sơ đồ:</span>
            <span className="font-black text-indigo-700 text-sm">
              {totalTables} bàn • {totalSeats} chỗ ngồi
            </span>
          </div>

          {/* Các vật thể bổ trợ */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
              Vật thể trong phòng học:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBoard}
                  onChange={(e) => setIncludeBoard(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Bảng chính lớp học</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTeacherDesk}
                  onChange={(e) => setIncludeTeacherDesk(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Bàn giáo viên</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDoors}
                  onChange={(e) => setIncludeDoors(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Cửa trước & Cửa sau</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWindows}
                  onChange={(e) => setIncludeWindows(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Cửa sổ</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Tạo Sơ Đồ Ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
