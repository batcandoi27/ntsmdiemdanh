⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là blueprint kiến trúc đề xuất cho RFC 004, tập trung vào 3 hạng mục cần tư vấn.

## 1\. Balanced Multi-Row Seating Algorithm

### Mục tiêu bất biến

Với:

- `N` = số học sinh
- `K` = số tổ/dãy còn hoạt động

Sau khi auto-arrange:

```
max(teamSize) - min(teamSize) <= 1
```

Ví dụ `N = 39`, `K = 4`:

```
10 | 10 | 10 | 9
```

Không được phép sinh kết quả kiểu:

```
12 | 12 | 11 | 0
```

### Phân tầng thuật toán đề xuất

Nên tách thành 3 pha:

```
Student Pool
    │
    ▼
[1. Normalize & classify]
    │
    ▼
[2. Gender-aware balanced ordering]
    │
    ▼
[3. Round-robin / horizontal desk sweep]
    │
    ▼
Balanced assignments
```

### Pha 1 — Tính quota chính xác cho từng tổ

TypeScript

```
function calculateBalancedQuotas(studentCount: number, rowCount: number): number[] {
  if (rowCount <= 0) return [];

  const base = Math.floor(studentCount / rowCount);
  const remainder = studentCount % rowCount;

  return Array.from(
    { length: rowCount },
    (_, index) => base + (index < remainder ? 1 : 0)
  );
}
```

Ví dụ:

| N | K | Quota |
| --- | --- | --- |
| 39 | 4 | `[10, 10, 10, 9]` |
| 40 | 4 | `[10, 10, 10, 10]` |
| 41 | 4 | `[11, 10, 10, 10]` |
| 7 | 4 | `[2, 2, 2, 1]` |

Đây là lớp bảo đảm **hard constraint**: chênh lệch số học sinh giữa các tổ tối đa 1.

* * *

### Pha 2 — Gender-aware interleaving

Không nên chỉ `shuffle()` toàn bộ danh sách, vì một tổ có thể ngẫu nhiên nhận quá nhiều nam hoặc nữ.

Đề xuất:

1. Chia học sinh thành các bucket:
   
   ```
   male[]
   female[]
   other/unspecified[]
   ```
2. Shuffle có seed nếu cần reproducibility.
3. Tạo chuỗi phân phối xen kẽ theo bucket lớn nhất/nhỏ nhất.

Ví dụ:

```
Male:   M1 M2 M3 M4 ...
Female: F1 F2 F3 F4 ...

Interleaved:
M1 F1 M2 F2 M3 F3 M4 F4 ...
```

Nếu tỷ lệ lệch, thuật toán tiếp tục lấy từ bucket còn học sinh.

TypeScript

```
function interleaveStudents(
  male: Student[],
  female: Student[],
  other: Student[]
): Student[] {
  const buckets = [
    shuffle([...male]),
    shuffle([...female]),
    shuffle([...other]),
  ].filter(bucket => bucket.length > 0);

  const result: Student[] = [];

  while (buckets.some(bucket => bucket.length > 0)) {
    // Bucket currently largest first helps avoid long runs
    buckets.sort((a, b) => b.length - a.length);

    for (const bucket of buckets) {
      const student = bucket.shift();
      if (student) result.push(student);
    }
  }

  return result;
}
```

Nếu giới tính trong dữ liệu chỉ gồm Nam/Nữ, có thể dùng thuật toán alternating đơn giản hơn.

* * *

### Pha 3 — Desk-level Horizontal Sweep

Đây là phần quan trọng nhất để tránh lỗi "lấp đầy Tổ 1 rồi mới đến Tổ 2".

Giả sử mỗi tổ có nhiều bàn theo chiều dọc:

```
Tổ 1    Tổ 2    Tổ 3    Tổ 4

Desk 1:  A       B       C       D
Desk 2:  E       F       G       H
Desk 3:  I       J       K       L
...
```

Thuật toán duyệt **ngang qua tất cả tổ trước**, sau đó mới chuyển xuống desk level tiếp theo.

TypeScript

```
function distributeRoundRobin<T>(
  items: T[],
  quotas: number[]
): T[][] {
  const groups = quotas.map(() => [] as T[]);
  let cursor = 0;

  for (const item of items) {
    let attempts = 0;

    while (
      groups[cursor].length >= quotas[cursor] &&
      attempts < groups.length
    ) {
      cursor = (cursor + 1) % groups.length;
      attempts++;
    }

    if (attempts === groups.length) {
      throw new Error("No available group capacity");
    }

    groups[cursor].push(item);
    cursor = (cursor + 1) % groups.length;
  }

  return groups;
}
```

