⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# Phân tích kiến trúc & Execution Plan — TASK-MOBILE-HOUSE-DESIGN-004

## 1\. Chẩn đoán nguyên nhân kỹ thuật

Ba vấn đề nhiều khả năng xuất phát từ việc UI hiện tại đang gộp **render, interaction state và responsive behavior** vào cùng một component/cơ chế hiển thị.

### A. Click “Nhà riêng” và click ô đất chưa mở House Tour

Các nguyên nhân cần kiểm tra:

- Chip `"Nhà riêng (Click thăm)"` có thể chỉ được render như badge/label nhưng chưa có `onClick`, hoặc sự kiện bị phần tử cha chặn.
- Ô đất 8x8 có thể dùng `hover state` chung thay vì một `selectedHouseId` độc lập.
- `pointer-events`, `z-index` hoặc overlay trang trí có thể che click.
- Click vào ô đất chưa truyền đúng `houseId`.
- Modal/House Tour dùng state cục bộ trong từng cell nên state bị reset hoặc không thể mở từ chip.
- Một số ô có thể chưa có dữ liệu thiết kế, dẫn đến click thành công nhưng không có nội dung để render.

**Kết luận kiến trúc:** cần coi mỗi ô đất là một thực thể `House`, có ID cố định và dữ liệu thiết kế độc lập; interaction không được phụ thuộc vào việc cell đang hover.

* * *

### B. Card `fixed bottom-6 right-6` gây UX sai

Đây là dấu hiệu component thông tin đang được định vị bằng một chiến lược duy nhất cho mọi thiết bị.

Vấn đề:

- Desktop: tooltip quá xa đối tượng người dùng đang quan sát.
- Không có cursor/object anchor.
- Không boundary checking khi gần mép viewport.
- Mobile không có hover thực sự, nên cố áp dụng popover desktop sẽ gây UX không tự nhiên.
- Có thể đang dùng cùng một `hoveredItem` cho cả preview và selection, khiến touch interaction không ổn định.

**Kết luận:** phải tách:

```
Hover state   → desktop preview
Selected state → click/tap inspection
```

và dùng hai presentation layer khác nhau:

```
Desktop → Smart Popover
Mobile  → Bottom Sheet
```

* * *

### C. Mobile chưa thực sự mobile-first

Lỗi thường gặp là desktop grid được thu nhỏ bằng CSS thay vì thiết kế lại interaction cho touch.

Các rủi ro:

- Cell nhỏ hơn vùng chạm 44×44px.
- 8 cột cố định tạo horizontal overflow.
- Top 3 leaderboard không có `min-width: 0`, `overflow`, hoặc text truncation.
- Modal dùng `max-height`/`width` desktop.
- Form không có `safe-area`, keyboard avoidance hoặc scroll nội bộ.
- Modal chồng nhiều lớp nhưng không có scroll lock/focus management.

* * *

# 2\. Kiến trúc mục tiêu

## 2.1. Tách dữ liệu House khỏi component UI

Không hard-code từng căn nhà trong JSX.

Nên có model tương tự:

TypeScript

```
type HouseTheme =
  | 'cozy_wood'
  | 'space_ship'
  | 'crystal_castle'
  | 'fairy_garden'
  | 'sky_villa'
  | 'cyber_city';

interface HouseRoom {
  id: string;
  type: 'living' | 'bedroom' | 'study' | 'garden' | 'lab' | 'special';
  name: string;
  layout: string;
  assets: OwnedAsset[];
}

interface House {
  id: string;
  ownerId: string;
  ownerName: string;
  plot: {
    row: number;
    col: number;
  };
  theme: HouseTheme;
  title: string;
  rooms: HouseRoom[];
  inventory: OwnedAsset[];
  unlocked: boolean;
}
```

Nguồn dữ liệu:

```
House API / Database
        ↓
HouseRepository
        ↓
Metaverse Store
   ↙          ↘
Grid          House Tour
   ↓              ↓
Hover/Tap      Unique Design Renderer
```

