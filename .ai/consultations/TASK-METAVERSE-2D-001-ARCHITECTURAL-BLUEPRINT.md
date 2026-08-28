⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# Đặc tả kỹ thuật & Architecture Blueprint — Metaverse Làng Lớp Học 2D

**Task:** `TASK-METAVERSE-2D-001`  
**Phạm vi:** 8×8 world grid, Egg customization, zoning/level-gating, pet lifecycle, Wandering AI, animation, interaction và đồng bộ realtime.

## 1\. Kiến trúc mục tiêu

Nên tách hệ thống thành **4 lớp rõ ràng**:

```
Supabase/Postgres
      │
      ├── student_pets
      ├── student_world_plots
      └── pet_world_states        ← trạng thái vị trí động
               │
               ▼
       World Domain Engine
      ├── Grid/Zoning Engine
      ├── Level Gate Engine
      ├── Pet Lifecycle
      └── Wandering AI
               │
               ▼
        React World Store
      ├── authoritative state
      ├── optimistic animation
      └── realtime reconciliation
               │
               ▼
       Rendering Components
      ├── ClassroomWorldGrid
      ├── WorldCell
      ├── PetSprite/SvgPet
      ├── Plot
      ├── PetTooltip/Drawer
      └── EmoteBubble
```

**Nguyên tắc quan trọng:** không để component React tự quyết định luật game. Zoning, level-gating và movement phải nằm trong domain engine dùng được cả server lẫn client.

* * *

# 2\. Mô hình dữ liệu

## 2.1. `student_pets`

Schema hiện tại đã có phần lớn thông tin cần thiết. Nên bổ sung/chuẩn hóa:

SQL

```
ALTER TABLE student_pets
ADD COLUMN IF NOT EXISTS egg_color TEXT DEFAULT '#A78BFA',
ADD COLUMN IF NOT EXISTS is_hatched BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hatched_at TIMESTAMPTZ;

ALTER TABLE student_pets
ADD CONSTRAINT student_pets_egg_color_format
CHECK (egg_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE student_pets
ADD CONSTRAINT student_pets_hatched_level_consistency
CHECK (
  (is_hatched = FALSE AND level = 0)
  OR
  (is_hatched = TRUE AND level >= 1)
);
```

Các trường hiện có:

- `id`
- `student_id`
- `class_id`
- `anonymous_name`
- `evolution_branch`
- `level`
- `current_xp`
- `vitality_percent`
- `is_hibernating`
- `total_coins`
- `egg_color`
- `is_hatched`
- `hatched_at`

### Quy tắc bất biến

| State | Level | `is_hatched` | Vị trí |
| --- | --- | --- | --- |
| Egg | 0 | false | Plot viền |
| Hatched | ≥1 | true | Central zone |
| Hibernating | ≥1 | true | Không tự wandering |
| Dead/disabled | — | — | Không render active movement |

Không nên suy luận `is_hatched` chỉ bằng `level > 0` ở mọi nơi. Lưu state explicit giúp migration và future lifecycle an toàn hơn.

* * *

# 3\. Trạng thái vị trí: không nên ghi đè `student_world_plots`

`student_world_plots` hiện đang phù hợp với **nhà/plot cố định**, không phải trạng thái wandering liên tục.

Do đó nên tạo bảng riêng:

### `student_pet_world_states`

SQL

```
CREATE TABLE IF NOT EXISTS student_pet_world_states (
  pet_id UUID PRIMARY KEY REFERENCES student_pets(id) ON DELETE CASCADE,
  class_id UUID NOT NULL,
  grid_x SMALLINT NOT NULL,
  grid_y SMALLINT NOT NULL,
  facing SMALLINT NOT NULL DEFAULT 1,
  movement_state TEXT NOT NULL DEFAULT 'idle',
  emote_code TEXT,
  last_move_at TIMESTAMPTZ,
  next_move_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT world_x_range CHECK (grid_x BETWEEN 0 AND 7),
  CONSTRAINT world_y_range CHECK (grid_y BETWEEN 0 AND 7),
  CONSTRAINT world_facing CHECK (facing IN (-1, 1))
);
```

### Tại sao tách bảng?

`student_world_plots` = **ownership/static decoration**.

