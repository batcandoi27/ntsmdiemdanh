⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là kiến trúc tôi đề xuất để Antigravity triển khai 3 tính năng theo hướng **data-driven, dễ test, không hard-code logic vào UI**, đồng thời giữ khả năng mở rộng cho nhiều loại nội thất sau này.

## 1\. Kiến trúc tổng thể

Nên tách thành 4 lớp:

```
Furniture Definition
       │
       ▼
Furniture Instance ──► Placement / Rotation Engine
       │
       ├──────────────► Tooltip Projection
       │
       └──────────────► Upgrade / Forge System
                              │
                              ▼
                       Tier Visual Resolver
                              │
                              ▼
                         SVG Renderer
```

**Nguyên tắc quan trọng:** rotation, tier, buff và SVG appearance đều là **state**, không nên suy luận ngược từ DOM/SVG.

Ví dụ state của một món đồ:

TypeScript

```
type Rotation = 0 | 90 | 180 | 270;
type FurnitureTier = 1 | 2 | 3 | 4 | 5;

interface FurnitureInstance {
  id: string;
  definitionId: string;

  grid: {
    x: number;
    y: number;
  };

  rotation: Rotation;
  tier: FurnitureTier;

  upgradeXpSpent: number;

  placed: boolean;
}
```

Definition chứa dữ liệu bất biến của loại đồ:

TypeScript

```
interface FurnitureDefinition {
  id: string;
  name: string;

  baseSize: {
    width: number;
    height: number;
  };

  maxTier: 5;

  baseBuff: BuffStats;

  tierConfig: Record<FurnitureTier, FurnitureTierConfig>;
}
```

* * *

# 2\. Rotation Engine

### Quy tắc dữ liệu

Không lưu `rotatedWidth`/`rotatedHeight` trong instance. Đây là derived state:

TypeScript

```
function getFootprint(
  definition: FurnitureDefinition,
  rotation: Rotation
) {
  const { width, height } = definition.baseSize;

  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}
```

Điều này tránh tình trạng:

```
rotation = 90
width = 2
height = 3
```

nhưng một subsystem khác vẫn nghĩ footprint là `3 x 2`.

### Rotation phải là cyclic

TypeScript

```
function rotateCW(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}
```

Không tạo 4 implementation riêng cho 0/90/180/270.

### Kiểm tra biên 8×8

Tôi khuyến nghị tách `canPlace()` thành pure function:

TypeScript

```
interface GridSize {
  width: 8;
  height: 8;
}

function canPlace(
  instance: FurnitureInstance,
  definition: FurnitureDefinition,
  rotation: Rotation,
  grid: GridSize
): boolean {
  const footprint = getFootprint(definition, rotation);

  const { x, y } = instance.grid;

  return (
    x >= 0 &&
    y >= 0 &&
    x + footprint.width <= grid.width &&
    y + footprint.height <= grid.height
  );
}
```

Khi người chơi nhấn **R**:

```
current rotation
      ↓
next rotation
      ↓
calculate footprint
      ↓
canPlace?
   ↙       ↘
 YES        NO
 ↓          ↓
commit     reject
```

**Không nên xoay trước rồi rollback DOM.** Hãy validate state mới trước, sau đó mới commit.

### Corner case bắt buộc test

- `1×1`: cả 4 hướng hợp lệ.
- `2×3`: 0° = 2×3, 90° = 3×2.
- nằm sát cạnh phải.
- nằm sát cạnh dưới.
- xoay khiến vật vượt biên.
- xoay 270° → 0°.
- furniture có collision với furniture khác nếu hệ thống hiện tại đã hỗ trợ collision.

### UI

Toolbar:

```
[ Move ] [ 🔄 Rotate ] [ Delete ]
```

Keyboard:

```
R → rotate clockwise
```

Nên đưa keyboard handler qua một command/action chung:

TypeScript

```
dispatch({
  type: "ROTATE_FURNITURE",
  furnitureId
});
```

Thay vì:

```
button → trực tiếp mutate instance
keyboard → trực tiếp mutate instance
```

Như vậy button và keyboard dùng đúng một execution path.

* * *

# 3\. Smart Hover Tooltip

Tooltip không nên tự đọc SVG hoặc DOM để lấy thông tin.

Nó nên nhận một **Tooltip View Model** đã được projection từ game state:

TypeScript

```
interface FurnitureTooltipVM {
  id: string;
  name: string;

  tier: {
    level: FurnitureTier;
    stars: string;
    label: string;
  };

  rotation: {
    degrees: Rotation;
    label: string;
  };

  position: {
    x: number;
    y: number;
  };

  buffs: BuffDisplay[];
}
```

Ví dụ:

```
┌──────────────────────────┐
│ 🛋️ Sofa Hoàng Gia       │
│ ⭐⭐⭐⭐ Huyền Thoại       │
│                          │
│ ↻ Hướng: 90°             │
│ 📍 Vị trí: (4, 2)        │
│                          │
│ ❤️ +25% HP căn cứ        │
│ ⚡ +15% tốc độ hồi XP     │
└──────────────────────────┘
```

### Tooltip projection

TypeScript

```
function buildTooltipVM(
  instance: FurnitureInstance,
  definition: FurnitureDefinition
): FurnitureTooltipVM {
  const tierConfig = definition.tierConfig[instance.tier];

  return {
    id: instance.id,
    name: definition.name,

    tier: {
      level: instance.tier,
      stars: "⭐".repeat(instance.tier),
      label: tierConfig.label,
    },

    rotation: {
      degrees: instance.rotation,
      label: `${instance.rotation}°`,
    },

    position: {
      x: instance.grid.x,
      y: instance.grid.y,
    },

    buffs: resolveBuffDisplay(
      definition.baseBuff,
      tierConfig
    ),
  };
}
```

### Hover behavior

Nên dùng:

```
pointerenter
   ↓
set hoveredFurnitureId
   ↓
selector
   ↓
build TooltipVM
   ↓
render tooltip
```

Không nên tạo một tooltip DOM riêng cho từng furniture.

Đồng thời nên có:

- `pointerleave` → hide.
- delay khoảng 100–200ms nếu scene có nhiều furniture.
- tooltip không chặn pointer events.
- mobile/touch: không phụ thuộc hover; tap/select nên có fallback.

* * *

# 4\. Upgrade Workshop / Forge

Đây là phần cần thiết kế kỹ nhất vì XP/Xu và tier progression sau này có thể trở thành economy của game.

Tôi khuyên **không lưu buff cuối cùng** như source-of-truth.

Lưu:

```
tier
upgrade cost paid
```

và derive buff từ definition.

Ví dụ:

TypeScript

```
interface FurnitureTierConfig {
  level: FurnitureTier;
  label: string;

  xpCost: number;
  coinCost: number;

  buffMultiplier: number;

  visual: TierVisualConfig;
}
```

Ví dụ progression:

| Tier | Tên | Visual | Buff |
| --- | --- | --- | --- |
| 1 | Cơ Bản ⭐ | SVG nguyên bản | 100% |
| 2 | Tinh Xảo ⭐⭐ | kim loại + shadow | 125% |
| 3 | Cao Cấp ⭐⭐⭐ | vàng + accessory light | 155% |
| 4 | Huyền Thoại ⭐⭐⭐⭐ | glow aura | 200% |
| 5 | Thần Thoại ⭐⭐⭐⭐⭐ | star particles | 275% |

Các con số trên nên được coi là **configuration mẫu**, không phải balance cuối cùng.

### Upgrade command

TypeScript

```
function canUpgrade(
  instance: FurnitureInstance,
  definition: FurnitureDefinition,
  player: PlayerProgression
): boolean {
  if (instance.tier >= definition.maxTier) return false;

  const nextTier = (instance.tier + 1) as FurnitureTier;
  const config = definition.tierConfig[nextTier];

  return (
    player.xp >= config.xpCost &&
    player.coins >= config.coinCost
  );
}
```

Commit phải atomic:

```
validate
  ↓
deduct XP + coins
  ↓
tier++
  ↓
persist
  ↓
emit FURNITURE_UPGRADED
  ↓
rerender SVG + tooltip + forge
```

**Không được**:

```
deduct XP
render
deduct coins
tier++
```

vì lỗi giữa các bước có thể tạo economy corruption.

* * *

# 5\. XP/Xu nên tách khỏi Furniture

Không để furniture tự sở hữu XP.

TypeScript

```
interface PlayerProgression {
  xp: number;
  coins: number;
}
```

Furniture chỉ biết tier.

Điều này cho phép sau này dùng cùng XP cho:

- furniture,
- character,
- skills,
- workshop,
- unlocks.

* * *

# 6\. SVG 5-Tier Evolution

Đây nên là **layered SVG architecture**, không phải 5 SVG hoàn toàn độc lập.

Ví dụ:

```
Furniture SVG
│
├── base
├── tier2-metal
├── tier2-shadow
├── tier3-gold
├── tier3-accessory
├── tier4-glow
└── tier5-stars
```

Renderer:

TypeScript

```
function getVisibleLayers(tier: FurnitureTier) {
  return {
    base: true,
    tier2: tier >= 2,
    tier3: tier >= 3,
    tier4: tier >= 4,
    tier5: tier >= 5,
  };
}
```

### Tier 1