### Quy tắc quan trọng

**28 học sinh không dùng chung một template House Tour.**

Có thể dùng chung engine renderer, nhưng dữ liệu phải khác nhau:

```
HouseThemeDefinition
      +
House Layout Seed
      +
Owner Inventory
      +
Room Configuration
      =
Unique House Design
```

Như vậy vẫn kiểm soát được chi phí phát triển thay vì phải viết thủ công 28 component hoàn toàn khác nhau.

* * *

# 3\. Thiết kế “độc bản” cho từng căn cứ

Đề xuất xây dựng **Theme Engine + Layout Engine**.

## 3.1. Theme Catalog

Ví dụ 28 nhà được phân bổ:

- Nhà Gỗ Cozy
- Phi Thuyền Không Gian
- Lâu Đài Pha Lê
- Vườn Cổ Tích
- Thư Viện Phép Thuật
- Phòng Thí Nghiệm Tương Lai
- Đảo Trên Mây
- Thành Phố Cyber
- Hang Động Kho Báu
- Cung Điện Đại Dương

Mỗi theme định nghĩa:

TypeScript

```
interface ThemeDefinition {
  id: HouseTheme;
  background: string;
  floorAssets: AssetDefinition[];
  wallAssets: AssetDefinition[];
  furnitureSlots: FurnitureSlot[];
  roomTemplates: RoomTemplate[];
}
```

## 3.2. House Layout riêng

Ví dụ:

TypeScript

```
const houses = {
  student_01: {
    theme: 'cozy_wood',
    layoutSeed: 'A17',
    rooms: ['garden', 'living', 'study', 'bedroom'],
  },
  student_02: {
    theme: 'space_ship',
    layoutSeed: 'K42',
    rooms: ['bridge', 'lab', 'sleep_pod', 'engine'],
  },
};
```

`layoutSeed` có thể tạo variation có tính quyết định: cùng dữ liệu luôn render cùng bố cục, nhưng mỗi căn khác nhau.

### Tài sản phải là “đã sở hữu”

Không render đồ trang trí ngẫu nhiên như asset giả.

Nên lấy:

```
student inventory
      ↓
owned furniture / pets / trophies
      ↓
asset placement rules
      ↓
render trong House Tour
```

Điều này giúp House Tour phản ánh thành tích thực tế của học sinh.

* * *

# 4\. Luồng interaction mới

## 4.1. Chip “Nhà riêng (Click thăm)”

Luồng:

```
Click Chip
   ↓
openHouseDirectory()
   ↓
Modal danh sách 28 học sinh
   ↓
Chọn học sinh
   ↓
setSelectedHouse(houseId)
   ↓
openHouseTour(houseId)
```

Không nên để chip trực tiếp phụ thuộc vào một house đang hover.

State đề xuất:

TypeScript

```
type MetaverseUIState = {
  hoveredEntityId: string | null;
  selectedEntityId: string | null;

  isHouseDirectoryOpen: boolean;
  isHouseTourOpen: boolean;

  selectedHouseId: string | null;
};
```

## 4.2. Click trực tiếp ô đất

```
onPlotClick(houseId)
  → selectedHouseId = houseId
  → selectedEntityId = houseId
  → isHouseTourOpen = true
```

**Mỗi ô đất phải có target click rõ ràng.**

Khuyến nghị:

- Render bằng `<button>` hoặc semantic interactive element.
- Không dùng `<div onClick>` nếu có thể tránh.
- Có `aria-label`.
- Không đặt decoration overlay che interaction.
- Asset trang trí dùng `pointer-events: none`.

Ví dụ logic:

TypeScript

```
<button
  type="button"
  onClick={() => openHouseTour(house.id)}
  aria-label={`Thăm nhà của ${house.ownerName}`}
>
  <HousePlot house={house} />
</button>
```

* * *

# 5\. Smart Popover cho Desktop

## 5.1. Không dùng `fixed bottom-6 right-6`

Popover cần anchor theo:

1. Con trỏ chuột, hoặc
2. Bounding rect của entity.

