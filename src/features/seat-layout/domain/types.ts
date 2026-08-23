// ============================================================================
// SEAT LAYOUT EDITOR - DOMAIN TYPES
// Hệ thống định nghĩa dữ liệu cho Sơ đồ chỗ ngồi lớp học thông minh
// ============================================================================

export type ID = string;

export type Gender = 'male' | 'female' | 'other' | 'unknown';

export type TableShape = 'rectangular' | 'round' | 'irregular';

export type SeatSpecialType = 'none' | 'eyesight' | 'height' | 'special_needs' | 'discipline' | 'assigned_by_teacher';

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

// ----------------------------------------------------------------------------
// 1. Seat Definition
// ----------------------------------------------------------------------------
export interface SeatDef {
  id: ID;
  tableId: ID;
  seatNumber: number; // 1, 2, 3, 4... trong bàn
  label?: string; // "A", "B", "1", "2"
  relativeX: number; // vị trí tương đối trong bàn (px hoặc %)
  relativeY: number;
  isSpecial?: boolean;
  specialType?: SeatSpecialType;
  specialNote?: string;
}

// ----------------------------------------------------------------------------
// 2. Table Definition
// ----------------------------------------------------------------------------
export interface TableDef {
  id: ID;
  name: string; // "Dãy 1 - Bàn 1", "Bàn 1A"...
  row: number; // Tọa độ hàng logic (1-based)
  col: number; // Tọa độ cột logic (1-based)
  shape: TableShape;
  x: number; // Tọa độ pixel trên canvas
  y: number;
  width: number;
  height: number;
  seatsCount: number; // 1, 2, 3, 4, 6...
  seatIds: ID[]; // Danh sách ID các ghế thuộc bàn này
  rotation?: number; // 0, 90, 180, 270
  locked?: boolean;
}

export type StudentRole = 
  | 'monitor'          // 👑 Lớp trưởng
  | 'vice_academic'    // 📚 Phó học tập
  | 'vice_discipline'  // ⚖️ Phó kỷ luật
  | 'vice_activity'    // 🎨 Phó phong trào
  | 'group_leader'     // 🚩 Tổ trưởng
  | 'group_vice'       // 🏳️ Tổ phó
  | 'treasurer'        // 💰 Thủ quỹ
  | 'none';

// ----------------------------------------------------------------------------
// 3. Classroom Objects (Bảng, Bàn GV, Cửa, Cửa sổ, Tủ, Bục giảng...)
// ----------------------------------------------------------------------------
export type ClassroomObjectType = 
  | 'board'            // Bảng chính (xanh lá đậm / đen)
  | 'board_rear'       // Bảng phụ cuối lớp
  | 'teacher_desk'     // Bàn giáo viên
  | 'door_main'        // Cửa chính
  | 'door_sub'         // Cửa phụ
  | 'window'           // Cửa sổ
  | 'podium'           // Bục giảng
  | 'cabinet'          // Tủ lớp học
  | 'projector_screen' // Màn chiếu
  | 'other';

export interface ClassroomObject {
  id: ID;
  type: ClassroomObjectType;
  name: string; // "Bảng chính", "Cửa trước", "Bàn GV"...
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // 0, 90, 180, 270
  locked?: boolean;
}

// ----------------------------------------------------------------------------
// 4. Seat Assignment (Tách biệt gán học sinh khỏi cấu trúc ghế)
// ----------------------------------------------------------------------------
export interface SeatAssignment {
  seatId: ID;
  studentId: ID;
  studentName: string;
  studentCode?: string;
  gender?: Gender | string;
  role?: StudentRole;
  customColor?: string; // Hex hoặc class màu tùy chỉnh
  locked?: boolean; // Khóa vị trí này không cho auto-seating thay đổi
  assignedAt?: string;
}

