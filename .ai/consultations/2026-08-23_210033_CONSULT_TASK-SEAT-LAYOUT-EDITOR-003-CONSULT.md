⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là blueprint kiến trúc đề xuất cho RFC 003, tập trung vào **data invariants**, **A4 print geometry**, **sidebar resize/collapse**, và **minimal seat rendering**.

## 1\. Domain Invariant & Normalization Strategy

### Nguyên tắc quan trọng

Không nên coi `table.id` hoặc `seat.id` dạng `table-3-seat-1` là identity nghiệp vụ bất biến nếu chúng phải được đánh lại liên tục.

Tốt nhất tách:

- `id`: identity nội bộ ổn định, không đổi khi reindex.
- `displayIndex`: số hiển thị `Bàn 1`, `Bàn 2`, ...
- `groupIndex`: số dãy/tổ hiển thị.
- `assignments`: map theo stable seat ID.

Ví dụ:

TypeScript

```
type Seat = {
  id: string; // stable UUID
  position: number; // 0 | 1 trong bàn
};

type Desk = {
  id: string; // stable UUID
  displayIndex: number;
  seats: Seat[];
};

type Row = {
  id: string; // stable UUID
  displayIndex: number;
  desks: Desk[];
};

type Assignment = {
  studentId: string;
  seatId: string; // luôn tham chiếu stable ID
};

type ClassroomLayout = {
  rows: Row[];
  assignments: Record<string, Assignment>; // key = seatId
};
```

### Invariant đề xuất

Sau mọi mutation:

1. `rows[i].displayIndex === i + 1`
2. Mỗi desk trong toàn layout có `displayIndex` liên tục theo thứ tự đọc.
3. Seat stable IDs không bị thay đổi khi chỉ thêm/xóa/reorder desk khác.
4. Assignment chỉ tồn tại nếu `seatId` vẫn còn trong layout.
5. Không có `studentId` được gán đồng thời vào hai ghế.
6. Không có assignment orphan.

### Hàm `reindexClassroomLayout`

TypeScript

```
export function reindexClassroomLayout(
  layout: ClassroomLayout
): ClassroomLayout {
  const validSeatIds = new Set<string>();

  let deskNumber = 1;

  const rows = layout.rows.map((row, rowIndex) => ({
    ...row,
    displayIndex: rowIndex + 1,

    desks: row.desks.map((desk) => {
      const normalizedDesk = {
        ...desk,
        displayIndex: deskNumber++,

        seats: desk.seats.map((seat, seatIndex) => {
          validSeatIds.add(seat.id);

          return {
            ...seat,
            position: seatIndex,
          };
        }),
      };

      return normalizedDesk;
    }),
  }));

  const assignments = Object.fromEntries(
    Object.entries(layout.assignments).filter(
      ([seatId]) => validSeatIds.has(seatId)
    )
  );

  return {
    ...layout,
    rows,
    assignments,
  };
}
```

### Nếu hiện tại hệ thống đang dùng ID có nghĩa hiển thị

Ví dụ:

```
table-3-seat-2
```

và bắt buộc phải đổi thành:

```
table-2-seat-2
```

thì phải thực hiện migration assignment trong cùng transaction logic, **không được reindex tables trước rồi mới xử lý assignments**.

TypeScript

```
function normalizeLegacyLayout(layout: LegacyLayout): LegacyLayout {
  const seatIdMap = new Map<string, string>();

  const tables = layout.tables.map((table, tableIndex) => {
    const nextTableId = `table-${tableIndex + 1}`;

    return {
      ...table,
      id: nextTableId,
      seats: table.seats.map((seat, seatIndex) => {
        const oldSeatId = seat.id;
        const nextSeatId = `${nextTableId}-seat-${seatIndex + 1}`;

        seatIdMap.set(oldSeatId, nextSeatId);

        return {
          ...seat,
          id: nextSeatId,
        };
      }),
    };
  });

  const assignments = Object.fromEntries(
    Object.entries(layout.assignments).flatMap(([oldSeatId, assignment]) => {
      const newSeatId = seatIdMap.get(oldSeatId);

      if (!newSeatId) return [];

      return [[newSeatId, assignment]];
    })
  );

  return {
    ...layout,
    tables,
    assignments,
  };
}
```