Tôi khuyến nghị ưu tiên **object-anchored popover**, vì ổn định hơn cursor tracking khi người dùng di chuyển chuột.

### State

TypeScript

```
const [hoverAnchor, setHoverAnchor] =
  useState<HTMLElement | null>(null);
```

Khi hover:

```
pointerenter
    ↓
capture target / virtual anchor
    ↓
calculate preferred placement
    ↓
flip nếu chạm boundary
    ↓
shift để không overflow
```

Placement:

```
top
bottom
left
right
```

Fallback:

```
preferred → flip → shift → clamp
```

## 5.2. Nếu cần bám sát con trỏ

Dùng `pointermove`, nhưng cần throttle qua `requestAnimationFrame`.

Không gọi state update không giới hạn theo mọi pixel.

```
pointermove
   ↓
requestAnimationFrame
   ↓
update virtual cursor anchor
   ↓
reposition popover
```

### Boundary checking

Popover phải xét:

```
viewport width
viewport height
popover width
popover height
safe margin
```

Ví dụ:

```
cursorX + popoverWidth > viewportWidth
→ chuyển sang bên trái

cursorY + popoverHeight > viewportHeight
→ chuyển lên trên
```

Nếu framework hiện có hỗ trợ floating-positioning thì nên dùng engine positioning chuyên dụng thay vì tự viết toàn bộ collision logic.

* * *

# 6\. Mobile: Bottom Sheet thay cho Hover Popover

Mobile không nên “giả lập hover”.

Breakpoint có thể dựa trên:

```
(pointer: coarse)
```

kết hợp responsive width, thay vì chỉ dựa vào `window.innerWidth`.

Luồng:

```
Tap house / animal
      ↓
setSelectedEntity(entity)
      ↓
Bottom Sheet opens
      ↓
Drag handle / close
      ↓
clear or retain selection
```

Bottom Sheet nên có:

- Backdrop.
- Drag handle.
- Snap points nếu UX framework hỗ trợ.
- Scroll content độc lập.
- `max-height` an toàn.
- Safe area bottom.
- Close bằng swipe/backdrop/ESC khi phù hợp.
- Không bị keyboard che form.

Ví dụ layout:

```
┌─────────────────────────┐
│                         │
│      Metaverse Grid     │
│                         │
└─────────────────────────┘
███████████████████████████
           ━━━
🏠 Nhà của Minh
Nhà Gỗ Cozy
XP • Thành tích • Tài sản
[ Thăm nhà ]
```

* * *

# 7\. Mobile-first cho lưới 8×8

## Vấn đề cần tránh

Không nên cố đảm bảo **mỗi trong 64 cell đều tối thiểu 44px** trên màn hình điện thoại nhỏ mà vẫn ép toàn bộ grid vừa ngang viewport.

64 cell theo 8 cột × 44px đã là:

```
352px
```

chưa tính gap/padding.

### Kiến trúc tốt hơn

Container:

```
width: 100%;
overflow-x: auto;
```

Grid có:

```
grid-template-columns: repeat(8, minmax(44px, 1fr));
```

và một `min-width` hợp lý.

Hoặc dùng canvas-like world viewport:

```
Viewport
 ├─ pinch zoom
 ├─ pan
 └─ 8x8 world grid
```

### Khuyến nghị theo độ phức tạp

**Phase hiện tại:** responsive CSS Grid + horizontal pan khi cần.

**Không cần xây zoom engine phức tạp ngay**, trừ khi Metaverse thực sự yêu cầu điều hướng bản đồ lớn hơn.

Cell:

```
min-inline-size: 44px
min-block-size: 44px
```

Desktop có thể scale lớn hơn.

* * *

# 8\. Tối ưu Top 3 Bảng Vàng

Trên mobile không dùng ba card desktop đặt cạnh nhau nếu nội dung dài.

Khuyến nghị:

```
🥇 #1 Tên...
🥈 #2 Tên...
🥉 #3 Tên...
```

hoặc compact horizontal strip.

