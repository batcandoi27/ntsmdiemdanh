⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là thiết kế kiến trúc có thể triển khai trực tiếp cho 3 yêu cầu.

## 1\. True 2.5D Isometric Floor Projection cho nội thất

### Mục tiêu

Không transform từng ảnh sprite kiểu “xoay cho đẹp” độc lập. Cần coi mỗi vật thể là một footprint trong **hệ tọa độ mặt sàn logic**, sau đó project toàn bộ tọa độ `(x, y)` sang màn hình.

Với góc isometric chuẩn:

θ\=30∘

Ta dùng:

screenX\=originX+(x−y)cos(30∘)⋅tileW

screenY\=originY+(x+y)sin(30∘)⋅tileH−z⋅elevation

Trong đó:

- `x, y`: tọa độ logic trên lưới 8×8
- `z`: độ cao vật thể
- `originX, originY`: gốc chiếu của phòng
- `tileW`: nửa chiều rộng tile theo convention này
- `tileH`: nửa chiều sâu tile
- `elevation`: số pixel cho mỗi đơn vị cao

Một implementation JavaScript/TypeScript:

TypeScript

```
type IsoPoint = {
  x: number;
  y: number;
  z?: number;
};

const ISO_30 = Math.PI / 6;

export function projectIsometric(
  point: IsoPoint,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  elevation: number,
) {
  const z = point.z ?? 0;

  return {
    x:
      originX +
      (point.x - point.y) * Math.cos(ISO_30) * tileW,

    y:
      originY +
      (point.x + point.y) * Math.sin(ISO_30) * tileH -
      z * elevation,
  };
}
```

### Dạng ma trận affine

Nếu đã có hệ sprite top-down với local coordinate `(u,v)`, dùng phép chiếu:

\[XY​\]\=\[0.70710.3535​−0.70710.3535​\]\[uv​\]+\[Tx​Ty​​\]

Tương đương SVG:

XML

```
matrix(0.7071 0.3535 -0.7071 0.3535 tx ty)
```

Hoặc về mặt CSS concept:

CSS

```
transform:
  rotate(-45deg)
  scaleY(0.5);
```

Tuy nhiên, với CSS riêng lẻ, `transform-origin` và kích thước từng sprite dễ gây lệch. Kiến trúc tốt hơn là **project tọa độ footprint bằng code**, còn sprite chỉ nhận vị trí đã project.

### Mô hình dữ liệu nội thất

Không lưu trực tiếp `left/top` theo pixel:

TypeScript

```
// Không khuyến nghị
{
  left: 234,
  top: 182
}
```

Mà lưu tọa độ thế giới:

TypeScript

```
type FurniturePlacement = {
  id: string;
  type: "rug" | "desk" | "computer" | "cabinet";
  gridX: number;
  gridY: number;

  // footprint trên lưới
  width: number;
  depth: number;

  // chiều cao hiển thị
  height?: number;

  // thứ tự render nếu cần tinh chỉnh
  renderBias?: number;
};
```

Ví dụ:

TypeScript

```
const ROOM_SIZE = 8;

const FURNITURE: FurniturePlacement[] = [
  {
    id: "rug-1",
    type: "rug",
    gridX: 1,
    gridY: 1,
    width: 2,
    depth: 2,
  },
  {
    id: "desk-1",
    type: "desk",
    gridX: 5,
    gridY: 1,
    width: 2,
    depth: 1,
    height: 1,
  },
  {
    id: "computer-1",
    type: "computer",
    gridX: 5,
    gridY: 1,
    width: 1,
    depth: 1,
    height: 2,
  },
  {
    id: "cabinet-1",
    type: "cabinet",
    gridX: 0,
    gridY: 5,
    width: 1,
    depth: 2,
    height: 3,
  },
];
```

### Bục đá trung tâm phải là vùng bị chiếm dụng thật

Yêu cầu `(3..4, 3..4)` nên được biểu diễn rõ:

TypeScript

```
const BLOCKED_CELLS = new Set([
  "3,3",
  "4,3",
  "3,4",
  "4,4",
]);

function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

function canPlaceFurniture(item: FurniturePlacement): boolean {
  for (let dx = 0; dx < item.width; dx++) {
    for (let dy = 0; dy < item.depth; dy++) {
      const x = item.gridX + dx;
      const y = item.gridY + dy;

      if (
        x < 0 ||
        x >= ROOM_SIZE ||
        y < 0 ||
        y >= ROOM_SIZE ||
        BLOCKED_CELLS.has(cellKey(x, y))
      ) {
        return false;
      }
    }
  }

  return true;
}
```

