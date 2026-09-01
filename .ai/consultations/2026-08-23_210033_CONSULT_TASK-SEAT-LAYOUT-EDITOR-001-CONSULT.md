⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới góc nhìn Senior Full-Stack Architect, tôi khuyến nghị **không xây Seat Layout Editor như một “grid component có drag & drop” đơn thuần**. Nên coi nó là một **domain engine độc lập**, trong đó Canvas chỉ là lớp render.

Kiến trúc tốt nhất là:

**Domain State → Command/Reducer → Validation → Derived View Model → Canvas UI**

Cách này giúp cùng một layout chạy được trên màn hình, Supabase/Local DB, Undo/Redo, Auto-Seating và Print Preview mà không phải viết lại logic.

* * *

# 1\. Kiến trúc tổng thể

```
SeatLayoutEditor
│
├── Toolbar
│   ├── Undo / Redo
│   ├── Auto Seat
│   ├── Lock / Unlock
│   ├── Add Table
│   ├── Add Object
│   ├── Zoom
│   └── Print / Export
│
├── Editor Workspace
│   │
│   ├── StudentSidebar
│   │   ├── Search
│   │   ├── Gender filter
│   │   ├── Assigned / Unassigned
│   │   └── DraggableStudent
│   │
│   ├── LayoutCanvas
│   │   ├── ClassroomObject
│   │   ├── Table
│   │   │   └── Seat
│   │   └── SelectionOverlay
│   │
│   └── PropertiesPanel
│       ├── Classroom
│       ├── Table
│       ├── Seat
│       └── Object
│
└── ValidationStatusBar
```

Tôi sẽ chia code thành 4 tầng:

```
features/seat-layout/
├── domain/
│   ├── types.ts
│   ├── reducer.ts
│   ├── commands.ts
│   ├── selectors.ts
│   ├── validation.ts
│   ├── autoSeating.ts
│   └── geometry.ts
│
├── hooks/
│   └── useSeatLayoutEditor.ts
│
├── components/
│   ├── SeatLayoutEditor.tsx
│   ├── LayoutToolbar.tsx
│   ├── LayoutCanvas.tsx
│   ├── TableNode.tsx
│   ├── SeatNode.tsx
│   ├── ClassroomObjectNode.tsx
│   ├── StudentSidebar.tsx
│   ├── PropertiesPanel.tsx
│   └── ValidationStatusBar.tsx
│
├── print/
│   ├── PrintPreview.tsx
│   └── printLayout.ts
│
└── persistence/
    ├── layoutRepository.ts
    ├── supabaseLayoutRepository.ts
    └── localLayoutRepository.ts
```

Điểm quan trọng: **component không được tự quyết định nghiệp vụ**.

Ví dụ `SeatNode` không nên tự làm:

TypeScript

```
seat.studentId = draggedStudentId;
```

Mà phải phát command:

TypeScript

```
dispatch({
  type: "ASSIGN_STUDENT",
  studentId,
  seatId,
});
```

* * *

# 2\. Data Model TypeScript

Tôi khuyến nghị dùng **ID ổn định** thay vì index.

Không nên:

TypeScript

```
row: 2
column: 4
```

để định danh ghế.

Nên:

TypeScript

```
seat_01HXYZ...
```

vì người dùng có thể thêm/xóa/di chuyển bàn.

## 2.1 Basic types

TypeScript

```
export type ID = string;

export type Gender = "male" | "female" | "other" | "unknown";

export type TableShape =
  | "rectangular"
  | "round"
  | "irregular";

export type SeatStatus =
  | "empty"
  | "assigned"
  | "locked"
  | "special";

export type ClassroomObjectType =
  | "board"
  | "teacher_desk"
  | "door"
  | "door_secondary"
  | "window"
  | "cabinet"
  | "podium"
  | "custom";
```

* * *

# 3\. ClassroomLayout

`ClassroomLayout` là aggregate root.

TypeScript

```
export interface ClassroomLayout {
  id: ID;
  classroomId: ID;

  name: string;

  width: number;
  height: number;

  tables: Record<ID, TableDef>;
  seats: Record<ID, SeatDef>;
  assignments: Record<ID, SeatAssignment>;
  objects: Record<ID, ClassroomObject>;

  settings: LayoutSettings;

  version: number;

  createdAt: string;
  updatedAt: string;
}
```

Tôi đặc biệt khuyên dùng:

TypeScript

```
Record<ID, Entity>
```

thay vì:

TypeScript

```
Entity[]
```

cho domain state.

Lý do là thao tác:

TypeScript

```
updateSeat(seatId)
```

không phải scan cả mảng.

Array vẫn có thể được tạo ở selector để render:

TypeScript

```
const seats = selectSeats(layout);
```

* * *

# 4\. TableDef

Bàn không nên chỉ có `seatCount`.

Một bàn 4 chỗ có thể là:

```
[A] [B]
[C] [D]
```

nhưng bàn khác có thể:

```
[A] [B] [C]
    [D]
```

Do đó seat phải có geometry tương đối.

TypeScript

```
export interface TableDef {
  id: ID;

  name?: string;

  x: number;
  y: number;

  width: number;
  height: number;

  rotation: number;

  shape: TableShape;

  seatIds: ID[];

  groupId?: ID;

  locked?: boolean;

  metadata?: {
    row?: number;
    column?: number;
  };
}
```

`groupId` dùng cho trường hợp **ghép bàn**.

Ví dụ:

