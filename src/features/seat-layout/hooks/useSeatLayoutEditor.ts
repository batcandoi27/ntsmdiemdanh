// ============================================================================
// SEAT LAYOUT EDITOR - CUSTOM HOOK ORCHESTRATOR
// ============================================================================

import { useReducer, useState, useMemo, useCallback } from 'react';
import {
  ClassroomLayout,
  EditorStudent,
  AutoSeatingOptions,
  ClassroomGeneratorParams,
  ID,
  SeatSpecialType
} from '../domain/types';
import { editorReducer } from '../domain/reducer';
import {
  createEmptyLayout,
  generateClassroomGrid,
  assignStudent,
  swapSeats,
  unassignSeat,
  toggleLockSeat,
  toggleSpecialSeat,
  updateTablePosition,
  deleteTable,
  clearAllAssignments,
  toggleBoardPosition,
  toggleTeacherDeskSide,
  updateWindowsCount,
  addNewRow,
  addDeskToRow,
  addSeatToTable,
  deleteRow,
  updateSeatAssignmentRole,
  updateSeatAssignmentColor
} from '../domain/commands';
import { autoAssignSeating } from '../domain/auto-seating';
import { validateLayout } from '../domain/validation';
import { sortStudentsVietnamese } from '../domain/name-formatter';

export interface UseSeatLayoutEditorProps {
  initialLayout?: ClassroomLayout | null;
  students: EditorStudent[];
  classId: string;
  className?: string;
  onSave?: (layout: ClassroomLayout) => Promise<void> | void;
}

export type SelectedEntity = 
  | { type: 'table'; id: ID }
  | { type: 'seat'; id: ID }
  | { type: 'object'; id: ID }
  | null;

export type DraggedEntity =
  | { type: 'student'; student: EditorStudent }
  | { type: 'seat'; sourceSeatId: ID; studentName?: string }
  | null;