Với 39 học sinh:

```
Sweep 1:
T1 T2 T3 T4

Sweep 2:
T1 T2 T3 T4

...

Final:
T1 = 10
T2 = 10
T3 = 10
T4 = 9
```

### Khuyến nghị kiến trúc

Tôi đề xuất hàm domain-level duy nhất:

TypeScript

```
interface BalancedDistributionOptions {
  rowCount: number;
  preserveGenderBalance?: boolean;
  shuffle?: boolean;
  seed?: string;
}

function autoArrangeBalanced(
  students: Student[],
  options: BalancedDistributionOptions
): RowAssignment[] {
  const quotas = calculateBalancedQuotas(
    students.length,
    options.rowCount
  );

  const orderedStudents = options.preserveGenderBalance
    ? interleaveByGender(students, options)
    : shuffleStudents(students, options);

  const groups = distributeRoundRobin(
    orderedStudents,
    quotas
  );

  return groups.map((studentGroup, rowIndex) => ({
    rowIndex,
    studentIds: studentGroup.map(s => s.id),
  }));
}
```

**Điểm quan trọng:** UI không tự quyết định cách phân bổ. `autoArrangeBalanced()` nên là pure domain function để dễ unit test.

### Test bắt buộc

TypeScript

```
expect(
  Math.max(...sizes) - Math.min(...sizes)
).toBeLessThanOrEqual(1);
```

Với `39/4`:

TypeScript

```
expect(sizes.sort()).toEqual([9, 10, 10, 10]);
```

Nên property-test nhiều tổ hợp:

```
N = 0..100
K = 1..20
```

và kiểm tra:

```
sum(groupSizes) === N
max(groupSizes) - min(groupSizes) <= 1
no duplicate student IDs
all student IDs assigned exactly once
```

* * *

## 2\. Thiết kế command `deleteRow` an toàn

### Nguyên tắc

Không nên xóa trực tiếp một mảng row rồi để assignments trở thành orphan.

Command phải là một transaction logic:

```
VALIDATE
   ↓
SNAPSHOT
   ↓
REMOVE TARGET ROW
   ↓
REINDEX REMAINING ROWS
   ↓
PRESERVE / RECONCILE ASSIGNMENTS
   ↓
VALIDATE INVARIANTS
   ↓
COMMIT
```

### Khuyến nghị: không làm mất học sinh

Có 2 trường hợp cần phân biệt.

#### Trường hợp A — Xóa Tổ trống

```
T1 = 10
T2 = 10
T3 = 10
T4 = 0
```

Chỉ cần:

1. Xóa `T4`
2. Reindex:
   
   ```
   T1 -> Tổ 1
   T2 -> Tổ 2
   T3 -> Tổ 3
   ```
3. Không thay đổi assignments của tổ còn lại.

#### Trường hợp B — Xóa Tổ có học sinh

Ví dụ:

```
T1 = 10
T2 = 10   ← delete
T3 = 10
T4 = 9
```

Nếu xóa T2 mà discard 10 học sinh là nguy hiểm.

Đề xuất policy mặc định:

```
DELETE ROW
= remove row container
+ collect affected students
+ redistribute affected students
+ preserve all remaining assignments where possible
```

Tức là học sinh ở T1/T3/T4 **không bị thay đổi** nếu còn chỗ hợp lệ; chỉ học sinh orphan từ row bị xóa mới được đặt lại.

### Command shape

TypeScript

```
type DeleteRowMode =
  | "reject-if-not-empty"
  | "redistribute-students";

interface DeleteRowCommand {
  layoutId: string;
  rowId: string;
  mode?: DeleteRowMode;
}
```

Implementation logic:

TypeScript