Cần kiểm tra thêm va chạm giữa các furniture footprint:

TypeScript

```
function occupiedCells(item: FurniturePlacement): string[] {
  const cells: string[] = [];

  for (let dx = 0; dx < item.width; dx++) {
    for (let dy = 0; dy < item.depth; dy++) {
      cells.push(cellKey(item.gridX + dx, item.gridY + dy));
    }
  }

  return cells;
}

function validateFurnitureLayout(items: FurniturePlacement[]) {
  const occupied = new Map<string, string>();

  for (const item of items) {
    if (!canPlaceFurniture(item)) {
      throw new Error(`Invalid placement: ${item.id}`);
    }

    for (const cell of occupiedCells(item)) {
      const existing = occupied.get(cell);

      if (existing) {
        throw new Error(
          `Furniture collision at ${cell}: ${existing} vs ${item.id}`,
        );
      }

      occupied.set(cell, item.id);
    }
  }
}
```

### Render order

Để không còn hiện tượng vật ở phía sau đè lên vật phía trước:

depth\=x+y

Sau đó sort:

TypeScript

```
function getRenderDepth(item: FurniturePlacement) {
  return (
    item.gridX +
    item.gridY +
    item.width +
    item.depth +
    (item.renderBias ?? 0)
  );
}

const renderQueue = [...FURNITURE].sort(
  (a, b) => getRenderDepth(a) - getRenderDepth(b),
);
```

Với vật cao, nên tách thành:

1. `floorShadow`
2. `base`
3. `vertical/extrusion`
4. `top/details`

Như vậy bàn, tủ, máy tính không còn là “miếng PNG/SVG phẳng dán trên sàn”.

### Shadow extrusion

Ví dụ CSS:

CSS

```
.iso-furniture {
  position: absolute;
  transform-origin: 50% 50%;
  pointer-events: auto;
}

.iso-furniture__shadow {
  position: absolute;
  inset: 8% 4% -10%;
  transform: skewX(-30deg) scaleY(0.45);
  filter: blur(4px);
  opacity: 0.22;
}

.iso-furniture__base {
  position: relative;
  z-index: 1;
}

.iso-furniture__extrusion {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -10px;
  height: 16px;
  transform: skewX(-45deg);
  transform-origin: top;
}
```

Điểm quan trọng: **shadow phải xuất phát từ footprint đã project**, không dùng shadow top-down độc lập.

* * *

## 2\. Tự động 100% Sáng / Chiều / Tối theo giờ thực

Không lưu mode vào state có nút toggle.

TypeScript

```
export type DayPhase = "morning" | "afternoon" | "night";

export function getDayPhase(date = new Date()): DayPhase {
  const hour = date.getHours();

  if (hour >= 6 && hour <= 11) {
    return "morning";
  }

  if (hour >= 12 && hour <= 17) {
    return "afternoon";
  }

  return "night";
}
```

Để UI tự đổi khi đồng hồ bước qua mốc giờ, không chỉ tính lúc mount:

TypeScript

```
import { useEffect, useState } from "react";

export function useAutomaticDayPhase() {
  const [phase, setPhase] = useState(() => getDayPhase());

  useEffect(() => {
    const update = () => setPhase(getDayPhase());

    update();

    const timer = window.setInterval(update, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  return phase;
}
```

30 giây là đủ để UI phản ứng gần như tức thì sau 06:00, 12:00 và 18:00 mà không tạo polling nặng.

### Theme mapping

TypeScript

```
export const ROOM_LIGHTING = {
  morning: {
    sky: "morning",
    sunlight: true,
    moonlight: false,
    windowGlow: 0.35,
    ambient: 1,
  },
  afternoon: {
    sky: "afternoon",
    sunlight: true,
    moonlight: false,
    windowGlow: 0.55,
    ambient: 0.88,
  },
  night: {
    sky: "night",
    sunlight: false,
    moonlight: true,
    windowGlow: 1,
    ambient: 0.52,
  },
} as const;
```

Component:

TypeScript

```
function IsometricRoom() {
  const phase = useAutomaticDayPhase();
  const lighting = ROOM_LIGHTING[phase];

  return (
    <section
      className={`iso-room iso-room--${phase}`}
      data-phase={phase}
      style={
        {
          "--ambient-light": lighting.ambient,
          "--window-glow": lighting.windowGlow,
        } as React.CSSProperties
      }
    >
      {/* floor, walls, window, furniture */}
    </section>
  );
}
```