```
table-A ─┐
         ├── group-01
table-B ─┘
```

Không cần biến ghép bàn thành một loại entity hoàn toàn khác.

* * *

# 5\. SeatDef

TypeScript

```
export interface SeatDef {
  id: ID;

  tableId: ID;

  /**
   * Position relative to table.
   * Allows irregular/non-uniform tables.
   */
  offsetX: number;
  offsetY: number;

  width: number;
  height: number;

  rotation?: number;

  label?: string;

  locked: boolean;

  special: boolean;

  specialReason?: string;

  status?: SeatStatus;

  metadata?: {
    side?: "left" | "right" | "front" | "back";
    index?: number;
  };
}
```

### Một quyết định kiến trúc quan trọng

`locked` và `assigned` **không phải cùng một khái niệm**.

Ví dụ:

```
Seat A:
locked = true
student = Nguyễn Văn A
```

nghĩa là học sinh A phải ở đó.

Nhưng:

```
Seat B:
locked = true
student = null
```

nghĩa là ghế này bị cấm xếp học sinh.

Do đó không dùng:

TypeScript

```
status: "locked"
```

để biểu diễn toàn bộ semantics.

* * *

# 6\. SeatAssignment

Không nhét `studentId` trực tiếp vào `SeatDef`.

TypeScript

```
export interface SeatAssignment {
  id: ID;

  seatId: ID;
  studentId: ID;

  locked?: boolean;

  reason?: "manual" | "auto" | "imported";

  createdAt: string;
  updatedAt: string;
}
```

Điều này cho phép sau này mở rộng:

- lịch sử xếp chỗ;
- người thực hiện;
- lý do xếp;
- audit;
- sync;
- assignment theo học kỳ.

* * *

# 7\. ClassroomObject

Các vật thể phòng học nên là entity generic.

TypeScript

```
export interface ClassroomObject {
  id: ID;

  type: ClassroomObjectType;

  name?: string;

  x: number;
  y: number;

  width: number;
  height: number;

  rotation: number;

  zIndex: number;

  locked?: boolean;

  visible?: boolean;

  style?: {
    fill?: string;
    stroke?: string;
    opacity?: number;
  };

  metadata?: Record<string, unknown>;
}
```

Ví dụ:

TypeScript

```
{
  type: "board",
  x: 100,
  y: 20,
  width: 800,
  height: 60
}
```

hoặc:

TypeScript

```
{
  type: "window",
  x: 20,
  y: 200,
  width: 20,
  height: 180,
  rotation: 90
}
```

Không nên hard-code:

TypeScript

```
<Blackboard />
<TeacherDesk />
<Window />
```

vào engine.

Renderer có thể map:

TypeScript

```
OBJECT_RENDERERS[type]
```

* * *

# 8\. LayoutSettings

TypeScript

```
export interface LayoutSettings {
  orientation: "portrait" | "landscape";

  unit: "px" | "cm";

  gridSize: number;

  snapToGrid: boolean;

  showGrid: boolean;

  showStudentNames: boolean;

  showGenderIndicator: boolean;

  showSeatLabels: boolean;

  allowOverlap: boolean;

  defaultTableGap: number;

  boardPosition: "top" | "bottom" | "left" | "right";

  canvasPadding: number;

  printScale?: number;
}
```

Tách `LayoutSettings` khỏi entity giúp Print Preview không phá layout gốc.

* * *

# 9\. Editor State

Đừng lưu Undo/Redo bằng cách copy component state rải rác.

Nên có:

TypeScript

```
export interface EditorState {
  present: ClassroomLayout;

  past: ClassroomLayout[];

  future: ClassroomLayout[];

  selection: SelectionState;

  drag: DragState | null;

  validation: ValidationResult;

  dirty: boolean;
}
```

Selection:

TypeScript

```
export interface SelectionState {
  type: "none" | "seat" | "table" | "object" | "student";
  id?: ID;
}
```

* * *

# 10\. `useSeatLayoutEditor`

API nên ở mức domain, không expose reducer implementation.

TypeScript

```
const {
  layout,

  selected,
  validation,

  assignStudent,
  unassignStudent,
  swapSeats,

  moveTable,
  resizeTable,

  addTable,
  deleteTable,

  addObject,
  deleteObject,

  lockSeat,
  unlockSeat,

  autoSeat,

  undo,
  redo,

  canUndo,
  canRedo,

  save,
} = useSeatLayoutEditor(initialLayout);
```

Implementation:

TypeScript

```
export function useSeatLayoutEditor(
  initialLayout: ClassroomLayout
) {
  const [state, dispatch] = useReducer(
    editorReducer,
    createInitialEditorState(initialLayout)
  );

  const assignStudent = useCallback(
    (studentId: ID, seatId: ID) => {
      dispatch({
        type: "ASSIGN_STUDENT",
        studentId,
        seatId,
      });
    },
    []
  );

  const swapSeats = useCallback(
    (sourceSeatId: ID, targetSeatId: ID) => {
      dispatch({
        type: "SWAP_SEATS",
        sourceSeatId,
        targetSeatId,
      });
    },
    []
  );

  // ...
}
```

* * *

# 11\. Reducer nên command-oriented

Thay vì reducer có action quá UI-specific:

TypeScript

```
DRAG_MOUSE_UP
```

nên dùng domain action:

TypeScript