**Khuyến nghị kiến trúc:** chuyển dần sang stable UUID + display index. Đây là cách an toàn nhất để đảm bảo invariant “xóa Bàn 3 nhưng học sinh ở các bàn khác không mất assignment”.

### Mutation pipeline

Mọi thao tác nên đi qua cùng một pipeline:

TypeScript

```
function updateLayout(
  previous: ClassroomLayout,
  mutation: (draft: ClassroomLayout) => ClassroomLayout
) {
  const mutated = mutation(previous);
  return reindexClassroomLayout(mutated);
}
```

Ví dụ:

TypeScript

```
deleteDesk(deskId) {
  setLayout(prev =>
    updateLayout(prev, layout => ({
      ...layout,
      rows: layout.rows.map(row => ({
        ...row,
        desks: row.desks.filter(desk => desk.id !== deskId),
      })),
    }))
  );
}
```

Như vậy `reindexClassroomLayout` trở thành **single normalization boundary**.

* * *

## 2\. A4 Landscape Layout Geometry Formula

Mục tiêu nên là **print mode có geometry độc lập với màn hình editor**.

A4 landscape:

```
Width  = 297mm
Height = 210mm
```

Không nên cố gắng dùng `transform: scale()` làm cơ chế chính vì dễ gây khác biệt giữa browser/PDF engine.

### Cấu trúc print

```
┌──────────────────────────── 297mm ────────────────────────────┐
│ Header / metadata cực gọn                                     │
├───────────────────────────────────────────────────────────────┤
│ TỔ 1        TỔ 2        TỔ 3        TỔ 4                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                    DESK GRID FLEX AREA                        │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ [ CỬA LỚP ➜ ]       [ BẢNG LỚP ]       [ BÀN GIÁO VIÊN ]     │
└───────────────────────────────────────────────────────────────┘
                         210mm
```

### CSS page shell

CSS

```
@page {
  size: A4 landscape;
  margin: 0;
}

.a4-page {
  width: 297mm;
  height: 210mm;
  box-sizing: border-box;
  overflow: hidden;

  padding: 6mm;

  display: grid;
  grid-template-rows:
    auto
    auto
    minmax(0, 1fr)
    auto;

  gap: 2mm;
}
```

Điểm quan trọng nhất:

CSS

```
minmax(0, 1fr)
```

Nó buộc khu vực lưới bàn chiếm **toàn bộ phần chiều cao còn lại**, thay vì nội dung đẩy footer sang trang thứ hai.

### Công thức chiều cao khả dụng

Đặt:

- `Hpage = 210mm`
- `Pt = Pb = 6mm`
- `Hheader`
- `Hlabels`
- `Hfooter`
- `Gaps`

Ta có:

```
Havailable =
  Hpage
  - Pt
  - Pb
  - Hheader
  - Hlabels
  - Hfooter
  - ΣGaps
```

Với `N` hàng bàn:

```
HdeskRow = Havailable / N
```

Nhưng nên reserve khoảng gap:

```
Hdesk =
  (Havailable - (N - 1) × RowGap) / N
```

Ví dụ:

CSS

```
.desk-grid {
  min-height: 0;

  display: grid;
  grid-template-rows: repeat(var(--row-count), minmax(0, 1fr));
  gap: var(--row-gap);
}
```

JSX:

TypeScript

```
<div
  className="desk-grid"
  style={{
    "--row-count": layout.rows.length,
    "--row-gap": "1.5mm",
  } as React.CSSProperties}
>
  {layout.rows.map((row) => (
    <DeskRow key={row.id} row={row} />
  ))}
</div>
```

### 4×4, 4×5, 4×6

Nếu hiểu đây là 4 dãy × 4/5/6 bàn theo chiều sâu, không cần hard-code từng case.

```
4 × 4 => rowCount = 4
4 × 5 => rowCount = 5
4 × 6 => rowCount = 6
```

Chiều cao tự động:

CSS

```
grid-template-rows:
  repeat(var(--row-count), minmax(0, 1fr));
```

Do đó:

- 4 hàng: mỗi bàn cao hơn.
- 5 hàng: tự co.
- 6 hàng: tiếp tục tự co.
- Không phát sinh chiều cao intrinsic làm overflow nếu toàn bộ descendants cũng dùng `min-height: 0`.

### Desk node phải được phép shrink

CSS

```
.desk-row,
.desk,
.seat {
  min-height: 0;
  overflow: hidden;
}
```

### Print-specific typography clamp

Để tên dài không phá geometry:

CSS

```
@media print {
  .seat-student-name {
    font-size: clamp(7pt, 1.7vh, 10pt);
    line-height: 1.15;
  }

  .seat-role {
    font-size: clamp(5.5pt, 1.2vh, 7pt);
  }
}
```

Tuy nhiên, `vh` khi print có thể không nhất quán giữa engines. An toàn hơn là dùng CSS variables theo row count:

TypeScript

```
const density =
  rowCount >= 6 ? "compact" :
  rowCount >= 5 ? "medium" :
  "comfortable";

<div className={`a4-page density-${density}`}>
```

CSS

```
.density-comfortable {
  --seat-font-size: 10pt;
  --role-font-size: 7pt;
}

.density-medium {
  --seat-font-size: 9pt;
  --role-font-size: 6.5pt;
}

.density-compact {
  --seat-font-size: 8pt;
  --role-font-size: 6pt;
}
```

### Chống page break

CSS

```
@media print {
  html,
  body {
    width: 297mm;
    height: 210mm;
    margin: 0;
    overflow: hidden;
  }

  .a4-page {
    break-after: avoid;
    break-inside: avoid;
    page-break-after: avoid;
    page-break-inside: avoid;
  }

  .desk-row,
  .desk,
  .seat {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
```

### Khuyến nghị

Tạo riêng:

```
SeatLayoutEditor
    └── interactive editor UI

SeatLayoutPrint
    └── deterministic A4 render tree
```

Không nên in trực tiếp toàn bộ DOM của editor, vì sidebar, controls, drag handles và responsive layout sẽ làm geometry khó kiểm soát.

* * *

## 3\. Resizable & Collapsible Sidebar

### State

TypeScript

```
const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 520;
const SIDEBAR_DEFAULT = 320;

const [isSidebarOpen, setIsSidebarOpen] = useState(true);
const [sidebarWidth, setSidebarWidth] =
  useState(SIDEBAR_DEFAULT);

const resizingRef = useRef(false);
```

Layout:

CSS

```
.editor-shell {
  display: grid;
  grid-template-columns:
    var(--sidebar-width)
    6px
    minmax(0, 1fr);

  height: 100%;
  overflow: hidden;
}

.editor-shell.sidebar-collapsed {
  grid-template-columns: 0 0 minmax(0, 1fr);
}
```

### JSX

TypeScript

```
<div
  className={[
    "editor-shell",
    !isSidebarOpen && "sidebar-collapsed",
  ]
    .filter(Boolean)
    .join(" ")}
  style={
    {
      "--sidebar-width": `${sidebarWidth}px`,
    } as React.CSSProperties
  }
>
  {isSidebarOpen && (
    <aside className="student-sidebar">
      <StudentList />
    </aside>
  )}

  {isSidebarOpen && (
    <div
      className="sidebar-resize-handle"
      onPointerDown={handleResizeStart}
      role="separator"
      aria-orientation="vertical"
      aria-label="Thay đổi chiều rộng danh sách học sinh"
    />
  )}

  <main className="seat-layout-workspace">
    <button
      type="button"
      onClick={() => setIsSidebarOpen(v => !v)}
      aria-label={
        isSidebarOpen
          ? "Ẩn danh sách học sinh"
          : "Hiện danh sách học sinh"
      }
    >
      {isSidebarOpen ? "‹" : "›"}
    </button>

    <SeatLayoutEditor />
  </main>
</div>
```

### Pointer Events an toàn hơn mouse events