CSS:

CSS

```
.iso-room--morning {
  --sky-overlay: rgba(255, 219, 143, 0.18);
  --sun-overlay: rgba(255, 221, 124, 0.26);
}

.iso-room--afternoon {
  --sky-overlay: rgba(255, 161, 90, 0.24);
  --sun-overlay: rgba(255, 116, 58, 0.2);
}

.iso-room--night {
  --sky-overlay: rgba(33, 46, 95, 0.42);
  --sun-overlay: rgba(122, 154, 255, 0.1);
}
```

**Yêu cầu nghiệm thu:** không có button, dropdown, localStorage preference hay query parameter nào cho phép người dùng ép `morning/afternoon/night`. Mode chỉ là derived state từ thời gian thiết bị.

* * *

## 3\. Anonymous ID `8A13_#XXX`: không dùng STT và không thể suy ngược

### Điểm cần chỉnh về yêu cầu kỹ thuật

Ví dụ:

- `8A13_#821`
- `8A13_#459`
- `8A13_#912`

là **pseudonymous identifiers**, không phải “hash” theo nghĩa mật mã nếu chỉ lấy random 3 chữ số.

Không nên làm:

TypeScript

```
const id = `8A13_#${studentIndex}`;
```

Không nên làm:

TypeScript

```
const id = `8A13_#${hash(studentId).slice(-3)}`;
```

vì 3 chữ số chỉ có 900 giá trị khả dụng từ `100..999` và rất dễ collision khi số lượng lớn hoặc có thể suy đoán mapping nếu thuật toán deterministic/public.

### Thiết kế khuyến nghị

Tách hoàn toàn:

```
internalStudentId
        ↓
 private server-side mapping
        ↓
 anonymousPublicCode
        ↓
 UI
```

UI **không bao giờ tự sinh mã từ STT**.

Bảng dữ liệu:

```
student_id          anonymous_code
internal-uuid-A     8A13_#821
internal-uuid-B     8A13_#459
internal-uuid-C     8A13_#912
```

Mapping thật phải chỉ tồn tại ở backend/database có kiểm soát truy cập.

### Sinh mã bằng CSPRNG

TypeScript

```
function randomIntInclusive(min: number, max: number): number {
  const range = max - min + 1;

  if (range <= 0 || range > 0xffffffff) {
    throw new Error("Invalid random range");
  }

  const maxUnbiased =
    Math.floor(0x100000000 / range) * range;

  const buffer = new Uint32Array(1);

  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= maxUnbiased);

  return min + (buffer[0] % range);
}
```

Sinh code với kiểm tra uniqueness:

TypeScript

```
export function createAnonymousCode(
  classPrefix: string,
  usedNumbers: Set<number>,
): string {
  const MIN = 100;
  const MAX = 999;
  const CAPACITY = MAX - MIN + 1;

  if (usedNumbers.size >= CAPACITY) {
    throw new Error(
      `Anonymous code namespace exhausted for ${classPrefix}`,
    );
  }

  let number: number;

  do {
    number = randomIntInclusive(MIN, MAX);
  } while (usedNumbers.has(number));

  usedNumbers.add(number);

  return `${classPrefix}_#${number}`;
}
```

Tuy nhiên, uniqueness phải được database bảo đảm, không chỉ dựa vào `Set` trong browser/process memory.

Ví dụ schema logic:

SQL

```
CREATE TABLE student_anonymous_identity (
  student_id UUID PRIMARY KEY,
  class_prefix VARCHAR(32) NOT NULL,
  anonymous_code VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (class_prefix, anonymous_code)
);
```

Nếu format code chứa luôn class prefix thì unique index có thể đơn giản:

SQL

```
UNIQUE (anonymous_code)
```

### Khuyến nghị mạnh hơn cho quy mô lớn

`#XXX` chỉ có 900 mã. Nếu có khả năng vượt 900 học sinh trong cùng namespace hoặc muốn giảm collision pressure:

```
8A13_#K7P4X
8A13_#Q91DM
```

Hoặc giữ đúng giao diện người dùng yêu cầu nhưng có namespace riêng cho từng lớp. Với lớp học thông thường, 3 chữ số là đủ nếu backend kiểm tra uniqueness.

### Không được tái tạo mã mỗi lần render

Sai:

TypeScript

