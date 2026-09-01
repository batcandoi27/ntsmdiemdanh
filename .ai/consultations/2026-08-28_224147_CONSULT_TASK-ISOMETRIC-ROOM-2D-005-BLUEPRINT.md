⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.## Kiến trúc đề xuất

Tôi đề xuất xây **House Tour Room** như một **vector scene engine**, thay vì vẽ từng căn nhà thành một SVG độc lập. Mục tiêu là dùng **một geometry/layout engine chung + theme tokens + furniture components**, từ đó tạo 28 căn nhà mà không phát sinh 28 bộ asset nặng.

### 1\. Scene structure

```
HouseTourModal
└── RoomViewport
    ├── RoomScene
    │   ├── BackWall
    │   ├── Windows
    │   ├── WallDecor
    │   ├── Floor
    │   ├── Rug
    │   ├── FurnitureLayer
    │   │   ├── Bed
    │   │   ├── Altar / DisplayPedestal
    │   │   └── Desk / TeaTable
    │   ├── PetOrEgg
    │   ├── EffectsLayer
    │   │   ├── Aura
    │   │   ├── Moonlight
    │   │   └── Steam
    │   └── SpeechBubble
    └── UIOverlay
        ├── StudentInfo
        ├── ThemeBadge
        └── CloseButton
```

**Điểm quan trọng:** SVG chỉ chứa những hình học cần thiết. Các hiệu ứng như glow, shadow, steam, sparkle dùng CSS/SVG filter tối thiểu, không dùng ảnh raster.

* * *

# 2\. Hệ tọa độ Isometric

Không nên position furniture bằng pixel cố định.

Dùng một hệ tọa độ logic:

```
Room coordinate
        y
        ↓
   ┌───────────┐
   │           │
   │     C     │
   │           │
   └───────────┘
        → x
```

Sau đó transform sang màn hình:

```
screenX = originX + (x - y) * tileW / 2
screenY = originY + (x + y) * tileH / 2
```

Ví dụ:

- Room: `12 × 8 logical units`
- `tileW = 64`
- `tileH = 32`
- center: `(6, 4)`
- bed: `(2, 2)`
- altar: `(6, 4)`
- desk: `(9, 5)`

Nhờ vậy cùng một layout có thể scale từ mobile lên desktop mà **không cần thay đổi vị trí từng object**.

* * *

# 3\. SVG component architecture

Mỗi object nên là một component độc lập:

```
<RoomScene>
  <IsoFloor />
  <IsoWall />
  <IsoWindow />
  <IsoRug />
  <IsoBed />
  <IsoDesk />
  <IsoPedestal />
  <MysticEgg />
  <PetAura />
  <Moonlight />
  <SpeechBubble />
</RoomScene>
```

### SVG nguyên tắc

- `viewBox="0 0 1200 720"`
- Không hard-code `width/height` trong SVG.
- `width: 100%; height: auto`.
- `preserveAspectRatio="xMidYMid meet"`.
- Geometry dùng `<path>`, `<polygon>`, `<rect>`, `<ellipse>`.
- Reuse bằng `<defs>` + `<use>` cho:
  
  - gỗ
  - đá
  - crystal
  - window frame
  - star
  - leaf
  - sparkle.
- Không embed PNG/JPG.
- Không convert toàn bộ scene thành một SVG path khổng lồ.

### Layer order

```
0  background
10 back wall
20 windows
30 moonlight
40 vines / decorations
50 floor
60 rug
70 large furniture
80 pedestal
90 egg / pet
100 effects
110 speech bubble
```

Điều này tránh phải xử lý z-index phức tạp bằng CSS.

* * *

# 4\. Component furniture

### Bed

Bed không phải một asset bitmap.

```
Bed
├── mattress
├── blanket
├── pillow
├── headboard
├── side shadow
└── optional decoration
```

Có thể thay token:

```
--bed-frame
--bed-fabric
--bed-blanket
--bed-highlight
```

để cùng một component biến thành gỗ, kim loại hoặc crystal.

### Desk / tea table

```
Desk
├── tabletop
├── legs
├── chair
└── prop
    ├── tea
    └── computer
```

Prop được truyền qua configuration:

```
prop: "tea"
```

hoặc:

```
prop: "computer"
```

### Central pedestal

Đây là **visual focal point**.

```
Pedestal
├── base
├── platform
├── object
│   ├── MysticEgg
│   └── Pet
└── Aura
```

Không nên để aura ảnh hưởng layout hoặc pointer interaction.

* * *

# 5\. Bốn Theme

Tất cả dùng chung geometry nhưng thay **Design Tokens**.