```
type EditorAction =
  | {
      type: "ASSIGN_STUDENT";
      studentId: ID;
      seatId: ID;
    }
  | {
      type: "UNASSIGN_STUDENT";
      seatId: ID;
    }
  | {
      type: "SWAP_SEATS";
      sourceSeatId: ID;
      targetSeatId: ID;
    }
  | {
      type: "LOCK_SEAT";
      seatId: ID;
    }
  | {
      type: "UNLOCK_SEAT";
      seatId: ID;
    }
  | {
      type: "AUTO_SEAT";
      options: AutoSeatOptions;
    }
  | {
      type: "MOVE_TABLE";
      tableId: ID;
      x: number;
      y: number;
    }
  | {
      type: "UNDO";
    }
  | {
      type: "REDO";
    };
```

* * *

# 12\. Undo/Redo

Mỗi **domain transaction** tạo một history entry.

Không tạo history cho:

```
mousemove
mousemove
mousemove
mousemove
```

khi user kéo bàn.

Chỉ commit khi:

```
dragStart
    ↓
mousemove × 50
    ↓
dragEnd
    ↓
ONE history entry
```

Reducer concept:

TypeScript

```
function commit(
  state: EditorState,
  nextLayout: ClassroomLayout
): EditorState {
  return {
    ...state,
    past: [...state.past, state.present],
    present: nextLayout,
    future: [],
    dirty: true,
  };
}
```

Giới hạn history:

TypeScript

```
const MAX_HISTORY = 100;
```

để tránh memory tăng vô hạn.

* * *

# 13\. Student Swap — phải là transaction

Đây là phần dễ gây mất dữ liệu nhất.

Giả sử:

```
Seat A → Student 1
Seat B → Student 2
```

User kéo Student 1 sang B.

Kết quả phải:

```
Seat A → Student 2
Seat B → Student 1
```

Không được thực hiện:

TypeScript

```
remove(Student1)
assign(Student1, B)
```

vì giữa hai operation có thể xảy ra inconsistency.

Nên tạo một transaction:

TypeScript

```
function swapSeats(
  layout: ClassroomLayout,
  sourceSeatId: ID,
  targetSeatId: ID
): ClassroomLayout {
  const source = findAssignment(layout, sourceSeatId);
  const target = findAssignment(layout, targetSeatId);

  validateSwap(layout, sourceSeatId, targetSeatId);

  const next = cloneLayout(layout);

  removeAssignment(next, sourceSeatId);
  removeAssignment(next, targetSeatId);

  if (target) {
    assign(next, targetSeatId, target.studentId);
  }

  if (source) {
    assign(next, sourceSeatId, source.studentId);
  }

  return next;
}
```

* * *

# 14\. Locked Seat — cần phân biệt 3 loại

Tôi khuyến nghị có semantic rõ ràng:

### A. Locked empty seat

```
🔒 Seat
Không ai được ngồi.
```

### B. Locked assignment

```
🔒 Nguyễn Văn A
Không được Auto-Seating thay đổi.
```

### C. Special student

```
⭐ Nguyễn Văn B
```

Special không nhất thiết là locked.

Ví dụ học sinh đặc biệt có thể được phép đổi chỗ thủ công nhưng Auto Seating không tự di chuyển.

Có thể model:

TypeScript

```
export interface StudentPlacementRule {
  studentId: ID;

  priority: number;

  protectedFromAutoSeat: boolean;

  protectedFromManualMove: boolean;
}
```

* * *

# 15\. Swap validation

Trước khi swap:

TypeScript

```
function validateSwap(
  layout: ClassroomLayout,
  sourceSeatId: ID,
  targetSeatId: ID
) {
  const source = layout.seats[sourceSeatId];
  const target = layout.seats[targetSeatId];

  if (!source || !target) {
    throw new Error("Seat not found");
  }

  if (source.locked || target.locked) {
    throw new Error("Cannot swap locked seats");
  }

  const sourceAssignment =
    layout.assignments[sourceSeatId];

  const targetAssignment =
    layout.assignments[targetSeatId];

  if (
    targetAssignment &&
    isAssignmentLocked(targetAssignment)
  ) {
    throw new Error("Target student is locked");
  }

  if (
    sourceAssignment &&
    isAssignmentLocked(sourceAssignment)
  ) {
    throw new Error("Source student is locked");
  }
}
```

**Không dùng UI state để bảo vệ rule.**

Ví dụ:

TypeScript

```
if (!seat.locked) {
   ...
}
```

là chưa đủ.

Server/repository validation vẫn phải enforce constraint.

* * *

# 16\. Auto-Seating Engine

Tách algorithm khỏi React:

TypeScript

```
autoSeat(
  students,
  layout,
  options
): AutoSeatResult
```

TypeScript

```
export interface AutoSeatOptions {
  strategy:
    | "student_number"
    | "alphabetical"
    | "gender_alternating"
    | "random"
    | "group";

  preserveLocked: boolean;

  preserveSpecial: boolean;

  allowExistingAssignments: boolean;

  randomSeed?: number;

  groupKey?: string;
}
```

Kết quả không nên chỉ trả layout:

TypeScript

```
export interface AutoSeatResult {
  assignments: Record<ID, SeatAssignment>;

  unassignedStudentIds: ID[];

  emptySeatIds: ID[];

  warnings: string[];

  violations: ValidationIssue[];
}
```

* * *

# 17\. Auto Seating nên chạy theo pipeline

Không làm:

```
students.sort()
for (...)
    assign()
```

một cách trực tiếp.

Nên:

```
1. Normalize students
        ↓
2. Classify protected students
        ↓
3. Classify locked seats
        ↓
4. Build available seat pool
        ↓
5. Sort students
        ↓
6. Apply constraints
        ↓
7. Generate assignment plan
        ↓
8. Validate plan
        ↓
9. Commit transaction
```

* * *

# 18\. Giữ nguyên Locked

Ví dụ:

```
Students:
A B C D E F

Seats:
1 🔒 A
2
3
4 🔒 B
5
6
```

Auto Seating chỉ được phép xử lý:

```
C D E F
```

và:

```
3 5 6
```

Không bao giờ đưa A/B trở lại pool.

* * *

# 19\. Gender alternating

Đừng hiểu “Nam Nữ xen kẽ” một cách quá cứng.

Ví dụ:

```
M F M F M F
```

nếu đủ dữ liệu.

Nhưng:

```
M M M F
```

phải vẫn tạo được layout hợp lệ.

Algorithm:

TypeScript

```
function alternateGender(students: Student[]) {
  const males = students.filter(s => s.gender === "male");
  const females = students.filter(s => s.gender === "female");
  const others = students.filter(
    s => !["male", "female"].includes(s.gender)
  );

  const result: Student[] = [];

  let current: "male" | "female" =
    males.length >= females.length
      ? "male"
      : "female";

  while (males.length || females.length) {
    const pool =
      current === "male" ? males : females;

    if (pool.length) {
      result.push(pool.shift()!);
    }

    current =
      current === "male"
        ? "female"
        : "male";
  }

  return [...result, ...others];
}
```

Trong production nên có thêm scoring để tối ưu pattern thay vì greedy đơn giản.

* * *

# 20\. Theo nhóm

Nếu học sinh có:

TypeScript

```
groupId
```

thì có thể dùng:

```
Group A → tables 1-2
Group B → tables 3-4
Group C → tables 5-6
```

Không nên assume một group = một table.

Một group có thể lớn hơn số chỗ của một bàn.

* * *

# 21\. Random phải có seed

Đây là chi tiết rất đáng làm.

Không nên:

TypeScript

```
Math.random()
```

vì không thể reproduce.

Nên:

TypeScript

```
autoSeat({
  strategy: "random",
  randomSeed: 183729
});
```

Khi giáo viên thấy kết quả tốt, có thể lưu seed.

Điều này cũng hữu ích cho debugging.

* * *

# 22\. Validation Engine

Validation nên là pure function:

TypeScript

```
validateLayout(
  layout,
  students
): ValidationResult
```

TypeScript

```
export interface ValidationResult {
  valid: boolean;

  errors: ValidationIssue[];

  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;

  severity: "error" | "warning" | "info";

  message: string;

  entityType?: "seat" | "student" | "table" | "object";

  entityId?: ID;
}
```

Các rule tối thiểu:

### Duplicate assignment

```
Student A xuất hiện 2 ghế
```

### Unknown student

```
assignment.studentId không tồn tại
```

### Unknown seat

```
assignment.seatId không tồn tại
```

### Missing students

```
Student A chưa được xếp
```

### Locked violation

```
Locked assignment bị thay đổi
```

### Overlapping objects

```
Table A overlap Table B
```

### Invalid table

```
Table không có seat
```

### Orphan seat

```
Seat tham chiếu table không tồn tại
```

* * *

# 23\. Không lưu `status` nếu có thể derive

Ví dụ:

TypeScript

```
seat.status
```

có thể bị stale.

Nếu:

TypeScript

```
seat.locked = false
assignment = undefined
```

thì status tự suy ra:

TypeScript

```
function getSeatVisualState(
  seat: SeatDef,
  assignment?: SeatAssignment
) {
  if (seat.locked) return "locked";
  if (seat.special) return "special";
  if (assignment) return "assigned";
  return "empty";
}
```

Đây là **derived state**, không phải persisted state.

* * *

# 24\. Visual State

Tôi đề xuất hierarchy:

```
Locked
  ↓
Special
  ↓
Selected
  ↓
Assigned
  ↓
Empty
```

Hover/drag overlay là transient UI state.

Ví dụ:

TypeScript

```
type SeatVisualState =
  | "empty"
  | "assigned"
  | "locked"
  | "special"
  | "selected"
  | "drag-over"
  | "invalid";
```

Đừng để màu sắc là business logic.

Không viết:

TypeScript

```
if (seat.color === "red")
```

để quyết định seat special.

* * *

# 25\. Canvas: Grid hay Freeform?

Với yêu cầu của bài toán, tôi **không khuyến nghị pure CSS Grid**.

Grid phù hợp cho:

```
3 × 6
```

nhưng sẽ nhanh chóng gặp vấn đề với:

- bàn lệch;
- bàn tròn;
- bàn ghép;
- object;
- rotation;
- cửa;
- cửa sổ;
- bục;
- khoảng cách không đều;
- zoom.

Nên dùng **2D coordinate system**.

Ví dụ:

```
Canvas: 1200 × 800

Table:
x = 300
y = 240
width = 160
height = 80
rotation = 0
```

Grid chỉ là **visual snapping layer**.

* * *

# 26\. DOM Canvas vs SVG

Cho ứng dụng THCS với vài chục bàn, tôi ưu tiên:

**HTML/SVG hybrid hoặc SVG-first.**

Không cần canvas bitmap.

SVG có lợi:

- drag dễ;
- text rõ;
- print tốt;
- accessibility tốt hơn;
- selection dễ;
- rotation;
- zoom;
- vector export.

Kiến trúc:

TypeScript

```
<svg>
  <g className="classroom-objects" />
  <g className="tables" />
  <g className="seats" />
  <g className="selection-layer" />
</svg>
```

Nếu số lượng entity lên đến hàng nghìn thì mới cần cân nhắc Canvas/WebGL.

* * *

# 27\. Component hierarchy

```
<SeatLayoutEditor>
│
├── <LayoutToolbar />
│
├── <EditorWorkspace>
│   │
│   ├── <StudentSidebar />
│   │
│   ├── <LayoutViewport>
│   │   └── <LayoutCanvas>
│   │       ├── <ClassroomObjectNode />
│   │       ├── <TableNode />
│   │       │   └── <SeatNode />
│   │       └── <SelectionOverlay />
│   │
│   └── <PropertiesPanel />
│
└── <ValidationStatusBar />
```

* * *

# 28\. Student Sidebar

Nên có:

```
┌───────────────────────┐
│ 🔍 Tìm học sinh       │
├───────────────────────┤
│ Tất cả   Chưa xếp     │
│ Nam     Nữ            │
├───────────────────────┤
│ Nguyễn Văn A      M   │
│ Trần Thị B        F   │
│ Lê Văn C          M   │
└───────────────────────┘
```

Mỗi student item:

TypeScript

```
interface StudentListItemProps {
  student: Student;
  assignedSeatId?: ID;
  selected?: boolean;
}
```

Không render toàn bộ học sinh mỗi lần Canvas thay đổi.

Dùng selector:

TypeScript

```
selectFilteredStudents(state, filters)
```

và debounce search.

* * *

# 29\. Drag & Drop

Tôi khuyên sử dụng **Pointer Events** thay vì phụ thuộc hoàn toàn vào HTML5 native drag/drop.

Native HTML drag/drop thường khó chịu trên:

- touch;
- tablet;
- mobile browser;
- SVG;
- custom drag preview.

Flow:

```
pointerdown
    ↓
startDrag()
    ↓
pointermove
    ↓
calculateCanvasPosition()
    ↓
hitTestSeat()
    ↓
setTransientDragState()
    ↓
pointerup
    ↓
commit domain command
```

Đặc biệt:

**mousemove không được ghi vào Undo history.**

* * *

# 30\. Drag student → empty seat

```
Student A
   │
   ▼
Empty Seat B
   │
   ▼
ASSIGN_STUDENT
```

Nếu A đã ngồi ở Seat A:

```
Seat A → Student A
Seat B → empty
```

thì:

```
drag A → B
```

phải trở thành:

```
Seat A → empty
Seat B → Student A
```

* * *

# 31\. Drag student → occupied seat

```
A @ Seat 1
B @ Seat 2

A drag → Seat 2
```

→ swap:

```
B @ Seat 1
A @ Seat 2
```

Không phải overwrite.

Nếu Seat 2 locked:

```
A drag → Seat 2
```

→ reject + UI feedback.

* * *

# 32\. Drag seat/table

Nên phân biệt:

```
Drag student
→ assignment operation

Drag table
→ geometry operation

Drag object
→ geometry operation
```

Không để một `onDrop()` khổng lồ xử lý cả ba.

* * *

# 33\. Properties Panel

Panel thay đổi theo selection.

### Chưa chọn

```
Layout
- Tên lớp
- Kích thước
- Grid
- Orientation
```

### Chọn bàn

```
Bàn 3
- Tên
- Width
- Height
- Rotation
- Số chỗ
- Lock
```

### Chọn ghế

```
Ghế B3-2
- Học sinh
- Lock
- Special
- Label
```

### Chọn object

```
Bảng
- X
- Y
- Width
- Height
- Rotation
```

* * *

# 34\. Classroom Generator Wizard

Wizard nên tạo **initial layout**, không khóa người dùng vào generator.

Flow:

```
Step 1
Thông tin lớp
    ↓
Step 2
Số dãy / số bàn
    ↓
Step 3
Số chỗ mỗi bàn
    ↓
Step 4
Khoảng cách
    ↓
Step 5
Hướng bảng
    ↓
Preview
    ↓
Generate
```

Ví dụ:

TypeScript

```
export interface ClassroomGeneratorOptions {
  rows: number;
  tablesPerRow: number;

  seatsPerTable: 1 | 2 | 3 | 4 | 6;

  horizontalGap: number;
  verticalGap: number;

  tableWidth: number;
  tableHeight: number;

  boardPosition: "top" | "bottom" | "left" | "right";
}
```

Generator trả:

TypeScript

```
ClassroomLayout
```

sau đó editor hoàn toàn tự do.

* * *

# 35\. Đừng để Generator tạo assignment

Tách:

```
Generator
= geometry

Auto Seating
= student placement
```

Đây là separation rất quan trọng.

Ví dụ giáo viên có thể:

```
Generate classroom
        ↓
chỉnh bàn
        ↓
thêm cửa sổ
        ↓
lock 3 seats
        ↓
Auto Seat
```

* * *

# 36\. Persistence với Supabase + Local DB

Không để component gọi Supabase trực tiếp.

Sai:

TypeScript

```
await supabase
  .from("seat_assignments")
  ...
```

trong `SeatNode`.

Nên:

TypeScript

```
interface LayoutRepository {
  get(classroomId: ID): Promise<ClassroomLayout | null>;

  save(layout: ClassroomLayout): Promise<void>;

  delete(layoutId: ID): Promise<void>;
}
```

Sau đó:

TypeScript

```
SupabaseLayoutRepository
LocalLayoutRepository
```

cùng implement interface.

* * *

# 37\. Database schema

Ở database, tôi sẽ normalize:

```
classrooms
classroom_layouts
layout_tables
layout_seats
seat_assignments
classroom_objects
```

Không nên nhét toàn bộ layout vào một JSONB duy nhất nếu hệ thống cần:

- query;
- audit;
- reporting;
- migration;
- RLS;
- đồng bộ assignment.

Tuy nhiên có thể giữ thêm:

SQL

```
layout_snapshot jsonb
```

cho version/history hoặc cache.

* * *

# 38\. Optimistic save

UX nên:

```
User action
    ↓
Local reducer update immediately
    ↓
dirty = true
    ↓
debounced save
    ↓
Supabase
```

Ví dụ:

```
User moves table
→ UI phản hồi ngay
→ save sau 500–1000ms
```

Không nên chờ network trước khi cập nhật Canvas.

* * *

# 39\. Conflict detection

Nếu có nhiều thiết bị:

TypeScript

```
version: number
```

hoặc tốt hơn:

TypeScript

```
revision: bigint / UUID
```

Khi save:

```
Client version = 12
Server version = 13
```

→ conflict.

Không âm thầm overwrite.

* * *

# 40\. Print Preview

Print không nên screenshot Canvas.

Sai:

```
Canvas → screenshot → A4
```

Vì:

- chữ mờ;
- scale sai;
- browser DPI;
- pagination;
- accessibility;
- print margin.

Nên tạo:

TypeScript

```
<PrintPreview layout={layout} />
```

dùng cùng domain data nhưng **renderer riêng**.

* * *

# 41\. A4 landscape

Đối với sơ đồ lớp học, mặc định tôi chọn:

```
A4 Landscape
```

CSS:

CSS

```
@page {
  size: A4 landscape;
  margin: 10mm;
}
```

Có thêm:

```
A4 Portrait
A4 Landscape
```

và preview trước khi in.

* * *

# 42\. Print renderer

Screen:

```
Interactive SVG
```

Print:

```
Static SVG/HTML
```

Ví dụ:

```
┌────────────────────────────────────────────┐
│                 LỚP 7A1                    │
│                                            │
│               ┌──────────┐                 │
│               │  BẢNG    │                 │
│               └──────────┘                 │
│                                            │
│   [A][B]      [C][D]      [E][F]          │
│   [G][H]      [I][J]      [K][L]           │
│                                            │
│  GVCN: ................                     │
└────────────────────────────────────────────┘
```

Có footer:

```
Lớp
Năm học
Ngày in
GVCN
```

* * *

# 43\. Export

Tôi đề xuất roadmap:

### V1

- Print
- PDF browser print
- PNG preview

### V2

- SVG export

### V3

- PDF server-side nếu cần chuẩn hóa hoàn toàn.

Đừng xây PDF engine ngay từ đầu nếu browser print đáp ứng nhu cầu.

* * *

# 44\. Anti-pattern nguy hiểm #1: Index-based identity

Không:

TypeScript

```
seats[3]
```

là Seat 4.

Khi delete:

```
Seat 3
Seat 4
Seat 5
```

xóa Seat 3 sẽ làm index thay đổi.

Luôn:

TypeScript

```
seatId
```

* * *

# 45\. Anti-pattern #2: Student nằm trong Seat

Không:

TypeScript

```
seat.student = student;
```

vì sẽ khó:

- undo;
- sync;
- validate duplicate;
- audit;
- query.

Assignment phải là relationship riêng.

* * *

# 46\. Anti-pattern #3: Dùng React state cho toàn bộ drag coordinates

Không:

TypeScript

```
setLayout(...)
setLayout(...)
setLayout(...)
```

trên mỗi pointermove.

Pointermove chỉ cập nhật transient state:

TypeScript

```
dragPreview
```

Commit một lần ở `pointerup`.

* * *

# 47\. Anti-pattern #4: Mutate object

Không:

TypeScript

```
layout.seats[id].locked = true;
```

vì phá:

- React rendering;
- history;
- memoization;
- debugging.

Dùng immutable update.

* * *

# 48\. Anti-pattern #5: Undo bằng snapshot sau mọi mouse event

Nếu một drag có 200 pointer events:

```
history:
200 snapshots
```

rất nhanh phình memory.

History phải dựa trên transaction.

* * *

# 49\. Anti-pattern #6: Chỉ validate ở frontend

Frontend:

TypeScript

```
validateLayout()
```

là cần thiết cho UX.

Nhưng backend cũng phải bảo vệ invariant quan trọng.

Ví dụ không để database tồn tại:

```
student A → seat 1
student A → seat 2
```

Nếu hệ thống dùng assignment history, constraint có thể phức tạp hơn nhưng vẫn phải có transaction/server validation.

* * *

# 50\. Anti-pattern #7: `Math.random()` cho Auto Seating

Không reproducible.

Dùng seeded RNG.

* * *

# 51\. Edge case: kéo học sinh đang ở ghế Locked

Ví dụ:

```
🔒 Seat 1 → A
```

User cố kéo A:

### Nếu `protectedFromManualMove = true`

Reject.

### Nếu chỉ `assignment.locked = true` nhưng cho phép manual override

Hiển thị confirmation:

```
Học sinh này đang được khóa vị trí.
Bạn có chắc muốn đổi chỗ?
```

Rule phải nằm trong domain, không nằm trong modal.

