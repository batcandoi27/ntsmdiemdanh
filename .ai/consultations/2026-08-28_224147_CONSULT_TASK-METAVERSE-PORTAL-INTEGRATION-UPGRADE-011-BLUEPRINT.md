⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là kiến trúc và Execution Plan đề xuất cho TASK-METAVERSE-PORTAL-INTEGRATION-UPGRADE-011.

## 1\. Kiến trúc ánh xạ tọa độ `FloorPlan` → `IsometricRoomView`

### Nguyên tắc: một nguồn dữ liệu duy nhất

Không để `IsometricRoomView` có danh sách nội thất/mockup riêng. Cả mặt bằng và phối cảnh phải đọc cùng nguồn:

TypeScript

```
floorPlan.placedItems
```

Đề xuất mô hình:

TypeScript

```
type PlacedItem = {
  id: string;
  itemId: string;
  x: number;        // tọa độ logical/grid
  y: number;
  width?: number;
  height?: number;
  rotation?: 0 | 90 | 180 | 270;
  zIndex?: number;
};
```

Nếu hiện tại `FloorPlan` dùng đơn vị pixel thay vì grid, vẫn giữ nguyên schema hiện có và tạo adapter chuyển đổi. Không nên ép migrate toàn bộ dữ liệu ngay trong task này nếu không cần thiết.

### Hàm projection chuẩn

Với grid:

TypeScript

```
const isoProject = (
  x: number,
  y: number,
  tileWidth: number,
  tileHeight: number,
) => ({
  screenX: (x - y) * (tileWidth / 2),
  screenY: (x + y) * (tileHeight / 2),
});
```

Sau đó cộng origin của phòng:

TypeScript

```
const point = isoProject(item.x, item.y, TILE_W, TILE_H);

const left = ROOM_ORIGIN_X + point.screenX;
const top = ROOM_ORIGIN_Y + point.screenY;
```

### Nếu `floorPlan` đang lưu tọa độ pixel

Tách rõ ba không gian:

1. **Plan space** — tọa độ lưu trong editor.
2. **Logical grid space** — tọa độ chuẩn hóa.
3. **Isometric screen space** — tọa độ render.

TypeScript

```
function floorPlanToGrid(item: PlacedItem, cellSize: number) {
  return {
    x: item.x / cellSize,
    y: item.y / cellSize,
  };
}

function gridToIsometric(x: number, y: number) {
  return {
    x: (x - y) * TILE_WIDTH / 2,
    y: (x + y) * TILE_HEIGHT / 2,
  };
}
```

Pipeline:

```
floorPlan.placedItems
        ↓
normalizeFloorItem()
        ↓
logical x / y
        ↓
projectToIsometric()
        ↓
apply asset anchor + rotation + scale
        ↓
IsometricRoomItem
```

### Tạo module mapping riêng

Khuyến nghị:

```
src/
  lib/
    floorplan/
      normalizePlacedItem.ts
      isometricProjection.ts
      roomSceneMapper.ts
```

API:

TypeScript

```
export function mapPlacedItemToIsoScene(
  item: PlacedItem,
  options: IsoSceneOptions,
): IsoRenderableItem;
```

Điều này giúp `IsometricRoomView` chỉ chịu trách nhiệm render, không chứa business logic ánh xạ.

### Z-index/depth sorting

Không dùng thứ tự mảng để quyết định vật nào đứng trước. Với isometric:

TypeScript

```
const depth = item.x + item.y;
```

Hoặc chính xác hơn với item có kích thước:

TypeScript

```
const depth =
  item.x +
  item.y +
  (item.width ?? 1) +
  (item.height ?? 1);
```

Sau đó:

TypeScript

```
items.sort((a, b) => a.depth - b.depth);
```

Nên có override:

TypeScript

```
manualZIndex?: number;
```

để xử lý các asset đặc biệt.

### Quy tắc quan trọng