| Theme | Floor | Wall | Window | Center | Lighting |
| --- | --- | --- | --- | --- | --- |
| 🌲 Nhà Gỗ Cozy | gỗ | timber | vòm gỗ | trứng/thú | warm moon |
| 🚀 Trạm Không Gian | metal panel | steel | viewport | capsule/pet | cool ambient |
| 💎 Lâu Đài Pha Lê | crystal tile | crystal | crystal arch | magic crystal | cyan/purple glow |
| 🌸 Vườn Cổ Tích | stone/grass | enchanted wood | floral arch | fairy egg/pet | soft moonlight |

Ví dụ conceptual token:

CSS

```
[data-theme="cozy"] {
  --floor-main: ...;
  --wall-main: ...;
  --accent: ...;
  --window-glow: ...;
}

[data-theme="space"] {
  --floor-main: ...;
  --wall-main: ...;
  --accent: ...;
  --window-glow: ...;
}
```

**Không fork component theo theme.**

Sai:

```
CozyRoom.tsx
SpaceRoom.tsx
CrystalRoom.tsx
FairyRoom.tsx
```

Nên là:

```
RoomScene.tsx
themes/
  cozy.ts
  space.ts
  crystal.ts
  fairy.ts
```

* * *

# 6\. Ánh sáng và hiệu ứng

Để giữ FPS cao, tránh hàng chục SVG filter động.

### Nên dùng

- 1–2 radial gradients cho moonlight.
- 1 glow filter dùng lại.
- CSS opacity animation.
- transform animation.
- pseudo-elements cho một số glow UI.

### Không nên

- blur filter riêng cho từng particle.
- filter animation liên tục.
- hàng trăm `<circle>` sparkle.
- canvas particle system cho scene tĩnh.
- animated SVG paths phức tạp.

Ví dụ animation:

CSS

```
@keyframes auraPulse {
  0%, 100% { opacity: .55; transform: scale(.96); }
  50%      { opacity: .9;  transform: scale(1.04); }
}

@keyframes steam {
  0%   { opacity: 0; transform: translateY(4px); }
  40%  { opacity: .7; }
  100% { opacity: 0; transform: translateY(-14px); }
}
```

Dùng:

CSS

```
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

* * *

# 7\. Responsive strategy

Không nên có bản desktop và mobile riêng.

### Desktop

```
┌───────────────────────────────────────────┐
│                 House Tour                 │
│                                           │
│             ┌─────────────┐               │
│             │             │               │
│             │  ROOM       │               │
│             │             │               │
│             └─────────────┘               │
│                 speech                    │
└───────────────────────────────────────────┘
```

### Mobile

```
┌────────────────────┐
│ House Tour         │
│                    │
│    ┌──────────┐    │
│    │   ROOM   │    │
│    │          │    │
│    └──────────┘    │
│   speech bubble    │
└────────────────────┘
```

Scene giữ aspect ratio; modal thay đổi kích thước.

CSS

```
.room-viewport {
  width: min(100%, 1200px);
  aspect-ratio: 5 / 3;
  margin-inline: auto;
}

.room-svg {
  display: block;
  width: 100%;
  height: 100%;
}
```

Mobile không nên scale room đến mức furniture không đọc được. Có thể dùng breakpoint để giảm **UI chrome**, nhưng geometry scene vẫn giữ nguyên.

* * *

# 8\. 28 ngôi nhà

Không tạo 28 scene SVG.

Tạo data model:

TypeScript

```
type HouseTheme =
  | "cozy"
  | "space"
  | "crystal"
  | "fairy";

type HouseConfig = {
  id: string;
  theme: HouseTheme;
  pet?: string;
  centralObject?: "egg" | "pet";
  deskProp?: "tea" | "computer";
  greeting: string;
};
```

Ví dụ:

TypeScript

```
const houses = [
  {
    id: "student-01",
    theme: "cozy",
    centralObject: "egg",
    deskProp: "tea",
    greeting: "Chào mừng bạn đến nhà mình!"
  },
  // ...
];
```

**28 houses = data**, không phải 28 implementations.

Điều này là điểm kiến trúc quan trọng nhất để tránh maintenance debt.

* * *

# 9\. Speech bubble

Bubble nằm ở **UI layer**, không nên là một object vật lý của room.

Lý do:

- dễ đọc trên mobile;
- không bị furniture che;
- typography không phụ thuộc scale của scene;
- dễ localization;
- dễ thay đổi chiều dài câu.

Có thể tạo tail hướng về central area:

```
       ┌──────────────────────────────┐
       │  Chào mừng đến căn nhà       │
       │  nhỏ của mình! ✨            │
       └───────────────┬──────────────┘
                       ▼
                    [ROOM]
