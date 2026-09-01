⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là kiến trúc tôi đề xuất cho `RoomFloorPlanEditor` + `InventoryStore`, ưu tiên **data integrity, thao tác canvas mượt, dễ persist và dễ test tự động**. Tôi sẽ tách rõ **domain state**, **UI/editor state**, **persistence**, và **transaction mua vật phẩm** để tránh lỗi kiểu “UI báo mua thành công nhưng inventory không có item”.

## 1\. Kiến trúc tổng thể

```
                    ┌──────────────────────┐
                    │     Shop Catalog     │
                    │  ItemDefinition[]    │
                    └──────────┬───────────┘
                               │ buy
                               ▼
┌──────────────┐       ┌──────────────────┐
│ Coin/Wallet  │◄─────►│  PurchaseService │
└──────────────┘       └────────┬─────────┘
                                │ atomic
                                ▼
                       ┌─────────────────┐
                       │ InventoryStore  │
                       │ owned instances  │
                       └────────┬────────┘
                                │ place
                                ▼
                    ┌──────────────────────┐
                    │ RoomFloorPlanEditor  │
                    │                      │
                    │ Grid / Walls / Doors │
                    │ Placed furniture     │
                    └──────────┬───────────┘
                               │ save
                               ▼
                       ┌────────────────┐
                       │ LayoutStorage  │
                       └────────────────┘
```

### Nguyên tắc quan trọng

**Shop không được trực tiếp mutate UI inventory.**

Luồng đúng:

```
Buy
 → validate price/ownership
 → deduct coins
 → create inventory instance
 → persist transaction
 → update store
 → UI render từ store
```

Tương tự:

```
Inventory
 → Place
 → remove/lock one owned instance
 → create placed instance/reference
 → update layout
 → persist
```

Không nên có hai nguồn sự thật kiểu:

```
React state: inventoryItems
localStorage: inventoryItems
canvas state: placedItems
```

rồi tự đồng bộ lẫn nhau. Điều đó rất dễ tạo bug.

* * *

# 2\. Domain Model

## `ItemDefinition`

Đây là **catalog definition**, không phải vật phẩm sở hữu cụ thể.

TypeScript

```
type ItemCategory =
  | "bed"
  | "sofa"
  | "table"
  | "chair"
  | "desk"
  | "lamp"
  | "rug"
  | "plant"
  | "cabinet"
  | "decor";

interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;

  price: number;

  footprint: {
    width: number;
    height: number;
  };

  allowedRooms?: string[];

  defaultColors: {
    primary: string;
    secondary?: string;
    accent?: string;
  };

  colorSlots: Array<
    "primary" | "secondary" | "accent"
  >;

  asset: {
    type: "svg" | "image" | "procedural";
    src: string;
  };
}
```

Ví dụ:

```
SOFA_001
  footprint: 2x1
  colorSlots:
    primary
    secondary
```

* * *

# 3\. Inventory Domain

Đây mới là item mà học sinh **thực sự sở hữu**.

TypeScript

```
interface InventoryItem {
  instanceId: string;
  definitionId: string;

  acquiredAt: number;

  customization: {
    primary: string;
    secondary?: string;
    accent?: string;
  };

  status: "available" | "placed";
}
```

### Tại sao cần `instanceId`?

Không nên dùng:

TypeScript

```
inventory: ["sofa", "sofa", "chair"]
```

mà dùng:

```
SOFA instance A
SOFA instance B
CHAIR instance C
```

Vì hai sofa cùng loại có thể có:

```
Sofa A → màu đỏ
Sofa B → màu xanh
```

và nằm ở hai vị trí khác nhau.

* * *

# 4\. Floor Plan Model

Tôi khuyến nghị grid **8×8** làm mặc định.

6×6 có thể dùng cho room nhỏ, nhưng 8×8 linh hoạt hơn cho furniture placement.

TypeScript

```
interface FloorPlan {
  id: string;
  ownerId: string;

  grid: {
    columns: 8;
    rows: 8;
    cellSize: number;
  };

  boundary: Rect;

  walls: WallSegment[];
  doors: Door[];

  rooms: RoomRegion[];

  placedItems: PlacedItem[];

  version: number;
  updatedAt: number;
}
```

* * *

# 5\. Room

TypeScript