- Không mutate `floorPlan.placedItems`.
- Không dùng random position trong `IsometricRoomView`.
- Cùng một `floorPlan` phải render cùng bố cục ở cả editor và isometric view.
- Asset registry quyết định sprite/size/anchor:

TypeScript

```
const FURNITURE_REGISTRY = {
  desk: {
    asset: "/assets/furniture/desk.svg",
    anchor: "bottom-center",
  },
};
```

Nhờ vậy dữ liệu placement không bị trộn với thông tin presentation.

* * *

## 2\. Rank Insignia trực tiếp trên `SvgPet`

### Không dùng emoji `⭐` làm implementation chính

Emoji khác nhau giữa OS/browser và khó kiểm soát kích thước. Nên render bằng SVG primitive hoặc reusable SVG component.

Đề xuất API:

TypeScript

```
type PetRank = 1 | 2 | 3 | 4 | 5;

type SvgPetProps = {
  rank?: PetRank;
  // existing props...
};
```

Cấu trúc:

TypeScript

```
<svg viewBox="0 0 200 200">
  <PetBody />
  <PetAccessories />

  <RankInsignia rank={rank} />
</svg>
```

### Thiết kế badge

Ưu tiên **1 huy hiệu + số sao** thay vì 5 emoji rời rạc:

TypeScript

```
function RankInsignia({ rank }: { rank: number }) {
  return (
    <g transform="translate(145 12)">
      <circle r="24" />
      <text
        x="0"
        y="7"
        textAnchor="middle"
      >
        {rank}
      </text>
      {/* optional star/rank bars */}
    </g>
  );
}
```

Hoặc dạng 5 sao:

TypeScript

```
{Array.from({ length: 5 }).map((_, index) => (
  <Star
    key={index}
    filled={index < rank}
    x={...}
    y={...}
  />
))}
```

### Kiến trúc tốt hơn: SVG symbol

Nếu nhiều pet cùng dùng:

TypeScript

```
<defs>
  <symbol id="rank-star">...</symbol>
</defs>
```

Sau đó:

TypeScript

```
<use href="#rank-star" />
```

Hoặc component `RankInsignia` nếu React SVG structure hiện tại đã modular.

### Accessibility

Badge không chỉ mang tính trang trí nếu cấp bậc có ý nghĩa:

TypeScript

```
<g aria-label={`Cấp bậc ${rank}: ${rank} trên 5 sao`}>
```

Nếu purely decorative:

TypeScript

```
aria-hidden="true"
```

### Kiểm thử

- rank 1..5 render đúng.
- rank undefined không render.
- rank không hợp lệ được clamp hoặc reject.
- badge không vượt `viewBox`.
- không che vùng mặt chính của pet.

* * *

## 3\. Hệ thống ánh sáng 3 buổi: `Day / Dusk / Night`

Nên tách thành một scene environment provider:

TypeScript

```
type TimeOfDay = "day" | "dusk" | "night";
```

### Hàm xác định theo giờ

TypeScript

```
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return "day";
  if (hour >= 12 && hour < 18) return "dusk";
  return "night";
}
```

Theo đúng yêu cầu:

| Khoảng | Mode |
| --- | --- |
| 06:00–12:00 | `day` |
| 12:00–18:00 | `dusk` |
| 18:00–06:00 | `night` |

### State có auto/manual override

TypeScript

```
type SceneTimeState = {
  mode: "auto" | "manual";
  selectedPeriod?: TimeOfDay;
};
```

Resolver:

TypeScript

```
function resolveScenePeriod(
  mode: "auto" | "manual",
  selectedPeriod?: TimeOfDay,
): TimeOfDay {
  if (mode === "manual" && selectedPeriod) {
    return selectedPeriod;
  }

  return getTimeOfDay(new Date().getHours());
}
```

### Theme config, không rải `if` trong JSX

TypeScript