```

* * *

# 10\. Interaction

Scene chủ yếu là visual, vì vậy interaction phải nhẹ:

- click/tap pet → subtle bounce;
- click egg → aura pulse;
- hover furniture desktop → optional tooltip;
- không biến mọi object thành button.

Touch target tối thiểu nên đủ lớn cho mobile, kể cả khi visual object nhỏ.

* * *

# Execution Plan cho Antigravity

## Phase 1 — Foundation

**Deliverable**

```
RoomScene
IsoTransform
ThemeTokens
HouseConfig
```

Checklist:

-  Tạo SVG viewport và coordinate system.
-  Implement isometric projection.
-  Implement responsive container.
-  Implement layer ordering.
-  Implement theme token interface.
-  Không dùng raster asset.

**Acceptance:** một room skeleton hiển thị chính xác ở desktop và mobile.

* * *

## Phase 2 — Furniture

Implement theo thứ tự:

1. Floor
2. Walls
3. Windows
4. Rug
5. Bed
6. Desk
7. Pedestal
8. Egg/Pet
9. Decorations
10. Speech bubble

Mỗi component phải:

- nhận props;
- không phụ thuộc theme cụ thể;
- không hard-code room dimensions;
- có fallback nếu optional prop thiếu.

* * *

## Phase 3 — Four Themes

Build theo thứ tự:

```
Cozy
 ↓
Space
 ↓
Crystal
 ↓
Fairy
```

Cozy nên được làm trước như **reference implementation**.

Sau khi Cozy đạt visual acceptance, các theme còn lại chỉ thay:

- material;
- color tokens;
- window;
- decorations;
- lighting;
- prop variants.

* * *

## Phase 4 — 28 House Data

Không copy/paste component.

Tạo:

```
houseConfigs[]
```

và render:

```
<RoomScene config={houseConfigs[id]} />
```

Test cả 28 configuration bằng cùng một component.

* * *

# Automated QA

## Visual regression

Tạo snapshot cho:

```
4 themes
×
desktop
×
mobile
```

Tối thiểu:

```
8 golden screenshots
```

Sau đó thêm đại diện các configuration khác nhau của 28 nhà.

Kiểm tra:

- room clipping;
- furniture overlap;
- speech bubble overflow;
- theme colors;
- pet/egg alignment;
- window position;
- responsive scaling.

## Functional tests

```
House 01 → Cozy
House 07 → Space
House 14 → Crystal
House 21 → Fairy
```

và test toàn bộ 28 IDs.

Các invariant:

- không crash khi `pet` undefined;
- không crash khi `deskProp` undefined;
- greeting dài không tràn modal;
- modal đóng/mở được;
- keyboard navigation hoạt động;
- reduced-motion hoạt động.

## Performance acceptance

Mục tiêu thực tế:

- SVG DOM nhỏ;
- không tạo hàng trăm animated nodes;
- không render lại toàn scene khi chỉ thay speech text;
- theme switch không remount toàn bộ modal nếu không cần;
- animation chỉ dùng `transform`/`opacity` ở các phần có thể.

Đặc biệt kiểm tra trên **mobile CPU/GPU yếu**, không chỉ desktop.

* * *

# Definition of Done

Antigravity chỉ nên đánh dấu TASK hoàn tất khi:

-  4 theme hoạt động bằng cùng component architecture.
-  28 house configurations render được.
-  Scene là SVG/vector, không phụ thuộc raster background.
-  Responsive từ mobile đến desktop.
-  Bed + central pedestal + egg/pet + desk/tea/computer đều đúng vị trí.
-  Windows + moonlight + vines/decorations hoạt động theo theme.
-  Speech bubble không overflow.
-  `prefers-reduced-motion` được hỗ trợ.
-  Keyboard/accessibility của modal không bị phá vỡ.
-  Visual regression snapshots pass.
-  Không có theme-specific component duplication.
-  Không có hard-coded pixel layout cho 28 căn.
-  Performance test không phát hiện animation/DOM bottleneck rõ rệt.

## Quyết định kiến trúc cuối

**Khuyến nghị:** `Data → Theme Tokens → Shared SVG Components → Isometric Projection → Responsive SVG Viewport`.

Đây là hướng phù hợp nhất cho 28 căn nhà vì nó giữ **bundle nhẹ, visual nhất quán, responsive tốt và chi phí bảo trì thấp**. Quan trọng hơn, khi cần thêm căn nhà thứ 29 hoặc theme thứ 5, hệ thống chỉ cần thêm **data/token/variant**, thay vì viết lại một scene mới.