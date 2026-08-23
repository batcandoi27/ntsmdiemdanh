// ============================================================================
// SEAT LAYOUT EDITOR - TOOLBAR COMPONENT
// ============================================================================

import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Sparkles,
  Grid,
  Printer,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Edit3,
  RefreshCw,
  ArrowLeftRight,
  AppWindow,
  Settings2,
  Users,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewMode: 'edit' | 'view' | 'presentation';
  onViewModeChange: (mode: 'edit' | 'view' | 'presentation') => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  boardPosition?: 'top' | 'bottom';
  onToggleBoardPosition?: () => void;
  teacherDeskSide?: 'left' | 'right';
  onToggleTeacherDeskSide?: () => void;
  windowCountLeft?: number;
  windowCountRight?: number;
  onUpdateWindowsCount?: (left: number, right: number) => void;
  onOpenGenerator: () => void;
  onOpenAutoLayout: () => void;
  onOpenPrintPreview: () => void;
  onClearAll: () => void;
  onSave: () => void;
  saving?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewMode,
  onViewModeChange,
  isSidebarOpen = true,
  onToggleSidebar,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  boardPosition = 'top',
  onToggleBoardPosition,
  teacherDeskSide = 'right',
  onToggleTeacherDeskSide,
  windowCountLeft = 2,
  windowCountRight = 2,
  onUpdateWindowsCount,
  onOpenGenerator,
  onOpenAutoLayout,
  onOpenPrintPreview,
  onClearAll,
  onSave,
  saving = false
}) => {
  const [isWindowMenuOpen, setIsWindowMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3 font-sans">
      {/* 1. Nhóm Lịch sử Undo / Redo & Chế độ xem & Bật/tắt Sidebar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Nút Ẩn / Hiện Sidebar Học Sinh */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Ẩn danh sách học sinh" : "Hiện danh sách học sinh"}
            className={cn(
              "px-3 py-2 rounded-2xl border text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs",
              isSidebarOpen
                ? "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
            )}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5 text-indigo-600" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{isSidebarOpen ? "Ẩn DS Học Sinh" : "Hiện DS Học Sinh"}</span>
          </button>
        )}

        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Hoàn tác (Ctrl+Z)"
            className={cn(
              "p-2 rounded-xl text-slate-700 transition-colors flex items-center gap-1 text-xs font-bold",
              canUndo ? "hover:bg-white hover:text-slate-950 shadow-2xs" : "opacity-40 cursor-not-allowed"
            )}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hoàn tác</span>
          </button>

          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Làm lại (Ctrl+Y)"
            className={cn(
              "p-2 rounded-xl text-slate-700 transition-colors flex items-center gap-1 text-xs font-bold",
              canRedo ? "hover:bg-white hover:text-slate-950 shadow-2xs" : "opacity-40 cursor-not-allowed"
            )}
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm lại</span>
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => onViewModeChange('edit')}
            className={cn(
              "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5",
              viewMode === 'edit' ? "bg-white text-indigo-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Chỉnh sửa</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('view')}
            className={cn(
              "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5",
              viewMode === 'view' ? "bg-white text-indigo-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem</span>
          </button>
        </div>
      </div>

      {/* 2. Nhóm Định hướng & Cấu trúc phòng học */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Nút Đảo 180° */}
        {onToggleBoardPosition && (
          <button
            type="button"
            onClick={onToggleBoardPosition}
            title="Đảo ngược 180° vị trí phòng học (Bảng chuyển lên đầu / xuống cuối)"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Đảo 180° ({boardPosition === 'top' ? 'Bảng Đầu' : 'Bảng Đuôi'})</span>
          </button>
        )}

        {/* Nút Đổi bên Bàn GV ↔ Cửa */}
        {onToggleTeacherDeskSide && (
          <button
            type="button"
            onClick={onToggleTeacherDeskSide}
            title="Đổi bên Bàn Giáo Viên sang Trái hoặc Phải"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors shadow-2xs"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
            <span>Bàn GV: {teacherDeskSide === 'right' ? 'Bên Phải' : 'Bên Trái'}</span>
          </button>
        )}

        {/* Cấu hình số lượng Cửa sổ */}
        {onUpdateWindowsCount && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWindowMenuOpen(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors shadow-2xs"
            >
              <AppWindow className="w-3.5 h-3.5 text-sky-600" />
              <span>Cửa sổ ({windowCountLeft}L / {windowCountRight}R)</span>
            </button>

            {isWindowMenuOpen && (
              <div className="absolute top-full mt-2 left-0 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-2.5 min-w-[200px] text-xs animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Tường Trái:</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onUpdateWindowsCount(n, windowCountRight)}
                        className={cn(
                          "w-6 h-6 rounded-lg font-black text-xs transition-colors",
                          windowCountLeft === n ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Tường Phải:</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onUpdateWindowsCount(windowCountLeft, n)}
                        className={cn(
                          "w-6 h-6 rounded-lg font-black text-xs transition-colors",
                          windowCountRight === n ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Nhóm Chức năng Sinh sơ đồ & Tự động xếp chỗ */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onOpenGenerator}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors shadow-2xs"
          title="Tạo sơ đồ lớp theo số dãy và số bàn"
        >
          <Grid className="w-3.5 h-3.5 text-indigo-600" />
          <span>Tạo Cấu Trúc</span>
        </button>

        <button
          type="button"
          onClick={onOpenAutoLayout}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          title="Mở trợ lý xếp chỗ tự động đa tiêu chí"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Xếp Chỗ Tự Động</span>
        </button>

        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
          title="Gỡ toàn bộ học sinh (giữ nguyên vị trí khóa)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Gỡ tất cả</span>
        </button>
      </div>

      {/* 4. Nhóm Zoom & In ấn & Lưu */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Zoom */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={onZoomOut}
            title="Thu nhỏ"
            className="p-1.5 rounded-xl text-slate-600 hover:bg-white transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-black text-slate-700 px-1 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            title="Phóng to"
            className="p-1.5 rounded-xl text-slate-600 hover:bg-white transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            title="Đặt lại 100%"
            className="p-1.5 rounded-xl text-slate-600 hover:bg-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* In ấn (PDF / A4) */}
        <button
          type="button"
          onClick={onOpenPrintPreview}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-black text-xs border border-indigo-200 transition-colors shadow-2xs"
          title="Xem trước và xuất file in A4 PDF rõ đẹp"
        >
          <Printer className="w-3.5 h-3.5 text-indigo-600" />
          <span>In Sơ Đồ (A4)</span>
        </button>

        {/* Lưu */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Lưu Sơ Đồ'}</span>
        </button>
      </div>
    </div>
  );
};