```
const SCENE_THEMES = {
  day: {
    skyGradient: "...",
    ambientOpacity: 0.08,
    windowGlow: 0.15,
    overlay: "none",
  },
  dusk: {
    skyGradient: "...",
    ambientOpacity: 0.18,
    windowGlow: 0.45,
    overlay: "...",
  },
  night: {
    skyGradient: "...",
    ambientOpacity: 0.42,
    windowGlow: 0.85,
    overlay: "...",
  },
} as const;
```

`IsometricRoomView`:

TypeScript

```
const period = useSceneTimePeriod();
const theme = SCENE_THEMES[period];

return (
  <div
    className="isometric-room"
    data-period={period}
    style={{
      background: theme.skyGradient,
    }}
  >
    <RoomWindows glow={theme.windowGlow} />
    <RoomItems items={mappedItems} />
    <AmbientLighting opacity={theme.ambientOpacity} />
  </div>
);
```

### Layer order

Khuyến nghị:

```
1. Sky / background
2. Building shell
3. Floor
4. Furniture depth-sorted
5. Pets / characters
6. Window light
7. Ambient light overlay
8. Atmospheric particles
9. UI controls
```

Tránh áp opacity lên parent container vì sẽ làm toàn bộ furniture/pet bị tối không đúng vật lý. Dùng overlay layer riêng.

### Auto update

Nếu dùng thời gian thực, không cần update mỗi giây:

TypeScript

```
useEffect(() => {
  const id = setInterval(refreshPeriod, 60_000);
  return () => clearInterval(id);
}, []);
```

* * *

## 4\. Toàn bộ 43 linh vật trong `ClassroomWorldGrid`

Phải bỏ hard-limit kiểu:

TypeScript

```
students.slice(0, 9)
```

Thay bằng:

TypeScript

```
students.map(...)
```

### Không nên tạo 43 animation loop riêng

Đề xuất deterministic animation:

TypeScript

```
function getPetMotion(index: number, studentId: string) {
  const seed = hash(`${studentId}-${index}`);

  return {
    delay: seed % 2,
    duration: 3 + (seed % 20) / 10,
    driftX: 6 + (seed % 8),
    driftY: 4 + (seed % 5),
  };
}
```

Mỗi pet:

TypeScript

```
<div
  style={{
    animationDelay: `${motion.delay}s`,
    animationDuration: `${motion.duration}s`,
  }}
>
```

CSS animation với `transform`, không animate `left/top` liên tục.

### Phân bố 43 pet

Không random mỗi render. Dùng deterministic seed để pet không "teleport" khi state cập nhật.

```
studentId
    ↓ hash
stable seed
    ↓
spawn zone + offset + animation phase
```

Có thể chia world thành zone:

TypeScript

```
const zones = [
  "plaza-north",
  "plaza-center",
  "plaza-east",
  "plaza-west",
  "garden",
];
```

Thuật toán round-robin hoặc seeded allocation.

### Responsive

43 pet trên mobile có thể quá dày. Vẫn render đủ 43 nhưng dùng world rộng hơn + camera/scroll/pan, không ẩn 34 pet chỉ vì viewport nhỏ.

* * *

## 5\. Điều chỉnh Shop Economy

Không hardcode giá ở nhiều component. Một source:

TypeScript

```
type ShopItem = {
  id: string;
  name: string;
  price: number;
};
```

Rà soát catalog và đưa giá vào khoảng **80–450 Xu**.

Một ladder hợp lý:

| Nhóm | Giá |
| --- | --- |
| Vật phẩm phổ thông | 80–120 |
| Decoration | 130–200 |
| Nội thất tốt | 220–300 |
| Rare | 320–380 |
| Premium/Signature | 400–450 |

Quan trọng: test toàn bộ item:

TypeScript

```
expect(item.price).toBeGreaterThanOrEqual(80);
expect(item.price).toBeLessThanOrEqual(450);
```

Ngoại lệ miễn phí chỉ nên tồn tại nếu product rule chính thức cho phép.