```
Base SVG
```

### Tier 2

```
Base
+ metal border
+ enhanced shadow
```

### Tier 3

```
Tier 2
+ gold ornament
+ accessory light
```

### Tier 4

```
Tier 3
+ glow aura
```

### Tier 5

```
Tier 4
+ star particles
+ maximum buff
```

Cách này rất quan trọng vì artist có thể chỉnh từng layer mà không cần duplicate toàn bộ SVG.

* * *

# 7\. Rotation + SVG

Không nên thay đổi path SVG khi xoay.

Nên rotate một `<g>`:

XML

```
<g transform="rotate(90 cx cy)">
  ...
</g>
```

hoặc, nếu renderer dùng CSS transform, quản lý transform ở một layer duy nhất.

Đặc biệt không nên vừa rotate từng child vừa rotate parent.

Canonical transform:

```
Furniture root
  └── SVG visual group
        ├── base
        ├── tier layers
        └── effects
```

Rotation chỉ tác động `SVG visual group`.

* * *

# 8\. Glow và Star Particles: performance gate

Tier 4–5 là nơi dễ biến một feature đẹp thành bottleneck.

SVG filters rất hữu ích nhưng có paint cost; MDN cũng khuyến nghị đặt filter trong `<defs>` và tái sử dụng thay vì tạo definition lặp lại. [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Filter_effects?utm_source=chatgpt.com)

Do đó:

```
Tier 4:
static/reusable glow filter
        ↓
small furniture bounding box
```

không phải:

```
entire scene
   ↓
large animated blur/filter
```