```
interface RoomRegion {
  id: string;
  name: string;

  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  type:
    | "living"
    | "bedroom"
    | "kitchen"
    | "bathroom"
    | "shop"
    | "office"
    | "hall";
}
```

Ví dụ:

```
┌─────────────────────────┐
│        BEDROOM          │
│                         │
├────────────┬────────────┤
│   LIVING   │  KITCHEN   │
│            │            │
├────────────┴──────┬─────┤
│      HALL         │BATH │
└───────────────────┴─────┘
```

* * *

# 6\. Wall và Door

TypeScript

```
interface WallSegment {
  id: string;

  start: {
    x: number;
    y: number;
  };

  end: {
    x: number;
    y: number;
  };

  thickness: number;

  type: "outer" | "inner";
}
```

TypeScript

```
interface Door {
  id: string;

  position: {
    x: number;
    y: number;
  };

  width: number;

  orientation: "horizontal" | "vertical";

  swing?: "left" | "right";
}
```

Điều này cho phép render giống bản vẽ kiến trúc thay vì chỉ là grid game.

* * *

# 7\. `PlacedItem`

Đây là entity quan trọng nhất của editor.

TypeScript

```
interface PlacedItem {
  placementId: string;

  inventoryInstanceId: string;
  definitionId: string;

  position: {
    gridX: number;
    gridY: number;
  };

  rotation: 0 | 90 | 180 | 270;

  customization: {
    primary: string;
    secondary?: string;
    accent?: string;
  };

  locked?: boolean;
}
```

Tôi khuyến nghị **không copy toàn bộ item definition vào `PlacedItem`**.

Chỉ lưu:

```
definitionId
inventoryInstanceId
```

Sau đó resolve definition từ catalog.

* * *

# 8\. `RoomFloorPlanEditor` State

Cần phân biệt **domain state** với **transient editor state**.

### Domain state

TypeScript

```
interface FloorPlanState {
  floorPlan: FloorPlan;
  inventory: InventoryItem[];
}
```

### Editor state

TypeScript

```
interface EditorUIState {
  mode:
    | "select"
    | "place"
    | "move";

  selectedPlacementId?: string;

  selectedInventoryInstanceId?: string;

  hoveredCell?: {
    x: number;
    y: number;
  };

  colorEditorOpen: boolean;

  dirty: boolean;

  saveStatus:
    | "saved"
    | "saving"
    | "unsaved"
    | "error";
}
```

**Không persist `EditorUIState`** trừ khi có yêu cầu UX đặc biệt.

Ví dụ:

```
selectedPlacementId
hoveredCell
colorEditorOpen
```

không phải dữ liệu của ngôi nhà.

* * *

# 9\. InventoryStore API

Tôi đề xuất store có API domain rõ ràng:

TypeScript

```
interface InventoryStore {
  items: InventoryItem[];

  addItem(
    definitionId: string
  ): InventoryItem;

  removeItem(
    instanceId: string
  ): void;

  getItem(
    instanceId: string
  ): InventoryItem | undefined;

  markPlaced(
    instanceId: string
  ): void;

  markAvailable(
    instanceId: string
  ): void;

  updateCustomization(
    instanceId: string,
    customization: Partial<InventoryItem["customization"]>
  ): void;
}
```

Không để component gọi trực tiếp:

TypeScript

```
localStorage.setItem(...)
```

hoặc:

TypeScript

```
setInventory(...)
```

ở hàng chục nơi.

* * *

# 10\. Purchase Flow — sửa lỗi "Mua"

Đây là phần cần ưu tiên cao nhất.

Tạo `PurchaseService`:

TypeScript

```
interface PurchaseService {
  purchase(
    definitionId: string,
    playerId: string
  ): Promise<PurchaseResult>;
}
```

Transaction logic:

```
1. Load item definition
2. Validate item exists
3. Validate price
4. Validate player wallet
5. Deduct coins
6. Create InventoryItem
7. Persist wallet
8. Persist inventory
9. Return success
```

### Không được làm:

```
deduct UI coins
setTimeout(...)
add inventory
show "Mua thành công"
```

Nếu persistence thất bại thì UI không được báo thành công.

### Kết quả chuẩn

TypeScript

```
type PurchaseResult =
  | {
      success: true;
      inventoryInstanceId: string;
      remainingCoins: number;
    }
  | {
      success: false;
      reason:
        | "ITEM_NOT_FOUND"
        | "INSUFFICIENT_COINS"
        | "ALREADY_OWNED"
        | "PERSIST_FAILED";
    };
```