`student_pet_world_states` = **runtime state**.

Nếu mỗi lần thú di chuyển đều update một row chứa cả decoration/building data thì:

- tăng write frequency;
- gây contention;
- khó realtime;
- khó scale;
- trộn hai domain khác nhau.

* * *

# 4\. 8×8 Zoning Matrix

## 4.1. Quy tắc tọa độ

Dùng một chuẩn duy nhất:

```
x → 0 ... 7
y ↓ 0 ... 7
```

Grid:

```
       x
     0 1 2 3 4 5 6 7
y 0  H H H H H H H H
  1  H C C C C C C H
  2  H C C C C C C H
  3  H C C C C C C H
  4  H C C C C C C H
  5  H C C C C C C H
  6  H C C C C C C H
  7  H H H H H H H H
```

Trong đó:

- `H` = Residential/Home
- `C` = Public/Central

Tổng:

- Residential = `28`
- Public = `36`
- Total = `64`

* * *

# 5\. Zone Definition

Không hard-code `if/else` rải rác trong component.

Tạo configuration tập trung:

TypeScript

```
export type WorldZone =
  | 'residential'
  | 'central_plaza'
  | 'library_hub'
  | 'arena'
  | 'cosmic_forest';

export interface ZoneDefinition {
  id: WorldZone;
  minLevel: number;
  cells: ReadonlyArray<GridCoordinate>;
  allowWandering: boolean;
}
```

Ví dụ:

TypeScript

```
export const WORLD_ZONES: Record<WorldZone, ZoneDefinition> = {
  residential: {
    id: 'residential',
    minLevel: 0,
    cells: getBorderCells(),
    allowWandering: false,
  },

  central_plaza: {
    id: 'central_plaza',
    minLevel: 1,
    cells: getCentralCells(),
    allowWandering: true,
  },

  library_hub: {
    id: 'library_hub',
    minLevel: 5,
    cells: [],
    allowWandering: true,
  },

  arena: {
    id: 'arena',
    minLevel: 10,
    cells: [],
    allowWandering: true,
  },

  cosmic_forest: {
    id: 'cosmic_forest',
    minLevel: 20,
    cells: [],
    allowWandering: true,
  },
};
```

### Lưu ý kiến trúc

`36 central cells` là **public-space budget**, còn Library/Arena/Cosmic Forest là **sub-zone** bên trong 36 ô.

Không được hiểu thành:

> Plaza 36 + Library 36 + Arena 36 + Forest 36

vì như vậy vượt 8×8.

* * *

# 6\. Level-Gating Engine

API domain nên đơn giản:

TypeScript

```
export function canEnterZone(
  level: number,
  zone: ZoneDefinition,
): boolean {
  return level >= zone.minLevel;
}
```

Và:

TypeScript

```
export function canPetEnterCell(
  pet: PetWorldSnapshot,
  cell: GridCoordinate,
): boolean {
  const zone = getZoneAt(cell);

  if (!zone) return false;
  if (zone.id === 'residential') return false;

  return pet.level >= zone.minLevel;
}
```

Tuyệt đối tránh logic kiểu:

TypeScript

```
if (level >= 5 && x === 3 && y === 4) ...
```

vì sau này thay đổi map sẽ phải sửa hàng loạt component.

* * *

# 7\. Egg Customization

## 7.1. UX

Flow:

```
New student
    ↓
Create pet
    ↓
Level 0 / Egg
    ↓
Egg Customization
    ├── preset palette
    └── HEX picker
    ↓
Save egg_color
    ↓
Render SVG
    ↓
Egg idle animation
    ↓
Level reaches 1
    ↓
Hatching
```

## 7.2. Type

TypeScript

```
export interface EggCustomization {
  color: string;
}
```

Color phải được validate **cả frontend và backend**.

Frontend:

TypeScript

```
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
```

Không cho phép đưa arbitrary CSS vào SVG.

Ví dụ không được dùng trực tiếp:

TypeScript

```
fill={userInput}
```

nếu input chưa validate.

* * *

# 8\. `SvgPet` Architecture

Không nên để `svg-pet.tsx` biết database.

Component chỉ nhận domain props:

TypeScript