* * *

## 6\. Tích hợp Metaverse vào `/student`

Kiến trúc route đề xuất:

```
/student
├── StudentDashboard
│   ├── Header / Student summary
│   ├── ClassroomWorldGrid
│   ├── Quick actions
│   └── Compact progress widgets
│
/student/quests
└── QuestCenter
    ├── Weekly quests
    ├── Submission form
    ├── Direct upload
    └── Drive / YouTube links
```

Trên `/student`, `ClassroomWorldGrid` phải là hero/live area thay vì một tab bị chôn sâu.

Nếu framework hiện tại dùng routing khác, giữ convention hiện hữu; không tự ý chuyển toàn bộ route architecture.

* * *

## 7\. Upload File + Google Drive/YouTube

### Data model

TypeScript

```
type SubmissionAttachment =
  | {
      type: "upload";
      fileId: string;
      url: string;
      mimeType: string;
      name: string;
    }
  | {
      type: "external";
      provider: "google-drive" | "youtube";
      url: string;
    };
```

### UI

```
[Nộp minh chứng]

┌─────────────────────────────────┐
│ Tải file / ảnh                  │
│ [Chọn file]                     │
│ [thumbnail preview nếu là ảnh]  │
└─────────────────────────────────┘

                    HOẶC

[Google Drive / YouTube URL              ] [Kiểm tra]
                                          
✓ Google Drive hợp lệ
hoặc
✗ Link không hợp lệ
```

### Validation

Không chỉ check bằng regex chung chung. Tách provider parser:

TypeScript

```
function detectExternalProvider(url: string) {
  // Google Drive patterns
  // YouTube / youtu.be patterns
}
```

Nên trả về:

TypeScript

```
type LinkValidationResult = {
  valid: boolean;
  provider?: "google-drive" | "youtube";
  normalizedUrl?: string;
  error?: string;
};
```

**Lưu ý bảo mật:** client-side validation chỉ để UX. Backend vẫn phải validate URL, MIME type, size và quyền upload.

* * *

# Execution Plan cho Antigravity

## Phase 0 — Discovery, không refactor mù

1. Xác định các component hiện hữu:
   
   - `SvgPet`
   - `ClassroomWorldGrid`
   - `IsometricRoomView`
   - `FloorPlan` type/store
   - student route/dashboard
   - quest/submission form
   - shop catalog
2. Tìm:
   
   - mock furniture trong `IsometricRoomView`
   - `.slice(0, 9)` hoặc limit tương tự
   - hardcoded shop prices
   - duplicated coordinate logic
   - current file upload mechanism
3. Ghi dependency map trước khi sửa.

**Definition of done:** biết chính xác file ownership và data flow của cả 6 hạng mục.

* * *

## Phase 1 — Foundation/Data Contracts

Triển khai trước các pure utilities:

```
floorPlan normalization
→ isometric projection
→ scene item mapper

time resolver
→ scene theme resolver

rank validation
→ RankInsignia

external link validator
```

Viết unit tests trước/song song:

```
isometricProjection.test
sceneTime.test
rankInsignia.test
externalLinkValidation.test
```

**Không phụ thuộc UI snapshot để test toàn bộ logic.**

* * *

## Phase 2 — Isometric synchronization

1. Xóa/mock static furniture path.
2. `IsometricRoomView` consume `floorPlan.placedItems`.
3. Normalize placement.
4. Project to isometric coordinates.
5. Depth sort.
6. Render via furniture registry.
7. Verify cùng dữ liệu tạo cùng bố cục logical.

Acceptance:

- Thêm item ở FloorPlan → xuất hiện ở Isometric view.
- Di chuyển item → vị trí thay đổi tương ứng.
- Xóa item → biến mất.
- Không còn danh sách furniture mock độc lập.

* * *

## Phase 3 — Pet rank + 43 creatures