Các nguồn performance gần đây cũng khuyến nghị ưu tiên `transform`/`opacity`, hạn chế animate các thuộc tính layout và filter nặng. [CSSVG+1](https://cssvg.com/blog/svg-animation-performance?utm_source=chatgpt.com)

### Tier 5 particles

Không tạo hàng trăm SVG nodes cho mỗi furniture.

Nên có giới hạn:

TypeScript

```
const MAX_STAR_PARTICLES_PER_ITEM = 8;
```

và:

```
tier 5
   ↓
particle pool
   ↓
reuse particle nodes
```

Particle animation nên chủ yếu dùng `transform` + `opacity`. Với nhiều instance, nên giảm số particle hoặc tắt animation trên thiết bị yếu. Các hệ thống particle production cũng thường dùng particle count và lifecycle/pause như các performance controls chính. [tsParticles](https://particles.js.org/options/performance?utm_source=chatgpt.com)

Thêm:

CSS

```
@media (prefers-reduced-motion: reduce) {
  .furniture-particle {
    animation: none;
  }
}
```

* * *

# 9\. Data Model hoàn chỉnh

Tôi đề xuất schema lõi:

TypeScript

```
type Rotation = 0 | 90 | 180 | 270;
type FurnitureTier = 1 | 2 | 3 | 4 | 5;

interface FurnitureDefinition {
  id: string;
  name: string;

  baseSize: {
    width: number;
    height: number;
  };

  baseBuff: BuffStats;

  tierConfig: Record<FurnitureTier, FurnitureTierConfig>;

  asset: {
    svgId: string;
  };
}

interface FurnitureTierConfig {
  level: FurnitureTier;
  label: string;

  xpCost: number;
  coinCost: number;

  buffMultiplier: number;

  visual: {
    metal: boolean;
    shadow: boolean;
    gold: boolean;
    accessoryLight: boolean;
    glow: boolean;
    starParticles: boolean;
  };
}

interface FurnitureInstance {
  id: string;
  definitionId: string;

  grid: {
    x: number;
    y: number;
  };

  rotation: Rotation;
  tier: FurnitureTier;

  placed: boolean;
}

interface PlayerProgression {
  xp: number;
  coins: number;
}
```

Tôi đặc biệt khuyên **không lưu visual flags trong instance**:

TypeScript

```
// KHÔNG
{
  tier: 4,
  glow: true,
  gold: true
}
```

vì sẽ tạo state duplication.

Thay vào đó:

```
instance.tier = 4
       ↓
definition.tierConfig[4]
       ↓
visual resolver
```

* * *

# 10\. Execution Plan cho Antigravity

## Phase 1 — Domain foundation

Trước tiên implement pure domain functions:

```
getFootprint()
rotateCW()
canPlace()
getNextTier()
canUpgrade()
calculateBuff()
```

**Chưa làm animation/UI.**

Test unit trước.

* * *

## Phase 2 — Rotation

Implement command:

```
ROTATE_FURNITURE
```

Acceptance criteria:

- R hoạt động.
- button hoạt động.
- 4 rotation states.
- footprint đảo đúng.
- không vượt 8×8.
- invalid rotation không mutate state.

* * *

## Phase 3 — Tooltip

Implement:

```
FurnitureTooltipVM
```

và selector/projection.

Acceptance:

- tên đúng.
- tier đúng.
- star count đúng.
- rotation đúng.
- coordinate đúng.
- buff đúng.
- tooltip biến mất khi leave.
- không có stale tooltip sau khi rotate/upgrade.

* * *

## Phase 4 — Forge

Implement:

```
UPGRADE_FURNITURE
```

với transaction semantics:

```
validate → spend → upgrade → persist → event
```

Test đặc biệt:

```
XP insufficient
Coins insufficient
Tier 5 upgrade
double click
rapid click
failed persistence
```

**Double-click/rapid-click là test bắt buộc**, vì đây là nơi economy dễ bị nhân đôi transaction.

* * *

## Phase 5 — SVG tier resolver

Implement:

```
resolveFurnitureVisual(
  definition,
  instance.tier
)
```

Acceptance:

```
Tier 1 → base
Tier 2 → metal/shadow
Tier 3 → gold/light
Tier 4 → glow
Tier 5 → particles
```

Mỗi tier phải có screenshot/golden visual test nếu pipeline hiện tại hỗ trợ visual regression.

* * *

## Phase 6 — Integration

Test matrix:

| Feature | Rotation | Tooltip | Forge | SVG |
| --- | --- | --- | --- | --- |
| New item | ✓ | ✓ | ✓ | ✓ |
| Rotate | ✓ | ✓ | — | ✓ |
| Upgrade | — | ✓ | ✓ | ✓ |
| Tier 5 | ✓ | ✓ | ✓ | ✓ |
| Reload state | ✓ | ✓ | ✓ | ✓ |

* * *

# 11\. Test Cases tối thiểu

### Rotation

```
R: 0 → 90
R: 90 → 180
R: 180 → 270
R: 270 → 0
```

### Footprint

```
2×3 @ 0°  → 2×3
2×3 @ 90° → 3×2
2×3 @ 180° → 2×3
2×3 @ 270° → 3×2
```

### Boundary

```
8×8 room
item 2×3
x=6,y=5
rotation=0 → valid

x=6,y=6
rotation=0 → invalid
rotation=90 → valid/invalid according to 3×2 footprint
```

### Upgrade

```
1 → 2
2 → 3
3 → 4
4 → 5
5 → rejected
```

### Economy

```
exact XP cost → succeeds
1 XP below → fails
exact coin cost → succeeds
1 coin below → fails
```

### Race/re-entry

```
double click upgrade → only one upgrade
rapid R presses → deterministic final rotation
upgrade then hover → tooltip immediately reflects new tier
rotate then hover → tooltip immediately reflects new rotation
reload → state remains identical
```

* * *

# 12\. Definition of Done

Feature chỉ nên được xem là hoàn thành khi toàn bộ flow này chạy được:

```
Place furniture
      ↓
Hover
      ↓
Tooltip shows Tier 1 / 0°
      ↓
Press R
      ↓
Footprint changes
      ↓
Tooltip shows 90°
      ↓
Open Forge
      ↓
Spend XP + Xu
      ↓
Tier 2
      ↓
SVG gains metal/shadow
      ↓
Tier 3
      ↓
SVG gains gold/light
      ↓
Tier 4
      ↓
Glow
      ↓
Tier 5
      ↓
Star particles + max buff
      ↓
Hover
      ↓
Tooltip reflects Tier 5 + final buff
```

## Kết luận kiến trúc

**Ba quyết định tôi xem là quan trọng nhất:**

1. **Rotation là state `0|90|180|270`, footprint là derived state.** Không lưu width/height đã xoay.
2. **Tier là source-of-truth; buff và SVG appearance đều được derive từ tier configuration.** Không duplicate visual/buff state vào instance.
3. **Mọi thay đổi đi qua command/domain layer**, để button, keyboard, Forge và automation test cùng dùng một execution path.

Về rendering, nên ưu tiên SVG layer tái sử dụng, `transform`/`opacity` cho animation và giới hạn filter/particle effects ở phạm vi nhỏ; đây là cách giảm paint/layout cost và giữ Tier 4–5 không làm suy giảm frame rate. [GitHub+1](https://github.com/MelodicBloom/svg-filter-lab/blob/main/docs/how-to-implement-performant-svg-filters-without-killing-your-frame-rate.md?utm_source=chatgpt.com)

Nếu Antigravity triển khai đúng cấu trúc này, hệ thống sau đó có thể mở rộng khá sạch sang **6–10 tier, nhiều loại room, furniture collision, upgrade preview, undo rotation và server-authoritative progression** mà không phải viết lại core model.