```
export interface SvgPetProps {
  level: number;
  eggColor: string;
  evolutionBranch?: string;
  isHatched: boolean;
  facing: 'left' | 'right';
  className?: string;
}
```

Mapping evolution:

```
0        → Egg
1–4      → Cracked Egg
5–9      → Baby
10–19    → Winged Teen
20+      → Ultimate
```

Egg animation:

CSS

```
@keyframes egg-wobble {
  0%, 100% {
    transform: rotate(0deg) translateY(0);
  }

  25% {
    transform: rotate(-3deg) translateY(-2px);
  }

  75% {
    transform: rotate(3deg) translateY(-2px);
  }
}
```

Animation chỉ chạy khi:

TypeScript

```
!isHatched && level === 0
```

* * *

# 9\. Wandering AI — State Machine

Không nên gọi đây là AI machine-learning. Đây là **deterministic stochastic wandering agent**.

State machine:

```
                  ┌──────────────┐
                  │     IDLE     │
                  └──────┬───────┘
                         │ timer
                         ▼
                  ┌──────────────┐
                  │ SELECT_TARGET│
                  └──────┬───────┘
                         │ valid target
                         ▼
                  ┌──────────────┐
                  │   MOVING     │
                  └──────┬───────┘
                         │ 1.5s
                         ▼
                  ┌──────────────┐
                  │   ARRIVED    │
                  └──────┬───────┘
                         │ 3–5s
                         ▼
                       IDLE
```

Các state bổ sung:

TypeScript

```
type PetMovementState =
  | 'idle'
  | 'selecting'
  | 'moving'
  | 'arrived'
  | 'hibernating'
  | 'blocked';
```

* * *

# 10\. Candidate Selection

Mỗi chu kỳ:

1. Lấy vị trí hiện tại.
2. Tạo các ô lân cận.
3. Loại ô ngoài `0..7`.
4. Loại residential.
5. Loại zone vượt level.
6. Loại ô đang bị occupation nếu game rule yêu cầu.
7. Random từ candidates.
8. Nếu không có candidate → idle.

TypeScript

```
export function getMovementCandidates(
  pet: PetWorldSnapshot,
  current: GridCoordinate,
): GridCoordinate[] {
  return getNeighbors(current)
    .filter(isInsideGrid)
    .filter((cell) => canPetEnterCell(pet, cell))
    .filter((cell) => !isOccupied(cell, pet.id));
}
```

### Quan trọng

Nếu pet level 1 chỉ được phép Central Plaza thì candidate selector **không được** random toàn bộ 36 ô rồi mới check level.

Phải filter trước:

```
neighbors
   ↓
valid grid
   ↓
valid zone
   ↓
level gate
   ↓
occupancy
   ↓
random
```

* * *

# 11\. 3–5 giây Wandering Interval

Không dùng:

TypeScript

```
setInterval(move, 3000);
```

cho mỗi pet một cách vô hạn.

Nên dùng scheduler:

TypeScript

```
const delay = randomBetween(3000, 5000);

setTimeout(scheduleNextMove, delay);
```

Sau mỗi movement mới tính delay mới.

Lý do:

- tránh đồng bộ tất cả pet cùng bước một lúc;
- giảm burst rendering;
- giảm database/realtime burst;
- tạo cảm giác tự nhiên hơn.

* * *

# 12\. Occupancy và Collision

Phải xác định rõ rule:

> Một cell có thể chứa bao nhiêu pet?

Khuyến nghị bản MVP:

**1 pet / cell.**

Nhưng không nên dựa vào frontend để đảm bảo.

Có race condition:

```
Pet A → cell 3,3
Pet B → cell 3,3
```

Cả hai client đều có thể thấy cell trống.

Do đó movement commit cần có cơ chế authoritative server.

Có thể dùng transaction/RPC:

```
request_move(pet_id, target_x, target_y)
    ↓
validate pet
    ↓
validate class
    ↓
validate level
    ↓
validate zone
    ↓
validate occupancy
    ↓
UPDATE state
    ↓
return authoritative state
```

Đây là lớp bảo vệ quan trọng nhất chống client gian lận.

* * *

# 13\. Client/Server Responsibility

## Client được phép

- render;
- animate;
- hiển thị prediction;
- chọn animation;
- chọn facing;
- hiển thị tooltip;
- subscribe realtime.