// ----------------------------------------------------------------------------
// 5. Aggregate Root: Classroom Layout
// ----------------------------------------------------------------------------
export interface ClassroomLayout {
  id: ID;
  classId: string;
  name: string; // "Sơ đồ học kỳ I - 2025-2026", "Sơ đồ kiểm tra"...
  dimensions: Dimensions; // Kích thước phòng học canvas (mặc định 1000 x 750)
  orientation: 'front_top' | 'front_bottom' | 'front_left' | 'front_right';
  boardPosition?: 'top' | 'bottom'; // Vị trí Bảng chính (top: trên, bottom: dưới - đảo 180°)
  teacherDeskSide?: 'left' | 'right'; // Vị trí Bàn GV (left hoặc right)
  windowCountLeft?: number; // Số cửa sổ bên trái (0 - 4)
  windowCountRight?: number; // Số cửa sổ bên phải (0 - 4)
  includeRearBoard?: boolean; // Bảng phụ đối diện bảng chính
  tables: Record<ID, TableDef>;
  seats: Record<ID, SeatDef>;
  objects: Record<ID, ClassroomObject>;
  assignments: Record<ID, SeatAssignment>; // key là seatId
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

// ----------------------------------------------------------------------------
// 6. Student Model for Editor
// ----------------------------------------------------------------------------
export interface EditorStudent {
  id: ID;
  fullName: string;
  code?: string;
  stt?: number;
  gender?: Gender | string;
  group?: string; // Tổ 1, Tổ 2...
  notes?: string;
  isSpecial?: boolean;
  specialNeeds?: string;
}

// ----------------------------------------------------------------------------
// 7. Auto Seating Configuration Options
// ----------------------------------------------------------------------------
export type AutoSeatingStrategy = 
  | 'alphabetical'       // Theo thứ tự Alphabet họ tên tiếng Việt
  | 'stt'                // Theo số thứ tự danh sách (STT)
  | 'alternating_gender' // Nam/Nữ xen kẽ
  | 'random'             // Ngẫu nhiên (Shuffle)
  | 'by_group';          // Theo tổ (Tổ 1 dãy 1, Tổ 2 dãy 2...)

export interface AutoSeatingOptions {
  strategy: AutoSeatingStrategy;
  preserveLocked: boolean; // Mặc định true (luôn giữ vị trí đã khóa 🔒)
  preserveSpecial: boolean; // Mặc định true
  fillDirection: 'horizontal' | 'vertical' | 'snake'; // Cách điền bàn
}

// ----------------------------------------------------------------------------
// 8. Classroom Grid Generator Config
// ----------------------------------------------------------------------------
export interface ClassroomGeneratorParams {
  rows: number; // Số dãy bàn (1 đến 8)
  tablesPerRow: number; // Số bàn mỗi dãy (1 đến 10)
  seatsPerTable: number; // Số học sinh / bàn (1, 2, 3, 4, 6)
  tableSpacingX?: number; // Khoảng cách ngang giữa các bàn (px)
  tableSpacingY?: number; // Khoảng cách dọc giữa các bàn (px)
  includeBoard?: boolean;
  includeTeacherDesk?: boolean;
  includeDoors?: boolean;
  includeWindows?: boolean;
}

// ----------------------------------------------------------------------------
// 9. Validation Results
// ----------------------------------------------------------------------------
export interface LayoutValidationResult {
  isValid: boolean;
  totalSeats: number;
  occupiedSeats: number;
  emptySeats: number;
  lockedSeats: number;
  totalStudents: number;
  assignedStudentsCount: number;
  unassignedStudentsCount: number;
  duplicateStudents: { studentId: ID; studentName: string; count: number }[];
  duplicateSeats: ID[];
  warnings: string[];
  errors: string[];
}

// ----------------------------------------------------------------------------
// 10. History State for Undo/Redo
// ----------------------------------------------------------------------------
export interface EditorHistoryState {
  past: ClassroomLayout[];
  present: ClassroomLayout;
  future: ClassroomLayout[];
}