UI mapping:

```
success
→ "Đã mua Sofa thành công! Đã thêm vào Kho Đồ."

INSUFFICIENT_COINS
→ "Không đủ Xu để mua vật phẩm này."

PERSIST_FAILED
→ "Mua vật phẩm chưa hoàn tất. Xu của bạn chưa bị trừ."
```

Điểm cuối rất quan trọng: **failure phải không làm mất Xu**.

* * *

# 11\. Placement Flow

### Thêm vật phẩm

```
Kho đồ
 ↓
Select item
 ↓
Editor mode = place
 ↓
Mouse/tap grid cell
 ↓
Validate footprint
 ↓
Validate collision
 ↓
Validate room/boundary
 ↓
Create PlacedItem
 ↓
inventory.status = placed
 ↓
save
```

API:

TypeScript

```
placeItem(
  inventoryInstanceId: string,
  position: GridPosition
): Result<PlacedItem>;
```

* * *

# 12\. Move Flow

Không nên drag tự do ngay từ đầu.

Yêu cầu hiện tại là:

> chọn đồ → chọn ô mới

Do đó interaction nên là:

```
Click furniture
        ↓
selected
        ↓
Click destination cell
        ↓
validate
        ↓
update x/y
        ↓
save
```

Điều này cũng dễ test automation hơn rất nhiều.

TypeScript

```
moveItem(
  placementId: string,
  destination: GridPosition
): Result<void>;
```

* * *

# 13\. Remove Flow

```
Click furniture
 ↓
Remove
 ↓
delete PlacedItem
 ↓
inventory.status = available
 ↓
item trở lại Kho
 ↓
save
```

Không được `delete InventoryItem`.

Vì user **đã mua item**, chỉ là item không còn được đặt trong phòng.

* * *

# 14\. Color Setting

Màu phải nằm trên **instance**, không nằm trên `ItemDefinition`.

Ví dụ:

```
Catalog
SOFA_001
default = beige

Inventory
SOFA_INSTANCE_A
primary = red

SOFA_INSTANCE_B
primary = blue
```

API:

TypeScript

```
updateItemColor(
  placementId: string,
  slot: "primary" | "secondary" | "accent",
  value: string
): void;
```

UI:

```
┌────────────────────────┐
│  CHỈNH MÀU VẬT PHẨM    │
├────────────────────────┤
│ Màu chính     [████]   │
│ Màu phụ       [████]   │
│ Màu điểm nhấn [████]   │
│                        │
│ [Hủy]       [Lưu]      │
└────────────────────────┘
```

Mỗi loại item chỉ expose những `colorSlots` mà definition cho phép.

* * *

# 15\. Collision Engine

Đây là thành phần nên tách riêng:

TypeScript

```
interface PlacementValidator {
  canPlace(
    definition: ItemDefinition,
    position: GridPosition,
    floorPlan: FloorPlan
  ): ValidationResult;
}
```

Các rule:

```
✓ nằm trong boundary
✓ không xuyên tường
✓ không đè cửa
✓ không overlap furniture
✓ footprint hợp lệ
✓ nằm trong room hợp lệ nếu item yêu cầu
```

Ví dụ sofa `2×1` ở `(6,7)` trên grid `8×8`:

```
x = 6
width = 2

6 + 2 = 8 ✓
```

Còn `(7,7)`:

```
7 + 2 = 9 ✗
```

* * *

# 16\. Canvas Architecture

Không nên để canvas component chứa business logic.

Tách:

```
RoomFloorPlanEditor
│
├── FloorPlanCanvas
│   ├── GridLayer
│   ├── WallLayer
│   ├── DoorLayer
│   ├── RoomLayer
│   ├── FurnitureLayer
│   └── SelectionLayer
│
├── InventoryPanel
├── ItemInspector
├── ColorPicker
├── EditorToolbar
└── SaveIndicator
```

Canvas chỉ nên nhận state + dispatch action:

TypeScript

```
<FloorPlanCanvas
  floorPlan={floorPlan}
  selectedPlacementId={selectedPlacementId}
  onCellClick={handleCellClick}
  onItemClick={handleItemClick}
/>
```

* * *

# 17\. Blueprint Visual Language