CSS cần:

```
min-width: 0
overflow: hidden
text-overflow: ellipsis
white-space: nowrap
```

Avatar và rank không được co mất; phần tên là phần co giãn.

Ưu tiên hierarchy:

```
Rank > Avatar > Score > Name decoration
```

khi màn hình hẹp.

* * *

# 9\. Chuẩn hóa toàn bộ Modal và Form Mobile

Nên tạo một lớp primitive dùng chung:

```
Dialog / Drawer
├── responsive shell
├── backdrop
├── scroll container
├── safe-area
├── focus handling
└── z-index management
```

Sau đó các feature:

- Nộp nhiệm vụ.
- Cửa hàng.
- Đổi màu trứng.
- Danh sách 28 căn nhà.
- House Tour.

đều tái sử dụng primitive này.

## Quy tắc CSS/UX

```
Desktop → centered dialog / anchored popover
Mobile  → bottom sheet hoặc full-screen sheet tùy độ dài
```

Không nên có năm kiểu modal tự phát triển độc lập.

Với form dài:

```
Sheet shell: fixed
Header: sticky
Content: overflow-y auto
Footer actions: sticky
```

Thêm:

CSS

```
padding-bottom: env(safe-area-inset-bottom);
```

* * *

# 10\. Execution Plan đề xuất cho Antigravity

## Phase 0 — Audit hiện trạng

**Mục tiêu:** tìm chính xác nơi event/state/layout đang bị lỗi.

Kiểm tra:

- Component render chip `"Nhà riêng (Click thăm)"`.
- Component grid 8×8.
- Event handler từng cell.
- `z-index`.
- `pointer-events`.
- State quản lý modal.
- Dữ liệu 28 học sinh/nhà.
- Component card đang dùng `fixed bottom-6 right-6`.
- Các modal hiện có.
- Breakpoint và CSS mobile.

**Output:** interaction map trước khi sửa.

* * *

## Phase 1 — Chuẩn hóa House Domain

Tạo:

```
House
HouseTheme
HouseRoom
OwnedAsset
HouseRepository
```

Yêu cầu kiểm thử:

- Có đủ 28 house record.
- Không trùng `house.id`.
- Mỗi house map đúng owner.
- Mỗi house có theme/layout hợp lệ.
- Asset chỉ render nếu thuộc inventory hoặc starter configuration hợp lệ.

**Acceptance Criteria:**

```
28/28 căn có thể resolve dữ liệu House Tour.
```

* * *

## Phase 2 — Sửa click flow

Implement một API interaction thống nhất:

TypeScript

```
openHouseDirectory()
openHouseTour(houseId)
closeHouseTour()
selectEntity(entityId)
```

Test tự động:

1. Click chip.
2. Modal danh sách xuất hiện.
3. Có 28 lựa chọn.
4. Click một lựa chọn.
5. House Tour đúng `houseId`.
6. Click trực tiếp ô đất.
7. House Tour mở đúng owner.
8. Overlay không chặn click.

**Acceptance:**

```
0 dead click trên 64 ô grid có entity tương tác.
```

* * *

## Phase 3 — House Tour độc bản

Xây:

```
HouseTour
 ├── Theme Renderer
 ├── Layout Renderer
 ├── Room Navigator
 └── Owned Asset Renderer
```

Kiểm thử snapshot/data:

```
house A ≠ house B
theme/layout/assets có khả năng khác biệt
```

Không nhất thiết 28 theme khác nhau, nhưng **28 output thiết kế không được trở thành cùng một sơ đồ clone**.

* * *

## Phase 4 — Smart Popover Desktop

Implement:

```
Desktop only:
hover → anchor → calculate → flip/shift → render
```

Test:

- Entity ở 4 góc viewport.
- Entity sát cạnh trái/phải.
- Entity sát đáy.
- Resize window.
- Scroll container nếu grid nằm trong scroll area.

**Acceptance:**

```
Popover không bị tràn viewport.
Không còn fixed bottom-right info card.
```

* * *