## Client không được quyết định authoritative

- pet có được vào zone không;
- pet có đủ level không;
- pet có được chiếm cell không;
- pet có thực sự được move không.

Rule:

> **Client proposes; server validates; realtime broadcasts.**

* * *

# 14\. Animation Architecture

Đây là điểm quan trọng để tránh "teleportation".

Không animate bằng cách thay:

TypeScript

```
gridMatrix[y][x] = pet;
```

rồi render lại tại vị trí mới.

Thay vào đó pet có:

TypeScript

```
interface PetRenderState {
  gridX: number;
  gridY: number;

  visualX: number;
  visualY: number;

  targetX: number;
  targetY: number;

  facing: -1 | 1;
}
```

Movement:

```
Cell A
  │
  │ authoritative update
  ▼
Target Cell B
  │
  │ CSS transition 1.5s
  ▼
Visual position B
```

CSS:

CSS

```
.pet-sprite {
  transition:
    transform 1.5s ease-in-out;
}
```

Tuy nhiên cần cẩn thận: `transform` đang đồng thời dùng cho position và `scaleX(-1)`.

Không nên:

CSS

```
transform: translate(...) scaleX(-1);
```

nếu code animation cũng overwrite `transform`.

Tách wrapper:

```
PetPosition
   └── PetFacing
         └── SvgPet
```

Ví dụ:

TypeScript

```
<div
  className="pet-position"
  style={{
    transform: `translate(${x}px, ${y}px)`,
  }}
>
  <div
    className="pet-facing"
    style={{
      transform: `scaleX(${facing})`,
    }}
  >
    <SvgPet ... />
  </div>
</div>
```

Đây là kiến trúc sạch hơn nhiều.

* * *

# 15\. Grid Rendering

`classroom-world-grid.tsx` nên trở thành orchestration component:

TypeScript

```
<ClassroomWorldGrid>
  <WorldBackground />
  <WorldCells />
  <WorldPlots />
  <WorldPets />
  <WorldOverlays />
</ClassroomWorldGrid>
```

Không nên để file này chứa:

- random movement;
- database mutation;
- level-gating;
- SVG implementation;
- tooltip business logic.

* * *

# 16\. Component Tree đề xuất

```
ClassroomWorldPage
└── ClassroomWorldProvider
    ├── ClassroomWorldGrid
    │   ├── WorldGridBackground
    │   ├── WorldCell
    │   ├── ResidentialPlot
    │   ├── ZoneOverlay
    │   ├── PetLayer
    │   │   └── WorldPet
    │   │       ├── PetPosition
    │   │       ├── PetFacing
    │   │       └── SvgPet
    │   └── EmoteLayer
    │
    ├── PetDetailsDrawer
    ├── ZoneLockedDialog
    └── EggCustomizationDialog
```

* * *

# 17\. Data Flow

### Initial load

```
page.tsx
   ↓
load class
   ↓
load student_pets
   ↓
load student_world_plots
   ↓
load student_pet_world_states
   ↓
WorldProvider
   ↓
Grid
```

### Realtime movement

```
Server/RPC
    ↓
student_pet_world_states UPDATE
    ↓
Supabase realtime
    ↓
WorldProvider
    ↓
detect position change
    ↓
animate 1.5s
```

Không nên:

```
Realtime event
 ↓
rerender entire page
```

Nên update normalized pet state:

TypeScript

```
petsById[petId] = nextPetState;
```

để giảm render không cần thiết.

* * *

# 18\. Anonymous Identity

Tooltip/drawer chỉ expose:

- anonymous name;
- level;
- evolution;
- emote;
- trạng thái;
- zone.

Không expose:

- `student_id`;
- email;
- internal database IDs;
- thông tin cá nhân.

Ví dụ:

```
✨ LunaFox
Level 12
Winged Teen

💬 "Đang khám phá..."
😊
```

* * *

# 19\. UX Level-Gating

Khi pet tiến tới zone chưa mở:

```
┌──────────────────────────────┐
│ 🔒 Thư Viện Tri Thức         │
│                              │
│ Mở khóa ở Level 5            │
│                              │
│ Level hiện tại: 3            │
│                              │
│ ███████░░░  60%              │
└──────────────────────────────┘
```