```
function deleteRow(
  state: SeatLayoutState,
  command: DeleteRowCommand
): SeatLayoutState {
  const targetIndex = state.rows.findIndex(
    row => row.id === command.rowId
  );

  if (targetIndex === -1) {
    throw new DomainError("ROW_NOT_FOUND");
  }

  const targetRow = state.rows[targetIndex];
  const affectedStudentIds = getAssignedStudentIds(targetRow);

  if (
    affectedStudentIds.length > 0 &&
    command.mode === "reject-if-not-empty"
  ) {
    throw new DomainError("ROW_NOT_EMPTY");
  }

  const snapshot = structuredClone(state);

  try {
    // 1. Remove target row
    const remainingRows = state.rows.filter(
      row => row.id !== command.rowId
    );

    // Prevent invalid zero-row layout if required by domain
    if (remainingRows.length === 0) {
      throw new DomainError("CANNOT_DELETE_LAST_ROW");
    }

    // 2. Reindex display order only
    const reindexedRows = remainingRows.map((row, index) => ({
      ...row,
      order: index,
      label: `Tổ ${index + 1}`,
    }));

    // 3. Preserve assignments in remaining rows
    let nextState = {
      ...state,
      rows: reindexedRows,
    };

    // 4. Re-home affected students only
    if (affectedStudentIds.length > 0) {
      nextState = redistributeStudentsIntoRows(
        nextState,
        affectedStudentIds
      );
    }

    // 5. Domain validation
    validateLayout(nextState);

    return nextState;
  } catch (error) {
    return snapshot;
  }
}
```

### Lưu ý quan trọng: Reindex `order`, không reindex identity

Không nên dùng:

```
row.id = "row-1"
row.id = "row-2"
```

sau mỗi lần xóa.

Nên giữ stable ID:

```
id: "row_8fa..."
order: 0
label: "Tổ 1"
```

Sau khi xóa:

```
id giữ nguyên
order thay đổi
label thay đổi
```

Điều này bảo toàn:

- React keys
- undo/redo history
- assignment references
- collaboration/event logs
- persistence integrity

### Redistribute sau khi xóa

Có hai chiến lược UX.

**Strategy 1 — Preserve-first, khuyến nghị**

```
Các assignment còn lại: giữ nguyên
↓
Tính sức chứa còn trống
↓
Chỉ phân bổ học sinh từ tổ bị xóa
```

Ưu điểm: thao tác xóa không gây "xáo trộn cả lớp".

**Strategy 2 — Full rebalance**

```
Xóa tổ
↓
Thu thập toàn bộ học sinh
↓
Chạy autoArrangeBalanced lại từ đầu
```

Ưu điểm: đảm bảo cân bằng tối đa.

Khuyến nghị UX:

```
🗑️ Xóa Tổ 3?

Tổ này đang có 9 học sinh.

[Hủy]
[Chuyển 9 học sinh sang các tổ khác]
[Cân bằng lại toàn bộ sơ đồ]
```

Trong đó:

- Default an toàn: `Chuyển ...`
- Tùy chọn tối ưu cân bằng: `Cân bằng lại ...`

### Invariants sau `deleteRow`

TypeScript

```
assertUniqueRowIds(state);
assertContiguousRowOrder(state);
assertNoDuplicateStudentAssignments(state);
assertNoOrphanAssignments(state);
assertAllSeatReferencesExist(state);
assertAtLeastOneRow(state);
```

* * *

## 3\. Palette chuẩn cho 7 chức vụ

Đề xuất dùng semantic tokens, không hard-code màu trực tiếp trong component.

TypeScript

```
export const ROLE_THEME = {
  CLASS_MONITOR: {
    label: "Lớp trưởng",
    icon: "👑",
    color: {
      fg: "#B45309",
      bg: "#FEF3C7",
      border: "#F59E0B",
    },
  },

  VICE_MONITOR_ACADEMIC: {
    label: "Lớp phó học tập",
    icon: "📚",
    color: {
      fg: "#3730A3",
      bg: "#E0E7FF",
      border: "#6366F1",
    },
  },

  VICE_MONITOR_DISCIPLINE: {
    label: "Lớp phó kỷ luật",
    icon: "⚖️",
    color: {
      fg: "#9F1239",
      bg: "#FFE4E6",
      border: "#F43F5E",
    },
  },

  VICE_MONITOR_ACTIVITY: {
    label: "Lớp phó phong trào",
    icon: "🎨",
    color: {
      fg: "#6B21A8",
      bg: "#F3E8FF",
      border: "#A855F7",
    },
  },

  TEAM_LEADER: {
    label: "Tổ trưởng",
    icon: "🚩",
    color: {
      fg: "#047857",
      bg: "#D1FAE5",
      border: "#10B981",
    },
  },

  TEAM_DEPUTY: {
    label: "Tổ phó",
    icon: "🏳️",
    color: {
      fg: "#0F766E",
      bg: "#CCFBF1",
      border: "#14B8A6",
    },
  },

  TREASURER: {
    label: "Thủ quỹ",
    icon: "💰",
    color: {
      fg: "#C2410C",
      bg: "#FFEDD5",
      border: "#F97316",
    },
  },
} as const;
```