Khuyến nghị dùng `PointerEvent`, hỗ trợ cả mouse và touch/pen.

TypeScript

```
const handleResizeStart = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = sidebarWidth;

  resizingRef.current = true;

  event.currentTarget.setPointerCapture(event.pointerId);

  const onPointerMove = (moveEvent: PointerEvent) => {
    if (!resizingRef.current) return;

    const delta = moveEvent.clientX - startX;

    const nextWidth = Math.min(
      SIDEBAR_MAX,
      Math.max(
        SIDEBAR_MIN,
        startWidth + delta
      )
    );

    setSidebarWidth(nextWidth);
  };

  const stopResize = () => {
    resizingRef.current = false;

    window.removeEventListener(
      "pointermove",
      onPointerMove
    );

    window.removeEventListener(
      "pointerup",
      stopResize
    );

    window.removeEventListener(
      "pointercancel",
      stopResize
    );
  };

  window.addEventListener(
    "pointermove",
    onPointerMove
  );

  window.addEventListener(
    "pointerup",
    stopResize
  );

  window.addEventListener(
    "pointercancel",
    stopResize
  );
};
```

### CSS handle

CSS

```
.sidebar-resize-handle {
  width: 6px;
  cursor: col-resize;
  user-select: none;
  touch-action: none;

  position: relative;
}

.sidebar-resize-handle::after {
  content: "";
  position: absolute;
  inset: 0 2px;

  border-radius: 999px;
  opacity: 0;
  transition: opacity 120ms ease;
}

.sidebar-resize-handle:hover::after {
  opacity: 1;
}
```

Khi đang kéo, có thể thêm global class:

TypeScript

```
document.body.classList.add("is-resizing");
```

và cleanup:

TypeScript

```
document.body.classList.remove("is-resizing");
```

CSS

```
body.is-resizing {
  cursor: col-resize;
  user-select: none;
}

body.is-resizing * {
  cursor: col-resize !important;
}
```

### UX invariant

Khi collapse:

```
isSidebarOpen = false
```

nhưng **không reset `sidebarWidth`**.

Khi mở lại, giáo viên nhận đúng chiều rộng trước đó.

Có thể persist:

TypeScript

```
localStorage.setItem(
  "seat-layout-sidebar-width",
  String(sidebarWidth)
);
```

Nên debounce persistence để tránh ghi mỗi pointer move.

* * *

## 4\. Minimal Seat Node Rendering

### JSX đề xuất

TypeScript

```
type SeatNodeProps = {
  student?: {
    id: string;
    fullName: string;
    gender?: "male" | "female";
    role?: string;
  };
};

export function SeatNode({
  student,
}: SeatNodeProps) {
  if (!student) {
    return (
      <div
        className="seat-node seat-node-empty"
        aria-label="Ghế trống"
      />
    );
  }

  const genderIcon =
    student.gender === "female" ? "👧" : "👦";

  const roleIcon = getRoleIcon(student.role);

  return (
    <div className="seat-node">
      <div className="seat-student">
        <span
          className="seat-gender-icon"
          aria-hidden="true"
        >
          {genderIcon}
        </span>

        <span className="seat-student-name">
          {student.fullName}
        </span>
      </div>

      {student.role && (
        <div className="seat-role">
          <span aria-hidden="true">
            {roleIcon}
          </span>

          <span>{student.role}</span>
        </div>
      )}
    </div>
  );
}
```

Role icon mapping:

TypeScript

```
function getRoleIcon(role?: string) {
  switch (role) {
    case "Lớp trưởng":
      return "👑";

    case "Phó học tập":
      return "📚";

    case "Tổ trưởng":
      return "🚩";

    default:
      return "•";
  }
}
```

### CSS

CSS

