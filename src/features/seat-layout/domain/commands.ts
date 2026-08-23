// ============================================================================
// SEAT LAYOUT EDITOR - DOMAIN COMMANDS (Pure Immutable Logic)
// Các hàm nghiệp vụ thuần túy không phụ thuộc vào React Component
// ============================================================================

import {
  ClassroomLayout,
  TableDef,
  SeatDef,
  ClassroomObject,
  SeatAssignment,
  EditorStudent,
  ClassroomGeneratorParams,
  ID
} from './types';

// Helper tạo ID duy nhất
export function generateId(prefix: string = 'id'): ID {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// ----------------------------------------------------------------------------
// 1. Khởi tạo Layout rỗng
// ----------------------------------------------------------------------------
export function createEmptyLayout(classId: string = '', name: string = 'Sơ đồ lớp học'): ClassroomLayout {
  return {
    id: generateId('layout'),
    classId,
    name,
    dimensions: { width: 1100, height: 750 },
    orientation: 'front_top',
    tables: {},
    seats: {},
    objects: {},
    assignments: {},
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 2. Generator: Sinh sơ đồ phòng học tự động theo dãy & bàn
// ----------------------------------------------------------------------------
export function generateClassroomGrid(
  params: ClassroomGeneratorParams,
  classId: string = '',
  name: string = 'Sơ đồ lớp học'
): ClassroomLayout {
  const {
    rows = 4,
    tablesPerRow = 5,
    seatsPerTable = 2,
    tableSpacingX = 40,
    tableSpacingY = 32,
    includeBoard = true,
    includeTeacherDesk = true,
    includeDoors = true,
    includeWindows = true
  } = params;

  // Kích thước bàn dựa theo số chỗ ngồi
  let tableWidth = 140;
  let tableHeight = 60;

  if (seatsPerTable === 1) {
    tableWidth = 85;
    tableHeight = 55;
  } else if (seatsPerTable === 2) {
    tableWidth = 150;
    tableHeight = 60;
  } else if (seatsPerTable === 3) {
    tableWidth = 210;
    tableHeight = 60;
  } else if (seatsPerTable === 4) {
    tableWidth = 160;
    tableHeight = 90;
  } else if (seatsPerTable === 6) {
    tableWidth = 220;
    tableHeight = 90;
  }

  // Tọa độ bắt đầu
  const startX = 140;
  const startY = 160;

  const tables: Record<ID, TableDef> = {};
  const seats: Record<ID, SeatDef> = {};
  const objects: Record<ID, ClassroomObject> = {};

  // 1. Thêm Bảng & Bàn Giáo Viên
  if (includeBoard) {
    const boardId = generateId('obj_board');
    const totalWidth = rows * tableWidth + (rows - 1) * tableSpacingX;
    objects[boardId] = {
      id: boardId,
      type: 'board',
      name: 'BẢNG CHÍNH LỚP HỌC',
      x: startX + (totalWidth - 360) / 2,
      y: 25,
      width: 360,
      height: 28,
      rotation: 0,
      locked: true
    };
  }

  if (includeTeacherDesk) {
    const deskId = generateId('obj_teacher');
    objects[deskId] = {
      id: deskId,
      type: 'teacher_desk',
      name: 'BÀN GIÁO VIÊN',
      x: startX + 20,
      y: 75,
      width: 100,
      height: 48,
      rotation: 0,
      locked: false
    };
  }

  // 2. Thêm Cửa ra vào & Cửa sổ
  if (includeDoors) {
    const door1Id = generateId('obj_door_front');
    objects[door1Id] = {
      id: door1Id,
      type: 'door_main',
      name: 'CỬA CHÍNH (TRƯỚC)',
      x: 20,
      y: 35,
      width: 48,
      height: 80,
      rotation: 0,
      locked: true
    };

    const totalHeight = tablesPerRow * tableHeight + (tablesPerRow - 1) * tableSpacingY;
    const door2Id = generateId('obj_door_back');
    objects[door2Id] = {
      id: door2Id,
      type: 'door_sub',
      name: 'CỬA SAU',
      x: 20,
      y: startY + totalHeight - 60,
      width: 48,
      height: 80,
      rotation: 0,
      locked: true
    };
  }

  if (includeWindows) {
    const totalHeight = tablesPerRow * tableHeight + (tablesPerRow - 1) * tableSpacingY;
    const totalWidth = rows * tableWidth + (rows - 1) * tableSpacingX;
    const win1Id = generateId('obj_win_1');
    objects[win1Id] = {
      id: win1Id,
      type: 'window',
      name: 'CỬA SỔ 1',
      x: startX + totalWidth + 40,
      y: 120,
      width: 24,
      height: 90,
      rotation: 0,
      locked: true
    };

    const win2Id = generateId('obj_win_2');
    objects[win2Id] = {
      id: win2Id,
      type: 'window',
      name: 'CỬA SỔ 2',
      x: startX + totalWidth + 40,
      y: 320,
      width: 24,
      height: 90,
      rotation: 0,
      locked: true
    };
  }

  // 3. Sinh các Dãy bàn & Ghế ngồi
  for (let r = 0; r < rows; r++) {
    for (let t = 0; t < tablesPerRow; t++) {
      const tableId = generateId(`tbl_r${r + 1}_t${t + 1}`);
      const tableX = startX + r * (tableWidth + tableSpacingX);
      const tableY = startY + t * (tableHeight + tableSpacingY);

      const seatIds: ID[] = [];

      for (let s = 0; s < seatsPerTable; s++) {
        const seatId = generateId(`seat_${tableId}_s${s + 1}`);
        seatIds.push(seatId);

        let relativeX = 0;
        let relativeY = 0;

        if (seatsPerTable === 1) {
          relativeX = 0.5;
          relativeY = 0.5;
        } else if (seatsPerTable === 2) {
          relativeX = s === 0 ? 0.25 : 0.75;
          relativeY = 0.5;
        } else if (seatsPerTable === 3) {
          relativeX = (s + 0.5) / 3;
          relativeY = 0.5;
        } else if (seatsPerTable === 4) {
          relativeX = (s % 2 === 0) ? 0.25 : 0.75;
          relativeY = s < 2 ? 0.3 : 0.7;
        } else if (seatsPerTable === 6) {
          relativeX = ((s % 3) + 0.5) / 3;
          relativeY = s < 3 ? 0.3 : 0.7;
        }

        const seatLabel = seatsPerTable === 2
          ? (s === 0 ? 'A' : 'B')
          : `${s + 1}`;

        seats[seatId] = {
          id: seatId,
          tableId,
          seatNumber: s + 1,
          label: seatLabel,
          relativeX,
          relativeY,
          isSpecial: false
        };
      }

      tables[tableId] = {
        id: tableId,
        name: `Bàn ${t + 1}`,
        row: r + 1,
        col: t + 1,
        shape: 'rectangular',
        x: tableX,
        y: tableY,
        width: tableWidth,
        height: tableHeight,
        seatsCount: seatsPerTable,
        seatIds,
        rotation: 0,
        locked: false
      };
    }
  }

  const canvasWidth = Math.max(1100, startX + rows * (tableWidth + tableSpacingX) + 120);
  const canvasHeight = Math.max(750, startY + tablesPerRow * (tableHeight + tableSpacingY) + 80);

  return {
    id: generateId('layout'),
    classId,
    name,
    dimensions: { width: canvasWidth, height: canvasHeight },
    orientation: 'front_top',
    tables,
    seats,
    objects,
    assignments: {},
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 3. Gán học sinh vào một ghế (Assign Student)
// ----------------------------------------------------------------------------
export function assignStudent(
  layout: ClassroomLayout,
  student: EditorStudent,
  targetSeatId: ID
): ClassroomLayout {
  if (!layout.seats[targetSeatId]) return layout;

  const nextAssignments = { ...layout.assignments };

  // 1. Nếu học sinh này đang ngồi ở ghế khác -> giải phóng ghế cũ
  for (const [seatId, assignment] of Object.entries(nextAssignments)) {
    if (assignment.studentId === student.id && seatId !== targetSeatId) {
      delete nextAssignments[seatId];
    }
  }

  // 2. Gán học sinh vào ghế mới (giữ lại locked flag nếu ghế đã có sẵn)
  const existingAssignment = nextAssignments[targetSeatId];
  nextAssignments[targetSeatId] = {
    seatId: targetSeatId,
    studentId: student.id,
    studentName: student.fullName,
    studentCode: student.code,
    gender: student.gender,
    locked: existingAssignment ? existingAssignment.locked : false,
    assignedAt: new Date().toISOString()
  };

  return {
    ...layout,
    assignments: nextAssignments,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 4. Hoán đổi vị trí giữa 2 ghế (Swap Seats) - Nguyên tử & An toàn 100%
// ----------------------------------------------------------------------------
export function swapSeats(
  layout: ClassroomLayout,
  sourceSeatId: ID,
  targetSeatId: ID
): ClassroomLayout {
  if (sourceSeatId === targetSeatId) return layout;
  if (!layout.seats[sourceSeatId] || !layout.seats[targetSeatId]) return layout;

  const nextAssignments = { ...layout.assignments };
  const sourceAssign = nextAssignments[sourceSeatId];
  const targetAssign = nextAssignments[targetSeatId];

  // Trường hợp 1: Cả 2 đều có học sinh -> Đổi chỗ qua lại
  if (sourceAssign && targetAssign) {
    nextAssignments[sourceSeatId] = {
      ...targetAssign,
      seatId: sourceSeatId
    };
    nextAssignments[targetSeatId] = {
      ...sourceAssign,
      seatId: targetSeatId
    };
  }
  // Trường hợp 2: Ghế nguồn có học sinh, ghế đích trống -> Chuyển sang ghế đích
  else if (sourceAssign && !targetAssign) {
    delete nextAssignments[sourceSeatId];
    nextAssignments[targetSeatId] = {
      ...sourceAssign,
      seatId: targetSeatId
    };
  }
  // Trường hợp 3: Ghế đích có học sinh, ghế nguồn trống -> Chuyển sang ghế nguồn
  else if (!sourceAssign && targetAssign) {
    delete nextAssignments[targetSeatId];
    nextAssignments[sourceSeatId] = {
      ...targetAssign,
      seatId: sourceSeatId
    };
  }
  // Cả 2 trống -> Không làm gì
  else {
    return layout;
  }

  return {
    ...layout,
    assignments: nextAssignments,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 5. Giải phóng ghế (Unassign Seat)
// ----------------------------------------------------------------------------
export function unassignSeat(layout: ClassroomLayout, seatId: ID): ClassroomLayout {
  if (!layout.assignments[seatId]) return layout;

  const nextAssignments = { ...layout.assignments };
  delete nextAssignments[seatId];

  return {
    ...layout,
    assignments: nextAssignments,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 6. Khóa / Mở khóa vị trí ghế (Toggle Lock Seat)
// ----------------------------------------------------------------------------
export function toggleLockSeat(
  layout: ClassroomLayout,
  seatId: ID,
  forceLocked?: boolean
): ClassroomLayout {
  const assignment = layout.assignments[seatId];
  if (!assignment) return layout;

  const newLocked = forceLocked !== undefined ? forceLocked : !assignment.locked;

  return {
    ...layout,
    assignments: {
      ...layout.assignments,
      [seatId]: {
        ...assignment,
        locked: newLocked
      }
    },
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 7. Đánh dấu vị trí đặc biệt (Toggle Special Seat)
// ----------------------------------------------------------------------------
export function toggleSpecialSeat(
  layout: ClassroomLayout,
  seatId: ID,
  isSpecial: boolean,
  specialType?: any,
  specialNote?: string
): ClassroomLayout {
  const seat = layout.seats[seatId];
  if (!seat) return layout;

  return {
    ...layout,
    seats: {
      ...layout.seats,
      [seatId]: {
        ...seat,
        isSpecial,
        specialType: specialType || 'eyesight',
        specialNote: specialNote || ''
      }
    },
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 8. Cập nhật vị trí bàn (Update Table Position)
// ----------------------------------------------------------------------------
export function updateTablePosition(
  layout: ClassroomLayout,
  tableId: ID,
  x: number,
  y: number
): ClassroomLayout {
  const table = layout.tables[tableId];
  if (!table) return layout;

  return {
    ...layout,
    tables: {
      ...layout.tables,
      [tableId]: {
        ...table,
        x: Math.max(0, x),
        y: Math.max(0, y)
      }
    },
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 9. Xóa Bàn (Delete Table & clean associated seats, tự động reindex)
// ----------------------------------------------------------------------------
export function deleteTable(layout: ClassroomLayout, tableId: ID): ClassroomLayout {
  const table = layout.tables[tableId];
  if (!table) return layout;

  const nextTables = { ...layout.tables };
  const nextSeats = { ...layout.seats };
  const nextAssignments = { ...layout.assignments };

  // Xóa các ghế và gán chỗ thuộc bàn này
  for (const seatId of table.seatIds) {
    delete nextSeats[seatId];
    delete nextAssignments[seatId];
  }

  delete nextTables[tableId];

  const updatedLayout = {
    ...layout,
    tables: nextTables,
    seats: nextSeats,
    assignments: nextAssignments,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };

  // Tự động đánh số lại các bàn và dãy liên tục không bị nhảy cóc
  return reindexClassroomLayout(updatedLayout);
}

// ----------------------------------------------------------------------------
// 9.1. Chuẩn hóa & Đánh lại số thứ tự Dãy và Bàn (Auto Re-indexing Invariant)
// ----------------------------------------------------------------------------
export function reindexClassroomLayout(layout: ClassroomLayout): ClassroomLayout {
  const rowMap = new Map<number, TableDef[]>();
  for (const table of Object.values(layout.tables)) {
    const list = rowMap.get(table.row) || [];
    list.push(table);
    rowMap.set(table.row, list);
  }

  const sortedRowKeys = Array.from(rowMap.keys()).sort((a, b) => a - b);
  const nextTables: Record<ID, TableDef> = {};

  sortedRowKeys.forEach((oldRowNum, rowIdx) => {
    const newRowNum = rowIdx + 1;
    const tablesInRow = (rowMap.get(oldRowNum) || []).sort((a, b) => a.col - b.col);

    tablesInRow.forEach((table, colIdx) => {
      const newColNum = colIdx + 1;
      nextTables[table.id] = {
        ...table,
        row: newRowNum,
        col: newColNum,
        name: `Bàn ${newColNum}`
      };
    });
  });

  return {
    ...layout,
    tables: nextTables,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 9.2. Xóa toàn bộ 1 Dãy / Tổ (Delete Row & auto-reindex)
// ----------------------------------------------------------------------------
export function deleteRow(layout: ClassroomLayout, rowNumber: number): ClassroomLayout {
  const nextTables: Record<ID, TableDef> = {};
  const nextSeats = { ...layout.seats };
  const nextAssignments = { ...layout.assignments };

  for (const [tableId, table] of Object.entries(layout.tables)) {
    if (table.row === rowNumber) {
      for (const seatId of table.seatIds) {
        delete nextSeats[seatId];
        delete nextAssignments[seatId];
      }
    } else {
      nextTables[tableId] = table;
    }
  }

  const updatedLayout = {
    ...layout,
    tables: nextTables,
    seats: nextSeats,
    assignments: nextAssignments,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };

  return reindexClassroomLayout(updatedLayout);
}

// ----------------------------------------------------------------------------
// 10. Xóa toàn bộ học sinh khỏi sơ đồ (Clear All Assignments)
// ----------------------------------------------------------------------------
export function clearAllAssignments(layout: ClassroomLayout, preserveLocked: boolean = true): ClassroomLayout {
  const nextAssignments: Record<ID, SeatAssignment> = {};

  if (preserveLocked) {
    for (const [seatId, assign] of Object.entries(layout.assignments)) {
      if (assign.locked) {
        nextAssignments[seatId] = assign;
      }
    }
  }

  return {
    ...layout,
    assignments: nextAssignments,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 11. Đảo ngược 180° phòng học (Bảng chuyển lên trên / xuống dưới)
// ----------------------------------------------------------------------------
export function toggleBoardPosition(layout: ClassroomLayout): ClassroomLayout {
  const current = layout.boardPosition || 'top';
  const nextPos: 'top' | 'bottom' = current === 'top' ? 'bottom' : 'top';

  return {
    ...layout,
    boardPosition: nextPos,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 12. Hoán đổi vị trí Bàn Giáo Viên & Cửa Trước (Đổi bên Trái / Phải)
// ----------------------------------------------------------------------------
export function toggleTeacherDeskSide(layout: ClassroomLayout): ClassroomLayout {
  const current = layout.teacherDeskSide || 'right';
  const nextSide: 'left' | 'right' = current === 'right' ? 'left' : 'right';

  return {
    ...layout,
    teacherDeskSide: nextSide,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 13. Cập nhật số lượng Cửa sổ Trái / Phải
// ----------------------------------------------------------------------------
export function updateWindowsCount(
  layout: ClassroomLayout,
  leftCount: number,
  rightCount: number
): ClassroomLayout {
  return {
    ...layout,
    windowCountLeft: Math.max(0, Math.min(6, leftCount)),
    windowCountRight: Math.max(0, Math.min(6, rightCount)),
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 14. Thêm Dãy Bàn Mới (Add New Row/Column of Desks)
// ----------------------------------------------------------------------------
export function addNewRow(
  layout: ClassroomLayout,
  tablesCount: number = 5,
  seatsPerTable: number = 2
): ClassroomLayout {
  const existingRows = Object.values(layout.tables).map(t => t.row);
  const maxRow = existingRows.length > 0 ? Math.max(...existingRows) : 0;
  const newRowNum = maxRow + 1;

  const nextTables = { ...layout.tables };
  const nextSeats = { ...layout.seats };

  for (let c = 1; c <= tablesCount; c++) {
    const tableId = generateId(`tbl_r${newRowNum}_c${c}`);
    const seatIds: ID[] = [];

    for (let s = 1; s <= seatsPerTable; s++) {
      const seatId = generateId(`seat_r${newRowNum}_c${c}_s${s}`);
      const label = s === 1 ? 'A' : s === 2 ? 'B' : s === 3 ? 'C' : s === 4 ? 'D' : `${s}`;
      
      nextSeats[seatId] = {
        id: seatId,
        tableId,
        seatNumber: s,
        label,
        relativeX: (s - 1) * 75,
        relativeY: 0
      };
      seatIds.push(seatId);
    }

    nextTables[tableId] = {
      id: tableId,
      name: `Bàn ${c}`,
      row: newRowNum,
      col: c,
      shape: 'rectangular',
      x: 0,
      y: 0,
      width: seatsPerTable * 80,
      height: 90,
      seatsCount: seatsPerTable,
      seatIds
    };
  }

  return reindexClassroomLayout({
    ...layout,
    tables: nextTables,
    seats: nextSeats,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  });
}

// ----------------------------------------------------------------------------
// 15. Thêm Bàn vào cuối Dãy (Add Desk to Row)
// ----------------------------------------------------------------------------
export function addDeskToRow(
  layout: ClassroomLayout,
  rowNumber: number,
  seatsCount: number = 2
): ClassroomLayout {
  const tablesInRow = Object.values(layout.tables).filter(t => t.row === rowNumber);
  const maxCol = tablesInRow.length > 0 ? Math.max(...tablesInRow.map(t => t.col)) : 0;
  const newColNum = maxCol + 1;

  const tableId = generateId(`tbl_r${rowNumber}_c${newColNum}`);
  const nextTables = { ...layout.tables };
  const nextSeats = { ...layout.seats };
  const seatIds: ID[] = [];

  for (let s = 1; s <= seatsCount; s++) {
    const seatId = generateId(`seat_r${rowNumber}_c${newColNum}_s${s}`);
    const label = s === 1 ? 'A' : s === 2 ? 'B' : s === 3 ? 'C' : s === 4 ? 'D' : `${s}`;

    nextSeats[seatId] = {
      id: seatId,
      tableId,
      seatNumber: s,
      label,
      relativeX: (s - 1) * 75,
      relativeY: 0
    };
    seatIds.push(seatId);
  }

  nextTables[tableId] = {
    id: tableId,
    name: `Bàn ${newColNum}`,
    row: rowNumber,
    col: newColNum,
    shape: 'rectangular',
    x: 0,
    y: 0,
    width: seatsCount * 80,
    height: 90,
    seatsCount,
    seatIds
  };

  return reindexClassroomLayout({
    ...layout,
    tables: nextTables,
    seats: nextSeats,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  });
}

// ----------------------------------------------------------------------------
// 16. Thêm Ghế vào Bàn (Add Seat to Table)
// ----------------------------------------------------------------------------
export function addSeatToTable(layout: ClassroomLayout, tableId: ID): ClassroomLayout {
  const table = layout.tables[tableId];
  if (!table || table.seatsCount >= 6) return layout;

  const newSeatNumber = table.seatsCount + 1;
  const seatId = generateId(`seat_t${table.row}_${table.col}_s${newSeatNumber}`);
  const label = newSeatNumber === 1 ? 'A' : newSeatNumber === 2 ? 'B' : newSeatNumber === 3 ? 'C' : newSeatNumber === 4 ? 'D' : newSeatNumber === 5 ? 'E' : 'F';

  const nextSeats = {
    ...layout.seats,
    [seatId]: {
      id: seatId,
      tableId,
      seatNumber: newSeatNumber,
      label,
      relativeX: (newSeatNumber - 1) * 75,
      relativeY: 0
    }
  };

  const nextTables = {
    ...layout.tables,
    [tableId]: {
      ...table,
      seatsCount: newSeatNumber,
      seatIds: [...table.seatIds, seatId],
      width: newSeatNumber * 80
    }
  };

  return {
    ...layout,
    tables: nextTables,
    seats: nextSeats,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 17. Cập nhật Chức Vụ Ban Cán Sự cho Ghế
// ----------------------------------------------------------------------------
export function updateSeatAssignmentRole(
  layout: ClassroomLayout,
  seatId: ID,
  role: import('./types').StudentRole
): ClassroomLayout {
  const assign = layout.assignments[seatId];
  if (!assign) return layout;

  return {
    ...layout,
    assignments: {
      ...layout.assignments,
      [seatId]: {
        ...assign,
        role
      }
    },
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// 18. Cập nhật Màu sắc Tùy Chỉnh cho Ghế
// ----------------------------------------------------------------------------
export function updateSeatAssignmentColor(
  layout: ClassroomLayout,
  seatId: ID,
  color?: string
): ClassroomLayout {
  const assign = layout.assignments[seatId];
  if (!assign) return layout;

  return {
    ...layout,
    assignments: {
      ...layout.assignments,
      [seatId]: {
        ...assign,
        customColor: color
      }
    },
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}