### Mapping theo yêu cầu RFC

| Chức vụ | Semantic | Foreground | Background | Border |
| --- | --- | --- | --- | --- |
| 👑 Lớp trưởng | Amber/Gold | `#B45309` | `#FEF3C7` | `#F59E0B` |
| 📚 Lớp phó học tập | Indigo | `#3730A3` | `#E0E7FF` | `#6366F1` |
| ⚖️ Lớp phó kỷ luật | Rose/Red | `#9F1239` | `#FFE4E6` | `#F43F5E` |
| 🎨 Lớp phó phong trào | Purple | `#6B21A8` | `#F3E8FF` | `#A855F7` |
| 🚩 Tổ trưởng | Emerald | `#047857` | `#D1FAE5` | `#10B981` |
| 🏳️ Tổ phó | Teal | `#0F766E` | `#CCFBF1` | `#14B8A6` |
| 💰 Thủ quỹ | Orange | `#C2410C` | `#FFEDD5` | `#F97316` |

Nên render bằng semantic class/token:

TypeScript

```
<RoleBadge role={student.role} />
```

thay vì:

TypeScript

```
<span className="bg-yellow-200 ...">
```

để print theme, dark mode và accessibility có thể xử lý tập trung.

* * *

## Khuyến nghị thêm: kiến trúc Box Tổ

Mỗi tổ nên là một aggregate UI độc lập:

```
┌─────────────────────────────┐
│ TỔ 1                    🗑️ │
├─────────────────────────────┤
│                             │
│  [Seat] [Seat]              │
│  [Seat] [Seat]              │
│  [Seat] [Seat]              │
│                             │
└─────────────────────────────┘
        │ divider
┌─────────────────────────────┐
│ TỔ 2                    🗑️ │
...
```

Model:

TypeScript

```
interface SeatRow {
  id: string;          // stable identity
  order: number;       // mutable display ordering
  label: string;       // "Tổ 1"
  theme: RowTheme;
  seats: Seat[];
}
```

Palette pastel của từng tổ nên là **theme presentation**, không gắn vào thuật toán assignment.

Ví dụ xoay vòng:

```
Tổ 1 → Indigo pastel
Tổ 2 → Emerald pastel
Tổ 3 → Amber pastel
Tổ 4 → Rose pastel
Tổ 5 → Purple pastel
```

Divider đặt giữa các `RowCard`, không phụ thuộc vào border của từng seat:

CSS

```
.seat-row + .seat-row {
  border-inline-start: 2px solid var(--row-divider);
}
```

Ở print mode, giữ background pastel bằng `print-color-adjust: exact` nếu browser hỗ trợ.

* * *

## Kiến trúc tổng thể nên chốt cho RFC 004

```
UI Components
├── PrintableHeader
├── SeatLayoutEditor
│   ├── RowCard
│   │   ├── RowHeader
│   │   │   └── DeleteRowButton
│   │   └── SeatGrid
│   └── RowDivider
└── RoleBadge
        │
        ▼
Command / Use-case Layer
├── autoArrangeBalanced()
├── deleteRow()
├── redistributeAffectedStudents()
└── rebalanceAllStudents()
        │
        ▼
Pure Domain Layer
├── calculateBalancedQuotas()
├── interleaveByGender()
├── distributeRoundRobin()
└── validateLayout()
        │
        ▼
Persistence
```

### Quyết định kiến trúc chính

1. **Auto-arrange dùng quota + gender-aware ordering + horizontal round-robin**, đảm bảo chênh lệch quy mô tổ không quá 1.
2. **`deleteRow` không được làm mất assignment**; stable `row.id` phải được giữ nguyên, chỉ reindex `order` và `label`.
3. Khi xóa tổ có học sinh, ưu tiên **preserve-first redistribution**; cung cấp tùy chọn full rebalance.
4. **7 chức vụ dùng semantic palette tokens** gồm `fg/bg/border`, không hard-code rải rác.
5. **Mỗi Tổ là unified card** có pastel background, divider rõ ràng và nút 🗑️ ngay trong `RowHeader`.
6. Toàn bộ các hàm phân bổ và validate nên là **pure functions có unit/property tests**, tách khỏi React/UI.