```
.seat-node {
  height: 100%;
  min-height: 0;
  min-width: 0;

  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: center;

  padding: 3px 5px;

  overflow: hidden;
}

.seat-node-empty {
  padding: 0;
}

.seat-student {
  min-width: 0;

  display: flex;
  align-items: flex-start;
  gap: 3px;
}

.seat-gender-icon {
  flex: 0 0 auto;
  line-height: 1.2;
}

.seat-student-name {
  min-width: 0;

  font-size: var(--seat-font-size, 10pt);
  font-weight: 650;
  line-height: 1.15;

  overflow: hidden;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.seat-role {
  min-width: 0;
  margin-top: 2px;

  display: flex;
  align-items: center;
  gap: 3px;

  font-size: var(--role-font-size, 7pt);
  line-height: 1.1;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

### Tại sao dùng `-webkit-line-clamp: 2`

Đúng với yêu cầu:

```
Dòng 1:
👦 Võ Nguyễn Chí An

hoặc:
👧 Đoàn Thị Minh
   Anh

Dòng 2:
👑 Lớp trưởng
```

Tên sẽ không tăng vô hạn chiều cao làm phá A4 geometry.

### Desk rendering

Mỗi bàn nên chỉ là container, không có các nút `+ Ghế` hoặc icon hành động:

TypeScript

```
<div className="desk">
  <div className="desk-label">
    Bàn {desk.displayIndex}
  </div>

  <div className="desk-seats">
    {desk.seats.map(seat => (
      <SeatNode
        key={seat.id}
        student={studentBySeatId[seat.id]}
      />
    ))}
  </div>
</div>
```

Nếu muốn sát mẫu Excel hơn, thậm chí label `Bàn N` chỉ hiển thị ở editor/debug mode, còn print mode có thể bỏ hoàn toàn:

TypeScript

```
{mode === "editor" && (
  <div className="desk-label">
    Bàn {desk.displayIndex}
  </div>
)}
```

CSS:

CSS

```
.desk-seats {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.desk-seats > * + * {
  border-left: 1px solid currentColor;
}
```

Như vậy tạo đúng hiệu ứng **một bàn liền khối, chia hai ô ghế**, gần với Excel template.

* * *

## 5\. Blueprint tổng thể khuyến nghị

```
ClassroomLayoutFeature
│
├── domain/
│   ├── types.ts
│   ├── reindexClassroomLayout.ts
│   ├── validateLayout.ts
│   └── mutations.ts
│
├── state/
│   └── useClassroomLayoutStore.ts
│
├── components/
│   ├── SeatLayoutEditor.tsx
│   ├── StudentSidebar.tsx
│   ├── SidebarResizeHandle.tsx
│   ├── ClassroomGrid.tsx
│   ├── DeskRow.tsx
│   ├── Desk.tsx
│   └── SeatNode.tsx
│
└── print/
    ├── SeatLayoutPrint.tsx
    └── seat-layout-print.css
```

### Luồng mutation chuẩn

```
UI Action
   ↓
Domain Mutation
   ↓
reindexClassroomLayout()
   ↓
validateLayout()
   ↓
State Commit
   ↓
Persist
```

### Luồng render chuẩn

```
Interactive State
   ├── StudentSidebar (resizable/collapsible)
   └── Editor Grid

Same Normalized Layout
   ↓
SeatLayoutPrint
   ↓
Fixed 297mm × 210mm geometry
   ↓
PDF / Print
```

## Quyết định kiến trúc cốt lõi

1. **Stable IDs không reindex; chỉ reindex display indexes.** Đây là quyết định quan trọng nhất để bảo toàn `assignments`.
2. `reindexClassroomLayout()` phải là normalization boundary duy nhất sau add/delete/reorder.
3. Print A4 dùng **fixed physical dimensions + CSS Grid `minmax(0, 1fr)`**, không phụ thuộc chiều cao nội dung tự nhiên.
4. Số hàng bàn quyết định density và chiều cao bàn tự động; hỗ trợ trực tiếp 4×4, 4×5, 4×6.
5. Sidebar resize dùng Pointer Events, clamp min/max, cleanup đầy đủ, collapse không làm mất width.
6. Seat node chỉ chứa **gender icon + tên tối đa 2 dòng + role compact tùy chọn**.
7. Tách `SeatLayoutPrint` khỏi editor DOM để đảm bảo PDF luôn deterministic và không bao giờ kéo controls/sidebar sang trang in.