Tôi đề xuất phong cách:

- nền blueprint xanh/xám đậm;
- grid mảnh 8×8;
- outer wall đậm;
- inner wall mảnh hơn;
- door có cung swing;
- room label nhỏ;
- furniture dùng SVG/procedural top-down;
- selection có outline;
- ô hợp lệ khi placing có preview;
- ô lỗi hiển thị trạng thái invalid;
- không dùng perspective/isometric.

Quan trọng nhất: **mọi furniture asset phải được thiết kế theo top-down footprint**, không dùng icon front-facing hiện tại rồi đặt lên canvas.

* * *

# 18\. Autosave

Không save sau từng pixel mouse movement.

Với interaction hiện tại, save sau mỗi **domain command hoàn tất**:

```
place
move
remove
changeColor
```

Có thể debounce:

```
command
 ↓
mark dirty
 ↓
500–1000ms debounce
 ↓
persist layout
 ↓
saved
```

State:

```
● Đã lưu
◐ Đang lưu...
● Có thay đổi chưa lưu
⚠ Lưu thất bại
```

* * *

# 19\. Persistence Schema

Nếu hệ thống hiện tại dùng localStorage:

```
player:{playerId}:inventory
player:{playerId}:floorPlan
```

Nhưng domain layer không được phụ thuộc localStorage.

TypeScript

```
interface InventoryRepository {
  load(playerId: string): Promise<InventoryItem[]>;
  save(
    playerId: string,
    items: InventoryItem[]
  ): Promise<void>;
}
```

TypeScript

```
interface FloorPlanRepository {
  load(playerId: string): Promise<FloorPlan | null>;

  save(
    playerId: string,
    floorPlan: FloorPlan
  ): Promise<void>;
}
```

Sau này đổi:

```
localStorage
→ IndexedDB
→ REST
→ Firebase/Supabase
```

không cần viết lại editor.

* * *

# 20\. Versioning

Layout nên có:

TypeScript

```
version: number;
schemaVersion: number;
updatedAt: number;
```

Ví dụ:

JSON

```
{
  "schemaVersion": 1,
  "version": 14,
  "updatedAt": 1787840000000
}
```

Nếu sau này thêm:

```
rotation
wall types
room themes
```

có thể migrate data cũ.

* * *

# 21\. Execution Plan cho Antigravity

Tôi đề xuất **không triển khai tất cả UI một lúc**. Chia thành 7 vertical slices.

### Phase 1 — Audit & domain foundation

-  Xác định source-of-truth hiện tại của Xu.
-  Xác định source-of-truth hiện tại của Inventory.
-  Xác định shop item schema hiện tại.
-  Xác định persistence hiện tại.
-  Tạo `ItemDefinition`.
-  Tạo `InventoryItem`.
-  Tạo `FloorPlan`.
-  Tạo repository interfaces.
-  Không thay đổi UI canvas ở phase này.

**Acceptance:** type-check/build pass và domain model compile.

* * *

### Phase 2 — Fix Shop transaction

-  Implement `PurchaseService`.
-  Atomic coin deduction + inventory insertion.
-  Handle insufficient coins.
-  Handle persistence failure.
-  Success notification.
-  Refresh/reload vẫn thấy item trong Inventory.

**Automation bắt buộc:**

```
coins = 100
item price = 30

BUY

assert coins == 70
assert inventory.length == oldLength + 1
assert inventory item.definitionId == target
```

Reload:

```
assert inventory still contains target
```

* * *

### Phase 3 — Floor-plan renderer

-  Tạo 8×8 grid.
-  Outer walls.
-  Inner walls.
-  Rooms.
-  Doors.
-  Room labels.
-  Top-down furniture renderer.
-  Responsive canvas.

**Acceptance:** screenshot/visual test xác nhận layout không bị lệch grid.

* * *

### Phase 4 — Place / Remove

-  Inventory item selection.
-  Place mode.
-  Cell snapping.
-  Collision validation.
-  Place item.
-  Remove item.
-  Return item to inventory.
-  Persist.

Automation:

```
buy sofa
→ inventory contains sofa

select sofa
→ click (2,3)

assert sofa.position == (2,3)
assert sofa.status == placed

remove sofa

assert sofa.status == available
assert no placed sofa
```

* * *

### Phase 5 — Move