```
const code = `8A13_#${randomIntInclusive(100, 999)}`;
```

Điều này làm học sinh đổi mã mỗi lần refresh và gây sai liên kết dữ liệu.

Đúng: sinh **một lần khi tạo identity**, lưu mapping, sau đó tái sử dụng.

TypeScript

```
interface StudentAnonymousIdentity {
  studentId: string; // private, không render public
  anonymousCode: string; // public
}
```

### Quy tắc UI toàn cục

Tạo một presentation helper duy nhất:

TypeScript

```
export function getPublicStudentLabel(student: {
  anonymousCode: string;
}): string {
  return student.anonymousCode;
}
```

Sau đó tất cả:

- Avatar
- Bản đồ lớp
- Nhà riêng
- Bảng vinh danh
- Ranking
- Activity log
- Tooltip
- Modal
- Search result
- Notification

đều chỉ render:

TypeScript

```
getPublicStudentLabel(student)
```

và không render:

TypeScript

```
student.name
student.rollNumber
student.attendanceNumber
student.classSequence
```

### Cảnh báo bảo mật quan trọng

Ẩn tên bằng mã ngẫu nhiên **không tự động đảm bảo “không thể suy ngược”** nếu UI vẫn lộ metadata như:

- STT điểm danh
- vị trí cố định trên sơ đồ lớp
- ảnh đại diện thật
- tên trong `alt`, `title`, tooltip
- URL dạng `/students/nguyen-van-a`
- response API chứa toàn bộ danh sách tên
- console/debug state
- leaderboard có timestamp và hành vi nhận diện được

Cần coi `anonymousCode` là **public identifier duy nhất trong toàn bộ lớp trình bày công khai**.

* * *

# 4\. Automated Acceptance & Terminal Test Plan

Không có quyền truy cập mới để tự chạy Terminal hoặc chỉnh sửa workspace trong phiên này, nên dưới đây là kế hoạch/lệnh nghiệm thu để chạy tại project.

## A. Unit test cho ánh sáng

Ví dụ Vitest:

TypeScript

```
import { describe, expect, it } from "vitest";
import { getDayPhase } from "./dayPhase";

describe("getDayPhase", () => {
  it("returns morning from 06:00 through 11:59", () => {
    expect(getDayPhase(new Date(2026, 0, 1, 6, 0))).toBe("morning");
    expect(getDayPhase(new Date(2026, 0, 1, 11, 59))).toBe("morning");
  });

  it("returns afternoon from 12:00 through 17:59", () => {
    expect(getDayPhase(new Date(2026, 0, 1, 12, 0))).toBe("afternoon");
    expect(getDayPhase(new Date(2026, 0, 1, 17, 59))).toBe("afternoon");
  });

  it("returns night from 18:00 through 05:59", () => {
    expect(getDayPhase(new Date(2026, 0, 1, 18, 0))).toBe("night");
    expect(getDayPhase(new Date(2026, 0, 1, 23, 59))).toBe("night");
    expect(getDayPhase(new Date(2026, 0, 1, 0, 0))).toBe("night");
    expect(getDayPhase(new Date(2026, 0, 1, 5, 59))).toBe("night");
  });
});
```

Acceptance:

```
06:00 → morning
11:59 → morning
12:00 → afternoon
17:59 → afternoon
18:00 → night
05:59 → night
```

Đặc biệt kiểm tra chính xác boundary:

```
05:59 → night
06:00 → morning
11:59 → morning
12:00 → afternoon
17:59 → afternoon
18:00 → night
```

## B. Unit test Isometric Projection

TypeScript

```
import { describe, expect, it } from "vitest";
import { projectIsometric } from "./isometric";