export function useSeatLayoutEditor({
  initialLayout,
  students: rawStudents = [],
  classId = '',
  className = '',
  onSave
}: UseSeatLayoutEditorProps) {
  // Sắp xếp học sinh chuẩn theo tiếng Việt
  const students = useMemo(() => {
    return sortStudentsVietnamese(rawStudents);
  }, [rawStudents]);

  // 1. Khởi tạo State với Reducer
  const initial = useMemo(() => {
    if (initialLayout && Object.keys(initialLayout.tables || {}).length > 0) {
      return initialLayout;
    }
    // Mặc định sinh sơ đồ 4 dãy x 5 bàn x 2 chỗ nếu chưa có
    return generateClassroomGrid(
      { rows: 4, tablesPerRow: 5, seatsPerTable: 2 },
      classId,
      `Sơ đồ lớp ${className || classId}`
    );
  }, [initialLayout, classId, className]);

  const [history, dispatch] = useReducer(editorReducer, {
    past: [],
    present: initial,
    future: []
  });

  const layout = history.present;

  // 2. Editor UI States
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [draggedEntity, setDraggedEntity] = useState<DraggedEntity>(null);
  const [hoverSeatId, setHoverSeatId] = useState<ID | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'view' | 'presentation'>('edit');
  const [zoom, setZoom] = useState<number>(1.0);

  // 3. Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'assigned' | 'locked'>('all');

  // 4. Modal States
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isAutoLayoutOpen, setIsAutoLayoutOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 5. Validation Result
  const validation = useMemo(() => {
    return validateLayout(layout, students);
  }, [layout, students]);

  // 6. Danh sách học sinh theo trạng thái phân bổ
  const assignedStudentMap = useMemo(() => {
    const map = new Map<ID, { seatId: ID; locked?: boolean }>();
    for (const [seatId, assign] of Object.entries(layout.assignments)) {
      map.set(assign.studentId, { seatId, locked: assign.locked });
    }
    return map;
  }, [layout.assignments]);

  // 7. Lọc danh sách học sinh theo Search & Filters
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = st.fullName.toLowerCase().includes(query);
        const matchCode = st.code?.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }

      // Gender filter
      if (genderFilter !== 'all') {
        const g = (st.gender || '').toLowerCase();
        if (genderFilter === 'male' && g !== 'male' && g !== 'nam') return false;
        if (genderFilter === 'female' && g !== 'female' && g !== 'nữ' && g !== 'nu') return false;
      }

      // Status filter
      const assignmentInfo = assignedStudentMap.get(st.id);
      if (statusFilter === 'unassigned' && assignmentInfo) return false;
      if (statusFilter === 'assigned' && !assignmentInfo) return false;
      if (statusFilter === 'locked' && (!assignmentInfo || !assignmentInfo.locked)) return false;

      return true;
    });
  }, [students, searchQuery, genderFilter, statusFilter, assignedStudentMap]);

  // --------------------------------------------------------------------------
  // ACTIONS / COMMAND HANDLERS
  // --------------------------------------------------------------------------

  const handleAssignStudent = useCallback((student: EditorStudent, targetSeatId: ID) => {
    const next = assignStudent(layout, student, targetSeatId);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
    setSelectedEntity({ type: 'seat', id: targetSeatId });
  }, [layout]);

  const handleSwapSeats = useCallback((sourceSeatId: ID, targetSeatId: ID) => {
    const next = swapSeats(layout, sourceSeatId, targetSeatId);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
    setSelectedEntity({ type: 'seat', id: targetSeatId });
  }, [layout]);

  const handleUnassignSeat = useCallback((seatId: ID) => {
    const next = unassignSeat(layout, seatId);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleToggleLock = useCallback((seatId: ID, forceLocked?: boolean) => {
    const next = toggleLockSeat(layout, seatId, forceLocked);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleToggleSpecial = useCallback((
    seatId: ID,
    isSpecial: boolean,
    specialType?: SeatSpecialType,
    specialNote?: string
  ) => {
    const next = toggleSpecialSeat(layout, seatId, isSpecial, specialType, specialNote);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleSetRole = useCallback((seatId: ID, role: import('../domain/types').StudentRole) => {
    const next = updateSeatAssignmentRole(layout, seatId, role);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleSetColor = useCallback((seatId: ID, color?: string) => {
    const next = updateSeatAssignmentColor(layout, seatId, color);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleToggleBoardPosition = useCallback(() => {
    const next = toggleBoardPosition(layout);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleToggleTeacherDeskSide = useCallback(() => {
    const next = toggleTeacherDeskSide(layout);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleUpdateWindowsCount = useCallback((left: number, right: number) => {
    const next = updateWindowsCount(layout, left, right);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleAddNewRow = useCallback(() => {
    const next = addNewRow(layout, 5, 2);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleAddDeskToRow = useCallback((rowNumber: number) => {
    const next = addDeskToRow(layout, rowNumber, 2);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleAddSeatToTable = useCallback((tableId: ID) => {
    const next = addSeatToTable(layout, tableId);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleAutoAssign = useCallback((options: AutoSeatingOptions) => {
    const next = autoAssignSeating(layout, students, options);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout, students]);

  const handleGenerateClassroom = useCallback((params: ClassroomGeneratorParams) => {
    const next = generateClassroomGrid(params, classId, `Sơ đồ lớp ${className || classId}`);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
    setIsGeneratorOpen(false);
  }, [classId, className]);

  const handleClearAll = useCallback((preserveLocked: boolean = true) => {
    const next = clearAllAssignments(layout, preserveLocked);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleUpdateTablePosition = useCallback((tableId: ID, x: number, y: number) => {
    const next = updateTablePosition(layout, tableId, x, y);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
  }, [layout]);

  const handleDeleteTable = useCallback((tableId: ID) => {
    const next = deleteTable(layout, tableId);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
    setSelectedEntity(null);
  }, [layout]);

  const handleDeleteRow = useCallback((rowNumber: number) => {
    const next = deleteRow(layout, rowNumber);
    dispatch({ type: 'COMMIT_LAYOUT', payload: next });
    setSelectedEntity(null);
  }, [layout]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(layout);
    } finally {
      setSaving(false);
    }
  }, [layout, onSave]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  return {
    // Layout State
    layout,
    students,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,

    // Selection & Drag
    selectedEntity,
    setSelectedEntity,
    draggedEntity,
    setDraggedEntity,
    hoverSeatId,
    setHoverSeatId,

    // View & Zoom
    viewMode,
    setViewMode,
    zoom,
    setZoom,

    // Search & Filter
    searchQuery,
    setSearchQuery,
    genderFilter,
    setGenderFilter,
    statusFilter,
    setStatusFilter,
    filteredStudents,
    assignedStudentMap,

    // Modals & Async
    isGeneratorOpen,
    setIsGeneratorOpen,
    isAutoLayoutOpen,
    setIsAutoLayoutOpen,
    isPrintPreviewOpen,
    setIsPrintPreviewOpen,
    saving,

    // Validation
    validation,

    // Handlers
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
    handleAddSeatToTable,
    handleDeleteRow,
    handleAutoAssign,
    handleGenerateClassroom,
    handleClearAll,
    handleUpdateTablePosition,
    handleDeleteTable,
    handleSave
  };
}