AI không nên liên tục đâm vào locked cells rồi bị reject.

Locked cells phải bị loại **trước random selection**.

* * *

# 20\. Egg → Hatch Transition

Khi level chuyển:

```
0 → 1
```

transaction phải cập nhật nhất quán:

```
student_pets
  level = 1
  is_hatched = true
  hatched_at = now()

student_pet_world_states
  grid_x = chosen public spawn x
  grid_y = chosen public spawn y
```

Không nên để frontend tự:

TypeScript

```
if (level === 1) isHatched = true;
```

rồi chờ database.

Frontend có thể hiển thị animation transition, nhưng authoritative state vẫn từ backend.

* * *

# 21\. Spawn Algorithm

Khi hatch:

TypeScript

```
function findSpawnCell(
  pet: PetWorldSnapshot,
): GridCoordinate | null {
  return getPublicCells()
    .filter(cell => canPetEnterCell(pet, cell))
    .filter(cell => !isOccupied(cell, pet.id))
    .sort(byDistanceToPlazaCenter)[0] ?? null;
}
```

Nếu không còn ô trống:

```
Hatched
  ↓
PendingSpawn
  ↓
wait for available public cell
```

Không được spawn ra border/home.

* * *

# 22\. Persistence Strategy

Không nhất thiết phải persist mỗi frame animation.

Ví dụ:

```
16:00:00  target selected
16:00:00  server accepts move A→B
16:00:00  realtime broadcast
16:00:00  CSS animation starts
16:00:01.5 visual arrives
```

Database chỉ lưu:

```
A → B
```

Không lưu:

```
A
A.1
A.2
A.3
...
B
```

Animation là presentation state, không phải database state.

* * *

# 23\. Offline/Reconnection

Khi mất realtime:

```
CONNECTED
    ↓
DISCONNECTED
    ↓
SHOW LAST KNOWN WORLD
    ↓
RECONNECT
    ↓
FETCH AUTHORITATIVE SNAPSHOT
    ↓
RECONCILE
```

Không tiếp tục authoritative wandering trên client nếu mất server connection.

Có thể tiếp tục idle animation, nhưng không commit movement giả.

* * *

# 24\. Performance Budget

Với 64 cells và một lớp học có số lượng pet vừa phải:

- CSS transform thay vì top/left;
- không dùng JS animation loop cho từng frame;
- không tạo `setInterval` global cho từng component;
- memoize `WorldCell`;
- memoize `WorldPet`;
- normalized state;
- tránh render lại toàn bộ grid khi một pet di chuyển.

Đặc biệt:

TypeScript

```
<WorldPet key={pet.id} ... />
```

không được remount mỗi lần pet đổi tọa độ.

Nếu component bị remount, CSS transition có thể mất continuity.

* * *

# 25\. Accessibility

Tooltip không nên là cách duy nhất để đọc thông tin.

Pet clickable nên có:

TypeScript

```
<button
  aria-label={`${anonymousName}, level ${level}`}
>
```

Keyboard:

- `Enter` → mở details;
- `Escape` → đóng drawer;
- focus visible.

Animation nên tôn trọng:

CSS

```
@media (prefers-reduced-motion: reduce) {
  .pet-position {
    transition: none;
  }
}
```

* * *

# 26\. Security / RLS

Đây là phần cần làm trước khi cho production.

RLS phải đảm bảo học sinh chỉ đọc được world của class mà mình có quyền tham gia.

Không cho client trực tiếp tùy ý:

SQL

```
UPDATE student_pet_world_states
SET grid_x = 7, grid_y = 7;
```

nếu movement phải qua domain validation.

Khuyến nghị:

```
Client
  ↓
Supabase RPC
  ↓
validate_move()
  ↓
UPDATE
```

Thay vì mở UPDATE policy rộng cho bảng runtime.

* * *

# 27\. TypeScript Domain Model

Tạo một module domain độc lập, ví dụ:

```
src/domain/classroom-world/
├── types.ts
├── constants.ts
├── grid.ts
├── zoning.ts
├── level-gating.ts
├── movement.ts
├── wandering.ts
└── index.ts
```

Core types:

TypeScript

```
export interface GridCoordinate {
  x: number;
  y: number;
}

export interface PetWorldSnapshot {
  petId: string;
  classId: string;
  level: number;
  isHatched: boolean;
  isHibernating: boolean;
  position: GridCoordinate;
  facing: -1 | 1;
}

export interface MovementTarget {
  from: GridCoordinate;
  to: GridCoordinate;
  durationMs: 1500;
}
```

* * *

# 28\. Testing Strategy

## Unit tests

Bắt buộc test:

### Grid

```
border cells = 28
central cells = 36
total = 64
```

### Zoning

```
(0,0) → residential
(7,7) → residential
(1,1) → public
(6,6) → public
```

### Level

```
level 0 → cannot enter central
level 1 → plaza
level 4 → cannot library
level 5 → library
level 9 → cannot arena
level 10 → arena
level 19 → cannot cosmic
level 20 → cosmic
```

### Movement

```
egg → no movement
hatched → movement allowed
hibernating → no movement
locked zone → excluded
outside grid → impossible
```

### Collision

```
occupied target → reject
```

* * *

# 29\. Integration Tests

Test flow hoàn chỉnh:

```
Create student
 ↓
Create Level 0 pet
 ↓
Customize egg color
 ↓
Persist color
 ↓
Reload
 ↓
Color remains
 ↓
Level becomes 1
 ↓
Hatch
 ↓
Spawn central
 ↓
Wandering target
 ↓
Server validates
 ↓
Realtime event
 ↓
1.5s animation
 ↓
Correct final cell
```

* * *

# 30\. Execution Plan cho Antigravity

## Phase 0 — Baseline & compile safety

**Mục tiêu:** không phá behavior hiện tại.

- xác định toàn bộ nơi đang sử dụng `student_pets`;
- xác định toàn bộ nơi đọc/ghi `student_world_plots`;
- xác định source of truth hiện tại của `gridMatrix`;
- generate/refresh Supabase TypeScript types;
- tạo branch/feature boundary;
- chạy typecheck và test baseline.

**Definition of Done:**

```
baseline build PASS
baseline typecheck PASS
baseline tests PASS
```

Không refactor lớn trong phase này.

* * *

## Phase 1 — Domain Model

Tạo:

```
src/domain/classroom-world/
```

Implement:

- `GridCoordinate`;
- grid boundaries;
- border cells;
- central cells;
- zone definitions;
- level gate;
- neighbor calculation.

Viết unit tests trước khi nối UI.

**DoD:** 100% core zoning rules có test.

* * *

## Phase 2 — Database Migration

Thêm:

```
student_pets.egg_color
student_pets.is_hatched
student_pets.hatched_at
student_pet_world_states
```

Sau đó:

1. migration;
2. indexes;
3. constraints;
4. RLS;
5. RPC movement;
6. regenerate TypeScript database types.

Không sửa UI cho tới khi schema/type ổn định.

* * *

## Phase 3 — Egg Customization

Tạo:

```
EggCustomizationDialog
EggColorPicker
```

Flow:

```
open
 → choose preset/custom HEX
 → validate
 → save
 → refresh local state
```

Tích hợp `SvgPet`.

Thêm:

- wobble;
- bounce;
- color;
- disabled state;
- accessibility.

* * *

## Phase 4 — Pet Lifecycle

Implement:

```
Level 0
 ↓
Egg
 ↓
Hatching event
 ↓
Level 1
 ↓
Public spawn
```

Đặc biệt test migration cho pet hiện hữu.

Không được giả định tất cả record cũ đã có `is_hatched`.

Migration cần xác định:

```
level = 0 → false
level >= 1 → true
```

trừ khi business data hiện hữu có rule khác.

* * *

## Phase 5 — World Rendering Refactor

Refactor:

```
classroom-world-grid.tsx
```

thành:

```
Grid
 ├── cells
 ├── plots
 ├── zones
 └── pets
```

Giữ API cũ nếu có thể để giảm regression.

* * *

## Phase 6 — Wandering Engine

Implement theo thứ tự:

1. neighbor calculation;
2. valid target;
3. level gate;
4. occupancy;
5. random delay;
6. movement request;
7. server validation;
8. realtime event;
9. animation.

