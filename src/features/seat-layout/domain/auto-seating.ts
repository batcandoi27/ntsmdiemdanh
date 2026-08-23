// ============================================================================
// SEAT LAYOUT EDITOR - AUTO-SEATING ALGORITHMS
// Bộ thuật toán xếp chỗ ngồi tự động thông minh CÂN BẰNG ĐỀU GIỮA CÁC TỔ
// ============================================================================

import {
  ClassroomLayout,
  EditorStudent,
  AutoSeatingOptions,
  SeatAssignment,
  ID,
  TableDef
} from './types';
import { getVietnameseSortKey } from './name-formatter';

// Fisher-Yates Shuffle cho xếp ngẫu nhiên
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ----------------------------------------------------------------------------
// Thuật toán cốt lõi: Auto-Assign Seating (Balanced Multi-Row Distribution)
// ----------------------------------------------------------------------------
export function autoAssignSeating(
  layout: ClassroomLayout,
  students: EditorStudent[],
  options: AutoSeatingOptions
): ClassroomLayout {
  const {
    strategy = 'alphabetical',
    preserveLocked = true,
    fillDirection = 'horizontal'
  } = options;

  // 1. Phân loại ghế bị khóa & học sinh đã ngồi ở ghế khóa
  const nextAssignments: Record<ID, SeatAssignment> = {};
  const lockedStudentIds = new Set<ID>();

  for (const [seatId, assign] of Object.entries(layout.assignments)) {
    if (preserveLocked && assign && assign.locked) {
      nextAssignments[seatId] = assign;
      lockedStudentIds.add(assign.studentId);
    }
  }

  // 2. Lọc ra danh sách học sinh cần xếp chỗ (loại trừ học sinh đã có ghế khóa)
  const studentsToAssign = students.filter(st => !lockedStudentIds.has(st.id));

  // 3. Sắp xếp danh sách học sinh theo chiến lược được chọn
  let sortedStudents: EditorStudent[] = [];

  if (strategy === 'alphabetical') {
    sortedStudents = [...studentsToAssign].sort((a, b) => 
      getVietnameseSortKey(a.fullName).localeCompare(getVietnameseSortKey(b.fullName), 'vi', { sensitivity: 'base' })
    );
  } else if (strategy === 'stt') {
    sortedStudents = [...studentsToAssign].sort((a, b) => {
      const sttA = a.stt ?? 999;
      const sttB = b.stt ?? 999;
      return sttA - sttB;
    });
  } else if (strategy === 'random') {
    sortedStudents = shuffleArray(studentsToAssign);
  } else if (strategy === 'alternating_gender') {
    const males = studentsToAssign.filter(st => st.gender === 'male' || st.gender === 'Nam');
    const females = studentsToAssign.filter(st => st.gender === 'female' || st.gender === 'Nữ');
    const others = studentsToAssign.filter(st => st.gender !== 'male' && st.gender !== 'Nam' && st.gender !== 'female' && st.gender !== 'Nữ');

    sortedStudents = [];
    const maxLen = Math.max(males.length, females.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < males.length) sortedStudents.push(males[i]);
      if (i < females.length) sortedStudents.push(females[i]);
    }
    sortedStudents.push(...others);
  } else {
    sortedStudents = [...studentsToAssign];
  }

  // 4. Thu thập các ghế trống theo thứ tự CÂN BẰNG TẤT CẢ CÁC TỔ
  // Sắp xếp theo Bàn 1 của tất cả các Tổ -> Bàn 2 của tất cả các Tổ -> Bàn 3...
  // Nhờ đó học sinh được chia đều vào Tổ 1, 2, 3, 4 (Round-robin horizontal sweep)
  const tablesList = Object.values(layout.tables);
  const availableSeatIds: ID[] = [];

  if (fillDirection === 'vertical') {
    // Nếu điền theo chiều dọc: Chia đều quota cho từng Tổ
    const rowMap = new Map<number, TableDef[]>();
    for (const t of tablesList) {
      const list = rowMap.get(t.row) || [];
      list.push(t);
      rowMap.set(t.row, list);
    }
    const rowKeys = Array.from(rowMap.keys()).sort((a, b) => a - b);
    const numRows = rowKeys.length || 1;
    const totalStudentsCount = sortedStudents.length;

    // Tính hạn ngạch (quota) cân bằng cho từng tổ
    const baseQuota = Math.floor(totalStudentsCount / numRows);
    const remainder = totalStudentsCount % numRows;

    rowKeys.forEach((rowKey, rIdx) => {
      const rowQuota = baseQuota + (rIdx < remainder ? 1 : 0);
      const tablesInRow = (rowMap.get(rowKey) || []).sort((a, b) => a.col - b.col);
      let seatsAddedInRow = 0;

      for (const table of tablesInRow) {
        for (const seatId of table.seatIds) {
          if (layout.seats[seatId] && !nextAssignments[seatId] && seatsAddedInRow < rowQuota) {
            availableSeatIds.push(seatId);
            seatsAddedInRow++;
          }
        }
      }
    });
  } else {
    // Mặc định Horizontal Sweep: Quét Bàn 1 của tất cả các Tổ, sau đó Bàn 2...
    const sortedTables = [...tablesList].sort((a, b) => {
      if (a.col !== b.col) return a.col - b.col;
      return a.row - b.row;
    });

    for (const table of sortedTables) {
      for (const seatId of table.seatIds) {
        if (layout.seats[seatId] && !nextAssignments[seatId]) {
          availableSeatIds.push(seatId);
        }
      }
    }
  }

  // 5. Gán học sinh vào các ghế trống
  const assignCount = Math.min(sortedStudents.length, availableSeatIds.length);
  for (let i = 0; i < assignCount; i++) {
    const st = sortedStudents[i];
    const seatId = availableSeatIds[i];

    nextAssignments[seatId] = {
      seatId,
      studentId: st.id,
      studentName: st.fullName,
      studentCode: st.code,
      gender: st.gender,
      locked: false,
      assignedAt: new Date().toISOString()
    };
  }

  return {
    ...layout,
    assignments: nextAssignments,
    version: layout.version + 1,
    updatedAt: new Date().toISOString()
  };
}