-  Select furniture.
-  Highlight selected item.
-  Click destination cell.
-  Validate destination.
-  Update coordinates.
-  Persist.
-  Reload and verify coordinates.

Test:

```
place chair at (2,2)
move to (5,4)

assert position == (5,4)
```

Invalid:

```
move outside grid
→ position unchanged
```

Collision:

```
move onto occupied footprint
→ position unchanged
```

* * *

### Phase 6 — Per-instance customization

-  Item inspector.
-  Color slots.
-  Color picker.
-  Save customization.
-  Render customized item.
-  Verify two identical items can have different colors.

Test:

```
SOFA_A → red
SOFA_B → blue

assert A.color != B.color
```

Reload test cũng bắt buộc.

* * *

### Phase 7 — Autosave + visitor view

-  Debounced save.
-  Save status.
-  Error recovery.
-  Load saved layout.
-  Read-only visitor renderer.
-  Verify visitor sees same furniture positions/colors.
-  Ensure visitor cannot mutate owner's inventory/layout.

* * *

# 22\. Test Matrix bắt buộc

| Feature | Happy path | Failure path | Reload |
| --- | --- | --- | --- |
| Buy | ✓ | ✓ insufficient Xu | ✓ |
| Inventory | ✓ | duplicate/error | ✓ |
| Place | ✓ | collision/outside | ✓ |
| Move | ✓ | invalid destination | ✓ |
| Remove | ✓ | invalid ID | ✓ |
| Color | ✓ | invalid slot | ✓ |
| Save | ✓ | persistence error | ✓ |
| Visitor | ✓ | unauthorized mutation | ✓ |

* * *

# 23\. Các invariant cần khóa bằng test

Đây là phần tôi đặc biệt khuyến nghị Antigravity viết **unit test trước implementation UI**.

### Inventory invariant

```
Một inventoryInstanceId chỉ tồn tại một lần.
```

### Placement invariant

```
Mỗi placed item phải tham chiếu một inventory instance hợp lệ.
```

### Ownership invariant

```
Không thể đặt item mà player không sở hữu.
```

### Collision invariant

```
Không có hai placed items overlap nếu rule không cho phép.
```

### Boundary invariant

```
Mọi footprint phải nằm trong floor plan.
```

### Persistence invariant

```
save → reload
phải cho ra cùng domain state.
```

### Purchase invariant

```
purchase success
=> coins giảm đúng price
=> inventory tăng đúng 1 item
```

và:

```
purchase failure
=> coins không thay đổi
=> inventory không thay đổi
```

* * *

# 24\. Một quyết định kiến trúc rất quan trọng

Tôi **không khuyến nghị** model inventory như:

TypeScript

```
inventory: {
  sofa: 3
}
```

cho hệ thống này.

Nên dùng:

```
InventoryItem instance
        ↓
PlacedItem
        ↓
position + rotation + customization
```

vì requirement đã có:

- thêm/bớt;
- di chuyển từng vật phẩm;
- đổi màu **từng vật phẩm**;
- bạn bè ghé thăm;
- nhiều vật phẩm cùng loại.

Nếu dùng quantity-only model, đến lúc user đổi màu **Sofa #2** sẽ phải phát sinh thêm rất nhiều workaround.

* * *

# 25\. Definition of Done

Task này chỉ nên được coi là hoàn thành khi flow end-to-end chạy được:

```
SHOP
  ↓
Mua Sofa
  ↓
Xu giảm thật
  ↓
Sofa xuất hiện trong Kho
  ↓
Chọn Sofa
  ↓
Đặt vào ô 3,4
  ↓
Chọn Sofa
  ↓
Đổi màu
  ↓
Di chuyển sang 5,2
  ↓
Lưu
  ↓
Reload
  ↓
Sofa vẫn ở 5,2 + đúng màu
  ↓
Xóa Sofa
  ↓
Sofa quay lại Kho
  ↓
Bạn bè mở nhà
  ↓
Nhìn thấy đúng floor plan
```

**Ưu tiên triển khai:** `PurchaseService + Inventory persistence` → `FloorPlan domain` → `Place/Remove` → `Move` → `Color` → `Autosave/Visitor`.

Cách chia này giúp Antigravity có thể hoàn thành và kiểm chứng từng vertical slice, thay vì xây một canvas lớn rồi mới phát hiện Shop, Inventory và persistence không đồng bộ.