## Phase 5 — Mobile Bottom Sheet

Implement responsive presenter:

TypeScript

```
if (isCoarsePointerOrMobile) {
  render BottomSheet;
} else {
  render SmartPopover;
}
```

Test touch:

- Tap house.
- Tap animal.
- Close sheet.
- Reopen entity khác.
- Nội dung dài scroll được.
- Safe area.
- Keyboard không che submit button.

* * *

## Phase 6 — Responsive hardening

Kiểm thử tối thiểu các viewport:

```
320px
360px
375px
390px
412px
768px
1024px
1440px+
```

Các nhóm test:

### Grid

- Không overflow ngoài ý muốn.
- Hit target đạt tối thiểu 44px.
- Không có dead zone.

### Top 3

- Không tràn.
- Text truncation đúng.

### Modal

- Không bị che.
- Scroll hoạt động.
- Close action luôn truy cập được.

### Form

- Keyboard behavior.
- CTA không mất.
- Validation message không phá layout.

* * *

# 11\. Chiến lược test tự động

## Unit Tests

Test:

- `getHouseById`.
- Theme resolution.
- Layout generation.
- Asset filtering.
- Placement/boundary algorithm.
- State transitions.

Ví dụ:

```
openHouseTour(validId)
→ selectedHouseId = validId
→ isHouseTourOpen = true
```

* * *

## Component Tests

Kiểm tra:

- Chip có thể click.
- Modal 28 houses.
- Cell click.
- House Tour render đúng owner.
- Desktop popover.
- Mobile sheet.

* * *

## E2E Tests

Kịch bản bắt buộc:

### Scenario 1

```
Open portal
→ click "Nhà riêng"
→ chọn học sinh #14
→ thấy House Tour #14
```

### Scenario 2

```
Open portal
→ click trực tiếp plot #14
→ House Tour #14 mở ngay
```

### Scenario 3

```
Desktop
→ hover entity sát góc phải-dưới
→ popover vẫn nằm trong viewport
```

### Scenario 4

```
Mobile viewport
→ tap house
→ bottom sheet xuất hiện
→ swipe/close
→ UI trở lại bình thường
```

### Scenario 5

```
Mobile
→ mở shop/task/egg color modal
→ scroll
→ CTA vẫn sử dụng được
```

* * *

# 12\. Thứ tự triển khai tối ưu

Tôi khuyến nghị **không sửa CSS trước**. Thứ tự đúng là:

```
1. Audit event + state
2. Chuẩn hóa House data model
3. Sửa click flow
4. House Tour renderer
5. Tách Desktop Popover / Mobile Sheet
6. Responsive grid
7. Chuẩn hóa modal primitive
8. Automated tests
9. Visual regression
```

Lý do: nếu interaction/state sai mà chỉ chỉnh giao diện, Antigravity có thể tạo một UI đẹp hơn nhưng vẫn tồn tại dead click và các modal cạnh tranh state với nhau.

## Quyết định kiến trúc cuối cùng

| Khu vực | Giải pháp |
| --- | --- |
| Chip Nhà riêng | Mở House Directory 28 học sinh |
| Click ô đất | Mở trực tiếp House Tour theo `houseId` |
| Thiết kế nhà | Theme Engine + unique layout + inventory |
| Desktop hover | Smart anchored popover + flip/shift boundary |
| Mobile interaction | Tap + Bottom Sheet |
| Grid 8×8 | Touch-first, cell ≥44px, responsive/pannable |
| Top 3 | Compact responsive layout + truncation |
| Modal | Unified responsive Dialog/Drawer primitive |
| Kiểm thử | Unit + Component + E2E + viewport regression |

**Khuyến nghị quan trọng nhất:** tạo một `MetaverseInteractionController`/store làm nguồn sự thật duy nhất cho `hoveredEntity`, `selectedEntity`, `selectedHouseId` và trạng thái overlay. Đây là điểm then chốt để đồng thời xử lý ổn định click nhà, smart popover và mobile bottom sheet mà không tạo thêm các state rời rạc.