* * *

# 52\. Edge case: xóa bàn đang có học sinh

Không cho:

```
Delete Table
```

nếu:

```
occupiedSeats > 0
```

trừ khi user xác nhận.

UX tốt:

```
Bàn này đang có 4 học sinh.

[Hủy] [Chuyển học sinh ra danh sách chưa xếp] [Xóa]
```

* * *

# 53\. Edge case: giảm số ghế

Ví dụ:

```
Table 6 seats
↓
Table 4 seats
```

Nếu 2 seat bị occupied:

```
Không được silently delete.
```

Phải:

```
Seat bị loại:
- Student A
- Student B
```

và yêu cầu xử lý.

* * *

# 54\. Edge case: resize table

Resize không được tự động resize student.

Seat geometry có thể:

```
fixed
```

hoặc:

```
relative
```

Tôi khuyến nghị mặc định:

```
Seat position relative to Table
```

nhưng có thể detach seat nếu cần custom layout.

* * *

# 55\. Edge case: rotation

Khi table rotation = 90°:

```
hit testing
```

không được dựa vào bounding box đơn giản nếu cần chính xác.

Dùng transform matrix:

```
screen → canvas → local table coordinates
```

Sau đó hit-test trong local coordinate.

* * *

# 56\. Edge case: zoom

Không thay đổi domain:

TypeScript

```
seat.x
seat.y
```

khi zoom.

Zoom chỉ là viewport transform:

```
world coordinates
        ↓
camera transform
        ↓
screen coordinates
```

Ví dụ:

TypeScript

```
viewport = {
  x: 0,
  y: 0,
  scale: 1.25
}
```

* * *

# 57\. Edge case: browser refresh

Phải có:

```
dirty indicator
```

và:

```
beforeunload
```

khi có unsaved changes.

Nhưng đừng rely hoàn toàn vào `beforeunload`.

Nên autosave draft:

```
localStorage / IndexedDB
```

để tránh mất layout khi browser crash.

Với layout lớn, ưu tiên IndexedDB hơn localStorage.

* * *

# 58\. Edge case: Offline

Vì app có Local DB, đây là cơ hội rất tốt.

Architecture:

```
UI
 ↓
Domain Engine
 ↓
Repository
 ├── Local
 └── Remote
```

Offline:

```
edit
 ↓
local save
 ↓
sync queue
 ↓
online
 ↓
Supabase
```

Không để domain engine biết online/offline.

* * *

# 59\. Edge case: hai giáo viên chỉnh cùng layout

Phải xác định policy ngay từ đầu:

### Simple

Last write wins.

### Better

Optimistic concurrency:

```
revision mismatch
→ conflict dialog
```

### Advanced

Operational transformation / CRDT.

Tôi **không khuyến nghị CRDT cho V1**. Nó quá phức tạp so với nhu cầu sơ đồ lớp học.

* * *

# 60\. Accessibility

Drag & drop không được là cách duy nhất.

Phải hỗ trợ:

```
Select student
→ Select seat
→ Assign
```

và:

```
Arrow keys
```

cho movement.

Keyboard:

```
Tab
Enter
Space
Arrow
Delete
Ctrl/Cmd + Z
Ctrl/Cmd + Shift + Z
```

Đặc biệt:

```
Ctrl/Cmd + Z
Ctrl/Cmd + Y
```

phải hoạt động toàn editor.

* * *

# 61\. Mobile/tablet

Không nên giả định giáo viên luôn dùng desktop.

Trên tablet:

```
Sidebar → drawer
Properties → bottom sheet
Canvas → full screen
Toolbar → compact
```

Touch drag cần:

```
pointer events
```

và tránh thao tác scroll vô tình.

* * *

# 62\. Performance

Với lớp THCS thông thường:

```
30–60 students
10–30 tables
```

React/SVG hoàn toàn đủ.

Điều quan trọng hơn là tránh:

TypeScript

```
const layout = useContext(LayoutContext);
```

rồi mọi `SeatNode` re-render khi bất kỳ thứ gì thay đổi.

Nên dùng selectors/memo:

TypeScript

```
const seat = useSeatSelector(seatId);
```

hoặc ít nhất:

TypeScript

```
React.memo(SeatNode)
```

với props ổn định.

* * *

# 63\. Tôi sẽ dùng normalized state

Ví dụ:

TypeScript

```
{
  tables: {
    "t1": {...},
    "t2": {...}
  },

  seats: {
    "s1": {...},
    "s2": {...}
  },

  assignments: {
    "a1": {...}
  }
}
```

và derived maps:

TypeScript

```
seatByStudentId
assignmentBySeatId
seatsByTableId
```

Có thể memoize:

TypeScript

```
selectSeatAssignment(seatId)
selectStudentSeat(studentId)
selectTableSeats(tableId)
```

* * *

# 64\. Một cải tiến rất đáng làm: Command layer

Thay vì reducer chứa toàn bộ nghiệp vụ:

TypeScript

```
dispatch({
  type: "SWAP_SEATS"
})
```

có thể có:

TypeScript

```
commands.swapSeats(
  layout,
  sourceSeatId,
  targetSeatId
)
```

Command trả:

TypeScript

```
{
  nextLayout,
  events,
  errors
}
```

Ví dụ:

TypeScript

```
const result = swapSeats(
  state.present,
  source,
  target
);

if (!result.ok) {
  return state;
}

return commit(state, result.layout);
```

Lợi ích lớn nhất:

**logic có thể unit-test mà không cần render React.**

* * *

# 65\. Test strategy

Tôi coi đây là module phải có test domain khá mạnh.

### Unit tests

```
swap empty → occupied
swap occupied → occupied
swap locked → reject
assign duplicate student → reject
delete occupied table → reject
auto seat preserves locked
auto seat preserves special
gender alternating
random seed reproducibility
```

### Property tests

Đặc biệt:

> Sau bất kỳ valid operation nào, một student không được xuất hiện ở >1 seat.

Invariant:

TypeScript

```
assertUniqueStudentAssignments(layout);
```

### Integration

```
drag student
→ reducer
→ validation
→ UI
```

### E2E

```
open classroom
→ generate layout
→ drag student
→ swap
→ lock
→ auto seat
→ undo
→ redo
→ print
```

* * *

# 66\. Invariant quan trọng nhất

Tôi sẽ định nghĩa các invariant trung tâm:

TypeScript

```
interface LayoutInvariants {
  uniqueStudentAssignments: true;
  validSeatReferences: true;
  validTableReferences: true;
  lockedAssignmentsPreserved: true;
  noInvalidGeometry: true;
}
```

Mỗi domain command phải bảo toàn invariant.

Đây là cách tránh “bug dây chuyền” tốt hơn việc thêm hàng chục `if` trong component.

* * *

# 67\. Kiến trúc hoàn chỉnh tôi đề xuất

```
                     ┌───────────────────────┐
                     │   SeatLayoutEditor     │
                     └───────────┬───────────┘
                                 │
                     ┌───────────▼───────────┐
                     │ useSeatLayoutEditor   │
                     └───────────┬───────────┘
                                 │
                ┌────────────────▼────────────────┐
                │       Editor Reducer            │
                │                                 │
                │ Undo / Redo                     │
                │ Selection                       │
                │ Transactions                   │
                └────────────────┬────────────────┘
                                 │
             ┌───────────────────▼──────────────────┐
             │             Domain Engine             │
             │                                       │
             │ swapSeats()                           │
             │ assignStudent()                       │
             │ autoSeat()                            │
             │ validateLayout()                      │
             │ generateClassroom()                   │
             │ geometry / hitTest                    │
             └───────────────────┬───────────────────┘
                                 │
                         ClassroomLayout
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
          SVG Canvas         Print Renderer      Repository
                                                    │
                                         ┌──────────┴─────────┐
                                         ▼                    ▼
                                      Local DB             Supabase
```

* * *

# 68\. Thứ tự triển khai thực tế

Tôi **không** triển khai tất cả feature cùng lúc.

### Phase 1 — Domain foundation

- TypeScript interfaces
- normalized layout
- reducer
- selectors
- validation
- immutable commands

### Phase 2 — Canvas

- coordinate system
- SVG
- tables
- seats
- classroom objects
- zoom/pan
- selection

### Phase 3 — Assignment

- student sidebar
- drag student
- assign
- swap
- lock
- special

### Phase 4 — Generator

- classroom wizard
- table templates
- irregular/custom seats

### Phase 5 — Auto Seating

- STT
- alphabet
- gender
- random seed
- groups
- protected seats/students

### Phase 6 — Editor productivity

- Undo/Redo
- keyboard shortcuts
- multi-select
- copy/paste
- duplicate table

### Phase 7 — Persistence

- repository
- Local DB
- Supabase
- optimistic save
- revision conflict

### Phase 8 — Print

- A4 portrait
- A4 landscape
- print preview
- browser print
- export

* * *

# 69\. MVP tôi khuyên chốt

Nếu mục tiêu là đưa feature vào production nhanh, MVP chỉ cần:

```
✓ Classroom generator
✓ Custom table positioning
✓ 1/2/3/4/6 seats
✓ Student drag/drop
✓ Occupied-seat swap
✓ Locked seats
✓ Special students
✓ Auto seating: STT + Alphabet + Gender
✓ Undo/Redo
✓ Validation
✓ Search/filter students
✓ A4 landscape print
✓ Local + Supabase persistence
```

Chưa cần V1:

```
✗ CRDT
✗ Collaborative realtime editing
✗ WebGL
✗ Complex constraint solver
✗ Full CAD-like editor
```

* * *

# 70\. Kết luận kiến trúc

Điểm mấu chốt của module này không phải là drag & drop. **Domain model và transaction semantics mới là phần quan trọng nhất.**

Tôi sẽ chốt 7 nguyên tắc:

1. **`ClassroomLayout` là aggregate root.**
2. **Seat, Table, Assignment, Object có ID ổn định và normalized.**
3. **Assignment tách khỏi Seat.**
4. **Mọi thay đổi nghiệp vụ đi qua domain command/reducer.**
5. **Swap và Auto-Seating là transaction atomic, không overwrite dữ liệu.**
6. **Canvas dùng world coordinates + SVG; CSS Grid chỉ là snapping/visual aid.**
7. **Screen renderer, Print renderer và persistence adapter dùng chung domain model nhưng không phụ thuộc lẫn nhau.**

Nếu xây theo cấu trúc này, tính năng ban đầu là “sơ đồ chỗ ngồi” nhưng kiến trúc đủ sạch để sau này phát triển thành **Classroom Layout Platform**: nhiều layout cho cùng lớp, lịch sử theo tuần/học kỳ, import/export, seating theo tiêu chí, print danh sách, và đồng bộ Local DB ↔ Supabase mà không phải viết lại editor.