**Không implement AI bằng một `useEffect` khổng lồ trong `classroom-world-grid.tsx`.**

* * *

## Phase 7 — Animation

Implement:

```
PetPosition
PetFacing
SvgPet
```

Animation duration:

```
1500ms
```

Facing:

```
right → scaleX(1)
left  → scaleX(-1)
```

Movement direction phải lấy từ:

TypeScript

```
target.x - current.x
```

Không dựa vào random direction để flip.

* * *

## Phase 8 — Interaction UX

Implement:

- click pet;
- tooltip;
- drawer;
- anonymous identity;
- level;
- evolution;
- emote;
- locked-zone feedback.

Mobile phải ưu tiên drawer/bottom-sheet thay vì hover tooltip.

* * *

## Phase 9 — Realtime & Reconciliation

Test:

```
Browser A
   ↓
move pet
   ↓
Supabase
   ↓
Browser B
   ↓
smooth movement
```

Sau đó test:

- reconnect;
- duplicate event;
- stale event;
- rapid movement;
- class switching;
- page background/foreground.

* * *

## Phase 10 — Hardening

Chạy:

```
typecheck
lint
unit tests
integration tests
production build
```

Kiểm tra:

- RLS;
- invalid coordinates;
- invalid level;
- unauthorized class;
- duplicate occupancy;
- malformed HEX;
- stale realtime event.

Chỉ release khi tất cả gate PASS.

* * *

# 31\. Definition of Done cuối cùng

Feature chỉ được coi là hoàn thành khi toàn bộ checklist sau đạt:

-  8×8 = 64 cells.
-  Residential = 28 cells.
-  Central/public = 36 cells.
-  Level 0 pet luôn ở home plot.
-  Level 0 không wandering.
-  Egg có custom HEX color.
-  SVG sử dụng màu đã lưu.
-  Egg có wobble/bounce.
-  Level 1 hatch.
-  Hatch chuyển pet vào public space.
-  Plaza mở ở level 1.
-  Library mở ở level 5.
-  Arena mở ở level 10.
-  Cosmic Forest mở ở level 20.
-  Locked cells bị loại khỏi AI candidate list.
-  Wandering interval ngẫu nhiên 3–5 giây.
-  Movement chỉ tới cell hợp lệ.
-  Occupancy được server validate.
-  Movement animation = 1.5 giây.
-  Không teleport khi render.
-  Facing trái dùng `scaleX(-1)`.
-  Tooltip/drawer hoạt động.
-  Emote/chat bubble hoạt động.
-  Realtime synchronization hoạt động.
-  Reconnection reconciliation hoạt động.
-  RLS không cho client bypass movement rules.
-  `prefers-reduced-motion` được hỗ trợ.
-  TypeScript typecheck PASS.
-  Lint PASS.
-  Unit tests PASS.
-  Integration tests PASS.
-  Production build PASS.

* * *

# 32\. Thứ tự ưu tiên kỹ thuật

Nếu Antigravity cần triển khai ngay, tôi khuyến nghị **không làm tất cả cùng lúc**. Thứ tự an toàn nhất là:

```
1. Domain types + Grid
          ↓
2. Database migration + RLS
          ↓
3. Egg customization
          ↓
4. Lifecycle / Hatch
          ↓
5. Grid rendering refactor
          ↓
6. Server-authoritative movement
          ↓
7. Realtime
          ↓
8. 1.5s animation + facing
          ↓
9. Tooltip / drawer / emotes
          ↓
10. Performance + regression + production hardening
```

### Kiến trúc quyết định quan trọng nhất

**Đừng biến 8×8 grid thành một component “thông minh” chứa toàn bộ game logic.** Hãy coi nó là renderer của một **World Domain Model**.

Ba nguyên tắc cần giữ xuyên suốt implementation:

> **Database là source of truth cho persistent state.**  
> **Server/RPC là authority cho game rules và movement.**  
> **React/CSS là presentation layer cho rendering và animation.**

Với phân tách này, việc sau này mở rộng từ 64 ô lên map lớn hơn, thêm NPC, event, quest, weather, multiplayer interaction hoặc nhiều lớp học sẽ không buộc phải viết lại `classroom-world-grid.tsx`.