1. Thêm `rank` vào props/data flow của `SvgPet`.
2. Render `RankInsignia`.
3. Remove 9-pet cap.
4. Stable deterministic positioning cho 43 pet.
5. CSS transform animation.
6. Kiểm tra desktop/mobile và giảm motion nếu `prefers-reduced-motion`.

Acceptance:

```
43/43 students represented
rank 1..5 visually distinct
no unstable random teleporting
reduced-motion respected
```

* * *

## Phase 4 — Day/Dusk/Night scene

1. Implement `SceneTimeProvider` hoặc equivalent hook.
2. Auto resolver.
3. Manual selector cho testing/demo.
4. Centralize `SCENE_THEMES`.
5. Render sky/window/ambient as separate layers.
6. Timer cleanup.
7. Test boundary hours: 06, 12, 18, 00.

Acceptance:

```
06:00 => day
11:59 => day
12:00 => dusk
17:59 => dusk
18:00 => night
05:59 => night
```

* * *

## Phase 5 — Student portal route integration

1. Đưa `ClassroomWorldGrid` lên `/student`.
2. Giữ dashboard summary cần thiết.
3. Chuyển quest detail sang `/student/quests`.
4. Update navigation/deep links.
5. Test refresh/direct navigation `/student/quests`.

Acceptance:

- Login vào `/student` thấy metaverse ngay.
- Quest route hoạt động độc lập.
- Không broken back navigation.

* * *

## Phase 6 — Submission + Shop economy

### Submission

- Direct file input.
- Image thumbnail preview.
- Remove/replace attachment.
- Google Drive/YouTube URL.
- Validate button + inline status.
- Backend validation.

### Shop

- Centralized catalog.
- Rebalance 80–450 Xu.
- Boundary tests.
- Kiểm tra purchase logic vẫn dùng giá mới từ source thống nhất.

* * *

# Automated Testing Matrix

## Unit

```
✓ floorPlan → grid normalization
✓ grid → iso projection
✓ depth calculation
✓ day/dusk/night boundaries
✓ rank 1..5
✓ invalid rank
✓ Drive URL recognition
✓ YouTube URL recognition
✓ invalid external URL
✓ shop price bounds
```

## Component

```
✓ SvgPet displays RankInsignia
✓ ClassroomWorldGrid renders all students
✓ IsometricRoomView renders placedItems
✓ file input shows image preview
✓ external link validation feedback
✓ manual scene selector changes scene
```

## Integration

```
✓ FloorPlan change propagates to IsometricRoomView
✓ /student contains ClassroomWorldGrid
✓ /student/quests contains quest workflow
✓ valid evidence can be submitted
✓ invalid evidence is blocked
```

## E2E

Happy path:

```
Login
→ /student
→ see ClassroomWorldGrid
→ verify all classroom avatars loaded
→ open quest area
→ /student/quests
→ attach image
→ preview image
→ enter valid Drive/YouTube URL
→ validate
→ submit
```

Visual path:

```
Seed FloorPlan
→ screenshot isometric scene
→ verify expected furniture placement

Set time day
→ screenshot
Set time dusk
→ screenshot
Set time night
→ screenshot
```

* * *

# Thứ tự triển khai tối ưu

```
1. Discovery + data contracts
2. FloorPlan → Isometric mapping
3. Automated tests cho mapping
4. Day/Dusk/Night engine
5. SvgPet RankInsignia
6. 43-pet world rendering
7. /student + /student/quests routing
8. Evidence upload/link validation
9. Shop rebalance
10. Full regression + E2E + visual QA
```

**Quyết định kiến trúc quan trọng nhất:** biến `floorPlan.placedItems` thành single source of truth, tách projection/time/theme/validation thành pure modules có test, và để UI components chủ yếu làm nhiệm vụ composition/rendering. Điều này giảm mạnh nguy cơ 6 hạng mục mới tạo thêm state duplicated hoặc mock data drift.