describe("projectIsometric", () => {
  it("projects origin to origin", () => {
    const p = projectIsometric(
      { x: 0, y: 0 },
      500,
      200,
      64,
      64,
      32,
    );

    expect(p.x).toBeCloseTo(500);
    expect(p.y).toBeCloseTo(200);
  });

  it("moves x and y in opposite screen-x directions", () => {
    const xAxis = projectIsometric(
      { x: 1, y: 0 },
      0,
      0,
      64,
      64,
      32,
    );

    const yAxis = projectIsometric(
      { x: 0, y: 1 },
      0,
      0,
      64,
      64,
      32,
    );

    expect(xAxis.x).toBeGreaterThan(0);
    expect(yAxis.x).toBeLessThan(0);

    expect(xAxis.y).toBeCloseTo(yAxis.y);
  });

  it("moves elevated objects upward", () => {
    const floor = projectIsometric(
      { x: 2, y: 2, z: 0 },
      0,
      0,
      64,
      64,
      32,
    );

    const elevated = projectIsometric(
      { x: 2, y: 2, z: 2 },
      0,
      0,
      64,
      64,
      32,
    );

    expect(elevated.y).toBeLessThan(floor.y);
  });
});
```

## C. Layout collision test

TypeScript

```
describe("room layout", () => {
  it("accepts all valid furniture", () => {
    expect(() => validateFurnitureLayout(FURNITURE)).not.toThrow();
  });

  it("rejects the central pedestal cells", () => {
    expect(
      canPlaceFurniture({
        id: "invalid",
        type: "desk",
        gridX: 3,
        gridY: 3,
        width: 1,
        depth: 1,
      }),
    ).toBe(false);
  });

  it("rejects overlapping furniture", () => {
    expect(() =>
      validateFurnitureLayout([
        {
          id: "a",
          type: "desk",
          gridX: 1,
          gridY: 1,
          width: 2,
          depth: 2,
        },
        {
          id: "b",
          type: "rug",
          gridX: 2,
          gridY: 2,
          width: 2,
          depth: 2,
        },
      ]),
    ).toThrow();
  });
});
```

## D. Anonymous code test

TypeScript

```
describe("anonymous IDs", () => {
  it("generates unique codes", () => {
    const used = new Set<number>();
    const codes = new Set<string>();

    for (let i = 0; i < 100; i++) {
      codes.add(createAnonymousCode("8A13", used));
    }

    expect(codes.size).toBe(100);
  });

  it("does not expose sequence numbers", () => {
    const used = new Set<number>();
    const first = createAnonymousCode("8A13", used);
    const second = createAnonymousCode("8A13", used);

    expect(first).toMatch(/^8A13_#\d{3}$/);
    expect(second).toMatch(/^8A13_#\d{3}$/);
    expect(first).not.toBe(second);
  });
});
```

## E. Privacy regression scan

Thêm test/source scan để tìm pattern nguy hiểm:

Bash

```
grep -RInE "8A13_0[0-9]+|rollNumber|attendanceNumber|classSequence" src
```

Nếu PowerShell trên Windows:

PowerShell

```
Get-ChildItem -Path src -Recurse -File |
  Select-String -Pattern '8A13_0[0-9]+|rollNumber|attendanceNumber|classSequence'
```

Mục tiêu: không có render public nào tạo mã theo thứ tự.

Có thể bổ sung scan cho:

PowerShell

```
Get-ChildItem -Path src -Recurse -File |
  Select-String -Pattern 'student\.name|student\.fullName|rollNumber|attendanceNumber'
```

Sau đó review thủ công các kết quả để phân biệt:

- backend/private admin: có thể hợp lệ theo access-control
- public UI: phải thay bằng `anonymousCode`

## F. Lệnh nghiệm thu tổng

Tùy scripts hiện có trong `package.json`, thứ tự nên là:

Bash

```
npm run lint
npm run typecheck
npm test
npm run build
```

Nếu dùng Vitest với coverage:

Bash

```
npm run test -- --run --coverage
```

Acceptance cuối cùng chỉ pass khi đồng thời thỏa:

-  Toàn bộ furniture dùng logical grid coordinates.
-  Không có sprite top-down bị dán trực tiếp bằng pixel coordinates.
-  Mặt sàn và footprint furniture cùng một projection model.
-  Bục `(3,3), (4,3), (3,4), (4,4)` không thể bị chiếm.
-  Không có furniture collision.
-  Depth sorting ổn định.
-  06:00–11:59 luôn Morning.
-  12:00–17:59 luôn Afternoon.
-  18:00–05:59 luôn Night.
-  Không có manual lighting control.
-  Mọi public student label dùng `anonymousCode`.
-  Không có mapping trực tiếp `STT → mã hiển thị`.
-  Anonymous code được sinh bằng CSPRNG/server-side.
-  Database/API đảm bảo uniqueness.
-  Mapping danh tính thật ↔ anonymous code không được trả cho public client.
-  Không còn tên/STT/metadata nhận diện trong avatar, map, nhà riêng, ranking, tooltip, URL và response public.

**Quyết định kiến trúc cốt lõi:** dùng một **world-grid 8×8 duy nhất** làm source of truth cho hình học phòng; dùng **derived real-time day phase** làm source of truth cho ánh sáng; và dùng **persisted CSPRNG-generated anonymous identity** làm source of truth duy nhất cho danh tính học sinh ở public UI. Ba source of truth này sẽ loại bỏ đúng ba lỗi gốc: flat 2D placement, lighting chỉnh tay, và pseudonym gắn với STT.