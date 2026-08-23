// ============================================================================
// SEAT LAYOUT EDITOR - VALIDATION ENGINE
// Kiểm tra tính toàn vẹn và các cảnh báo của sơ đồ chỗ ngồi
// ============================================================================

import { ClassroomLayout, EditorStudent, LayoutValidationResult, ID } from './types';

export function validateLayout(
  layout: ClassroomLayout,
  students: EditorStudent[] = []
): LayoutValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const totalSeats = Object.keys(layout.seats).length;
  const occupiedSeats = Object.keys(layout.assignments).length;
  const emptySeats = Math.max(0, totalSeats - occupiedSeats);
  
  let lockedSeats = 0;
  for (const assign of Object.values(layout.assignments)) {
    if (assign.locked) lockedSeats++;
  }

  const totalStudents = students.length;

  // 1. Kiểm tra trùng lặp học sinh (1 học sinh ngồi 2 ghế khác nhau)
  const studentCountMap = new Map<ID, { studentId: ID; studentName: string; count: number }>();
  for (const assign of Object.values(layout.assignments)) {
    const existing = studentCountMap.get(assign.studentId);
    if (existing) {
      existing.count += 1;
    } else {
      studentCountMap.set(assign.studentId, {
        studentId: assign.studentId,
        studentName: assign.studentName,
        count: 1
      });
    }
  }

  const duplicateStudents: { studentId: ID; studentName: string; count: number }[] = [];
  studentCountMap.forEach((item) => {
    if (item.count > 1) {
      duplicateStudents.push(item);
      errors.push(`Học sinh "${item.studentName}" đang được xếp ở ${item.count} vị trí khác nhau!`);
    }
  });

  // 2. Tính số lượng đã xếp và chưa xếp
  const assignedStudentIds = new Set<ID>();
  for (const assign of Object.values(layout.assignments)) {
    assignedStudentIds.add(assign.studentId);
  }

  const assignedStudentsCount = assignedStudentIds.size;
  const unassignedStudentsCount = Math.max(0, totalStudents - assignedStudentsCount);

  if (unassignedStudentsCount > 0) {
    warnings.push(`Còn ${unassignedStudentsCount} học sinh chưa được xếp vào sơ đồ.`);
  }

  if (totalSeats < totalStudents) {
    warnings.push(`Phòng học hiện chỉ có ${totalSeats} ghế, thiếu ${totalStudents - totalSeats} ghế so với sĩ số (${totalStudents} HS).`);
  }

  // 3. Kiểm tra ghế mồ côi (Seat không thuộc Table nào)
  const duplicateSeats: ID[] = [];
  for (const [seatId, seat] of Object.entries(layout.seats)) {
    if (!layout.tables[seat.tableId]) {
      errors.push(`Ghế ID "${seatId}" không thuộc bàn nào hợp lệ.`);
    }
  }

  return {
    isValid: errors.length === 0,
    totalSeats,
    occupiedSeats,
    emptySeats,
    lockedSeats,
    totalStudents,
    assignedStudentsCount,
    unassignedStudentsCount,
    duplicateStudents,
    duplicateSeats,
    warnings,
    errors
  };
}
