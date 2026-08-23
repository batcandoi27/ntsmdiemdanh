// ============================================================================
// SEAT LAYOUT EDITOR - MASTER CONTAINER COMPONENT
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { ClassroomLayout, EditorStudent, ID } from '../domain/types';
import { useSeatLayoutEditor } from '../hooks/useSeatLayoutEditor';
import { EditorToolbar } from './editor-toolbar';
import { StudentSidebar } from './student-sidebar';
import { ClassroomCanvas } from './classroom-canvas';
import { ValidationBar } from './validation-bar';
import { ClassroomGeneratorModal } from './classroom-generator-modal';
import { AutoLayoutModal } from './auto-layout-modal';
import { PrintPreviewModal } from './print-preview-modal';
import toast from 'react-hot-toast';

export interface SeatLayoutEditorProps {
  initialLayout?: ClassroomLayout | null;
  students: EditorStudent[];
  classId: string;
  className?: string;
  teacherName?: string;
  onSave?: (layout: ClassroomLayout) => Promise<void> | void;
}

export const SeatLayoutEditor: React.FC<SeatLayoutEditorProps> = ({
  initialLayout,
  students: rawStudents = [],
  classId = '',
  className = '',
  teacherName = 'Giáo viên chủ nhiệm',
  onSave
}) => {
  // Sidebar states (Ẩn/Hiện & Chiều rộng có thể kéo co giãn)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seat-layout-sidebar-width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 220 && parsed <= 480) return parsed;
      }
    }
    return 300;
  });

  const handleSidebarWidthChange = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seat-layout-sidebar-width', String(newWidth));
    }
  }, []);

  const editor = useSeatLayoutEditor({
    initialLayout,
    students: rawStudents,
    classId,
    className,
    onSave: async (layout) => {
      if (onSave) {
        await onSave(layout);
        toast.success('Đã lưu Sơ đồ chỗ ngồi thành công!');
      }
    }
  });

  const {
    layout,
    students,
    canUndo,
    canRedo,
    undo,
    redo,
    selectedEntity,
    setSelectedEntity,
    draggedEntity,
    setDraggedEntity,
    hoverSeatId,
    setHoverSeatId,
    viewMode,
    setViewMode,
    zoom,
    setZoom,
    searchQuery,
    setSearchQuery,
    genderFilter,
    setGenderFilter,
    statusFilter,
    setStatusFilter,
    filteredStudents,
    assignedStudentMap,
    isGeneratorOpen,
    setIsGeneratorOpen,
    isAutoLayoutOpen,
    setIsAutoLayoutOpen,
    isPrintPreviewOpen,
    setIsPrintPreviewOpen,
    saving,
    validation,
    handleAssignStudent,
    handleSwapSeats,
    handleUnassignSeat,
    handleToggleLock,
    handleToggleSpecial,
    handleSetRole,
    handleSetColor,
    handleToggleBoardPosition,
    handleToggleTeacherDeskSide,
    handleUpdateWindowsCount,
    handleAddNewRow,
    handleAddDeskToRow,
    handleDeleteRow,
    handleClearAll,
    handleDeleteTable,
    handleSave,
    handleAutoAssign,
    handleGenerateClassroom
  } = editor;

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, handleSave]);

  // Drag & Drop Handlers from Canvas / Sidebar
  const handleDropOnSeat = useCallback((targetSeatId: ID) => {
    if (!draggedEntity) return;

    if (draggedEntity.type === 'student') {
      handleAssignStudent(draggedEntity.student, targetSeatId);
      toast.success(`Đã xếp "${draggedEntity.student.fullName}" vào ghế!`);
    } else if (draggedEntity.type === 'seat') {
      if (draggedEntity.sourceSeatId !== targetSeatId) {
        handleSwapSeats(draggedEntity.sourceSeatId, targetSeatId);
        toast.success('Đã hoán đổi vị trí chỗ ngồi!');
      }
    }

    setDraggedEntity(null);
    setHoverSeatId(null);
  }, [draggedEntity, handleAssignStudent, handleSwapSeats, setDraggedEntity, setHoverSeatId]);

  return (
    <div className="space-y-3 font-sans select-none">
      {/* 1. Thanh công cụ Toolbar */}
      <EditorToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        zoom={zoom}
        onZoomIn={() => setZoom(prev => Math.min(1.8, +(prev + 0.1).toFixed(1)))}
        onZoomOut={() => setZoom(prev => Math.max(0.6, +(prev - 0.1).toFixed(1)))}
        onResetZoom={() => setZoom(1.0)}
        boardPosition={layout.boardPosition || 'top'}
        onToggleBoardPosition={handleToggleBoardPosition}
        teacherDeskSide={layout.teacherDeskSide || 'right'}
        onToggleTeacherDeskSide={handleToggleTeacherDeskSide}
        windowCountLeft={layout.windowCountLeft !== undefined ? layout.windowCountLeft : 2}
        windowCountRight={layout.windowCountRight !== undefined ? layout.windowCountRight : 2}
        onUpdateWindowsCount={handleUpdateWindowsCount}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenAutoLayout={() => setIsAutoLayoutOpen(true)}
        onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
        onClearAll={() => {
          if (window.confirm('Bạn có chắc muốn gỡ tất cả học sinh khỏi sơ đồ? (Vị trí đã khóa sẽ được giữ lại)')) {
            handleClearAll(true);
            toast.success('Đã gỡ tất cả vị trí chưa khóa!');
          }
        }}
        onSave={handleSave}
        saving={saving}
      />

      {/* 2. Workspace: Sidebar Học Sinh (Co giãn & Ẩn/Hiện) + Canvas Phòng Học */}
      <div className="flex items-start gap-3">
        {/* Sidebar Học sinh kéo thả (ẩn khi đóng hoặc khi ở chế độ Presentation) */}
        {isSidebarOpen && viewMode !== 'presentation' && (
          <StudentSidebar
            students={filteredStudents}
            assignedStudentMap={assignedStudentMap}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            genderFilter={genderFilter}
            onGenderFilterChange={setGenderFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedStudentId={selectedEntity?.type === 'seat' ? layout.assignments[selectedEntity.id]?.studentId : undefined}
            width={sidebarWidth}
            onWidthChange={handleSidebarWidthChange}
            onSelectStudent={(st, seatId) => {
              if (seatId) {
                setSelectedEntity({ type: 'seat', id: seatId });
              }
            }}
            onDragStartStudent={(st) => {
              setDraggedEntity({ type: 'student', student: st });
            }}
            onDragEndStudent={() => {
              setDraggedEntity(null);
              setHoverSeatId(null);
            }}
          />
        )}

        {/* Canvas Phòng Học tương tác */}
        <ClassroomCanvas
          layout={layout}
          students={students}
          assignedStudentMap={assignedStudentMap}
          selectedEntity={selectedEntity}
          hoverSeatId={hoverSeatId}
          draggedEntity={draggedEntity}
          viewMode={viewMode}
          zoom={zoom}
          onSelectTable={(tId) => setSelectedEntity({ type: 'table', id: tId })}
          onSelectSeat={(sId) => setSelectedEntity({ type: 'seat', id: sId })}
          onAssignStudent={handleAssignStudent}
          onSwapSeats={handleSwapSeats}
          onUnassignSeat={handleUnassignSeat}
          onToggleLockSeat={handleToggleLock}
          onToggleSpecialSeat={handleToggleSpecial}
          onSetRole={handleSetRole}
          onSetColor={handleSetColor}
          onDeleteTable={handleDeleteTable}
          onDeleteRow={handleDeleteRow}
          onAddDeskToRow={handleAddDeskToRow}
          onAddNewRow={handleAddNewRow}
          onDragStartSeat={(seatId, studentName) => {
            setDraggedEntity({ type: 'seat', sourceSeatId: seatId, studentName });
          }}
          onDragOverSeat={(seatId) => setHoverSeatId(seatId)}
          onDragLeaveSeat={() => setHoverSeatId(null)}
          onDropSeat={handleDropOnSeat}
          onClearSelection={() => setSelectedEntity(null)}
        />
      </div>

      {/* 3. Validation Status Bar */}
      <ValidationBar validation={validation} />

      {/* 4. Modals */}
      <ClassroomGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onGenerate={(params) => {
          handleGenerateClassroom(params);
          toast.success('Đã tạo cấu trúc phòng học mới!');
        }}
      />

      <AutoLayoutModal
        isOpen={isAutoLayoutOpen}
        onClose={() => setIsAutoLayoutOpen(false)}
        layout={layout}
        students={students}
        onApply={(opts) => {
          handleAutoAssign(opts);
          toast.success('Đã xếp chỗ tự động thành công!');
        }}
      />

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        layout={layout}
        className={className}
        teacherName={teacherName}
        totalStudents={students.length}
      />
    </div>
  );
};
