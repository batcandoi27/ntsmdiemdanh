⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Đúng hướng nhất là **bỏ hoàn toàn tư duy “icon/emoji + rectangle”** và chuyển sang một **SVG Furniture System + SvgPet renderer**. Mục tiêu là khi nhìn vào phòng, người dùng phải nhận ra ngay *đây là giường, bàn, sofa, tủ sách...*, đồng thời linh vật phải là một nhân vật thực sự chứ không phải vòng tròn chứa chữ.

## 1\. Kiến trúc đồ họa đề xuất

Tách scene thành 4 layer:

```
RoomScene
├── RoomBackground
│   ├── wall
│   ├── floor
│   ├── windows / decorations
│
├── FurnitureLayer
│   ├── BedSvg
│   ├── DeskSvg
│   ├── GamingSofaSvg
│   ├── BookshelfSvg
│   ├── CarpetSvg
│   ├── NeonLampSvg
│   └── MagicTreeSvg
│
├── PetStage
│   ├── PedestalSvg
│   ├── Aura / particles
│   └── SvgPet
│
└── ForegroundEffects
    ├── glow
    ├── shadows
    └── ambient particles
```

**Không nên render SVG thành một ảnh duy nhất.** Mỗi món nên là một component SVG riêng để có thể:

- đổi màu theo rarity/theme;
- scale/rotate;
- animate;
- thay texture;
- bật/tắt glow;
- click/select;
- thay đổi trạng thái;
- tái sử dụng trong inventory/shop.

* * *

# 2\. Bộ tiêu chuẩn SVG

Mỗi furniture component nên có cấu trúc thống nhất:

```
<svg>
  <defs>
    gradients
    filters
    clipPaths
  </defs>

  <g id="shadow"/>
  <g id="body"/>
  <g id="details"/>
  <g id="highlights"/>
  <g id="effects"/>
</svg>
```

### Quy tắc visual

- `viewBox` cố định, ví dụ `0 0 320 240`.
- Không dùng emoji làm hình ảnh chính.
- Không dùng rectangle đơn thuần để đại diện cho furniture.
- Có **silhouette rõ ràng** trước khi thêm decoration.
- Mỗi vật thể phải có `shadow + highlight + depth`.
- Dùng gradient vừa phải, tránh cảm giác “CSS box”.
- Stroke nhất quán, khoảng `2–4px` tùy scale.
- Các chi tiết nhỏ phải biến mất gracefully khi scale nhỏ.
- SVG nên dùng `currentColor`/CSS variables cho những vùng cần theme hóa.

* * *

# 3\. Thiết kế từng món

## 🛏 BedSvg

Đây nên là một trong những asset chi tiết nhất.

### Silhouette

```
        ┌──── headboard ────┐
        │                   │
   ╭────┴───────────────────┴────╮
   │       pillow   pillow        │
   │                              │
   │        folded blanket        │
   ╰──────────────────────────────╯
      │                        │
     leg                      leg
```

### Thành phần SVG

1. **Headboard**
   
   - khung gỗ;
   - viền highlight;
   - panel ở giữa;
   - nếu cyber theme: thêm neon line.
2. **Mattress**
   
   - rounded path;
   - shadow bên dưới;
   - highlight ở mép.
3. **2 pillows**
   
   - path hơi lõm;
   - gradient trắng/xám;
   - drop shadow riêng.
4. **Blanket**
   
   - path lớn phủ khoảng 40–60% giường;
   - 3–5 đường wrinkle;
   - gradient theo rarity.
5. **Bed legs**
   
   - perspective nhẹ;
   - shadow xuống sàn.

### Animation

Không animate toàn bộ giường. Chỉ:

- blanket highlight rất nhẹ;
- ambient glow nếu legendary;
- shadow breathing cực nhỏ.

* * *

# 4\. DeskSvg

Đây là món nên tạo cảm giác “có người đang sử dụng”.

### Các thành phần

- mặt bàn gỗ;
- 2–4 chân bàn;
- laptop mở khoảng 100–110°;
- màn hình có UI miniature;
- keyboard;
- notebook mở;
- 1–2 cây bút;
- coffee mug;
- hơi nước.

### Điểm quan trọng

**Laptop phải có silhouette mở**, không phải một rectangle đặt trên bàn.

Ví dụ:

```
             ┌──────────────┐
             │   •  •  •    │
             │    laptop    │
             └──────┬───────┘
                  ╱╱╱╱
        ┌────────────────────┐
        │  notebook   ☕      │
        └────────────────────┘
```

Steam có thể animate bằng:

```
opacity: 0 → 0.6 → 0
transform: translateY(...)
```

* * *

# 5\. GamingSofaSvg

Không nên dùng hình chữ nhật bo góc.

Silhouette phải thể hiện ngay:

- lưng ghế cao;
- hai cánh ôm người;
- seat cushion;
- armrests;
- headrest;
- accent RGB.

Có thể xây bằng các `path`:

```
          ╭────────────╮
        ╭─╯  HEADREST  ╰─╮
       ╱                  ╲
      │   ╭────────────╮   │
      │  ╱              ╲  │
      │ │    CUSHION     │ │
      │  ╲              ╱  │
      ╰──╯              ╰──╯
```

RGB strip chỉ nên nằm ở contour, không phủ toàn bộ furniture.

* * *

# 6\. BookshelfSvg

Đây là asset rất dễ làm scene “có đời sống”.

### Kệ

- 3–5 tầng;
- frame gỗ;
- mỗi tầng có perspective nhẹ.

### Sách

Không tạo 10 rectangle giống nhau.

Mỗi cuốn nên khác:

- chiều cao;
- độ nghiêng;
- độ dày;
- màu;
- spine decoration.

Thêm:

- chậu hoa nhỏ;
- 1 cuốn sách mở;
- bookmark.

Ở độ phân giải nhỏ, chỉ cần silhouette của từng cuốn; zoom lớn mới hiện spine details.

* * *

# 7\. CarpetSvg

Thảm nên nằm **dưới furniture**, không phải layer trên cùng.

Cấu trúc:

```
outer silhouette
   ↓
gradient base
   ↓
woven pattern
   ↓
inner border
   ↓
fringe
   ↓
soft shadow
```

Có thể dùng pattern SVG:

XML

```
<pattern id="wovenPattern">
   ...
</pattern>
```

thay vì vẽ hàng trăm path thủ công.

Gradient sang trọng nên rất subtle.

* * *

# 8\. NeonLampSvg

Đây là nơi dùng SVG filter rất hiệu quả.

```
Lamp body
   ↓
warm radial gradient
   ↓
blurred glow
   ↓
sharp light core
```

Dùng:

- `radialGradient`
- `feGaussianBlur`
- opacity layers

Nhưng **không nên blur cả lamp**, chỉ blur layer glow.

```
Lamp
├── hard silhouette
├── emissive core
└── glow layer
```

Như vậy asset vẫn sắc nét.

* * *

# 9\. MagicTreeSvg

Cây tri thức nên trở thành **hero furniture**.

### Thân

- trunk path;
- highlight;
- branch splitting.

### Tán

Không dùng một hình tròn.

Tạo 3–5 tầng foliage:

```
           ● ●
        ● ● ● ● ●
      ● ● ● ● ● ● ●
    ● ● ● ● ● ● ● ● ●
          ╲│╱
           │
         ╱───╲
```

Mỗi tầng có:

- gradient;
- shadow;
- highlight.

### Fruit

Một số quả có:

- radial glow;
- tiny specular highlight;
- floating particle.

### Pot

- ceramic shape;
- rim;
- shadow;
- decorative pattern.

* * *

# 10\. SvgPet — phần quan trọng nhất

Yêu cầu **“linh vật luôn hiện ở chế độ 2D hoặc 3D”** nên được xử lý như một renderer thật sự, không phải text placeholder.

Kiến trúc:

```
<SvgPet
  species={pet.species}
  level={pet.level}
  gender={pet.gender}
  evolution={pet.evolution}
  mood={pet.mood}
  direction={pet.direction}
/>
```

Pet renderer:

```
SvgPet
├── aura
├── shadow
├── body
├── face
├── eyes
├── ears / horns / wings
├── accessory
├── genderMark
├── levelBadge
└── animation
```

### Điều kiện bắt buộc

Pet **luôn có mặt trong room scene**.

Không được fallback thành:

```
⭕ Lv.12
```

hoặc:

```
🐱
```

Fallback tối đa chỉ nên là một **silhouette SVG của pet** nếu asset cụ thể chưa load.

* * *

# 11\. Pedestal cho Pet

Đặt pet tại tâm phòng:

```
             ✦  ✦
          ╭────────╮
       ✦  │  PET   │  ✦
          ╰────────╯
          ╱        ╲
        ╱  PEDESTAL  ╲
       ╰──────────────╯
```

Layer:

```
PetStage
├── floorShadow
├── pedestalShadow
├── pedestal
├── auraOuter
├── auraInner
├── petShadow
├── SvgPet
└── particles
```

**Pet phải nằm phía trên pedestal nhưng phía dưới foreground effects.**

* * *

# 12\. 2D và 3D

Tôi khuyên **không làm hai code path hoàn toàn khác nhau**.

Dùng cùng một model:

TypeScript

```
PetRenderMode = "2d" | "3d"
```

### 2D mode

SVG vector:

- silhouette;
- outline;
- gradients;
- highlights;
- squash/stretch;
- idle animation.

### 3D mode

Nếu project đã có WebGL/3D renderer:

```
PetStage
 ├── SVG pedestal
 └── 3D pet
```

Nếu chưa có 3D engine, **ưu tiên 2D SVG trước**. Một SVG pet được thiết kế tốt với lighting giả lập sẽ đẹp và nhẹ hơn việc đưa một hệ 3D phức tạp vào chỉ để giải quyết yêu cầu này.

* * *

# 13\. Animation system

Pet nên có idle loop mặc định.

Ví dụ:

```
idle
  ↓
body scaleY 1.00 → 1.025 → 1.00
  ↓
head slight rotation
  ↓
blink
  ↓
ear/tail movement
  ↓
return
```

Random blink khoảng vài giây một lần.

Không nên animation tất cả furniture cùng lúc vì sẽ biến phòng thành “đống chuyển động”.

Chỉ cho animation ở:

- pet;
- steam;
- neon;
- magic tree particles;
- một vài ambient effects.

* * *

# 14\. Data-driven furniture

Không hard-code từng furniture vào Room.

Nên có model:

TypeScript

```
type FurnitureItem = {
  id: string;
  type:
    | "bed"
    | "desk"
    | "gaming-sofa"
    | "bookshelf"
    | "carpet"
    | "neon-lamp"
    | "magic-tree";

  x: number;
  y: number;
  scale: number;
  rotation: number;

  rarity?: "common" | "rare" | "epic" | "legendary";
  palette?: string;
};
```

Sau đó:

```
FurnitureRenderer
       │
       ├── BedSvg
       ├── DeskSvg
       ├── GamingSofaSvg
       ├── BookshelfSvg
       ├── CarpetSvg
       ├── NeonLampSvg
       └── MagicTreeSvg
```

Điều này giúp sau này thêm `WardrobeSvg`, `AquariumSvg`, `ArcadeSvg` mà không phải sửa Room engine.

* * *

# 15\. Palette system

Không copy/paste SVG cho từng màu.

Ví dụ:

CSS

```
--wood-primary
--wood-secondary
--fabric-primary
--fabric-secondary
--metal
--emissive
--outline
```

Rarity có thể thay:

```
Common
→ material + subtle highlight

Rare
→ stronger highlight

Epic
→ emissive accents

Legendary
→ emissive + particles + aura
```

Như vậy một `BedSvg` có thể trở thành 10–20 biến thể mà không cần 10 SVG độc lập.

* * *

# 16\. Z-index / depth

Đây là điểm rất quan trọng để room trông giống một căn phòng thật.

Nên có quy tắc:

```
0  Background
10 Floor
20 Carpet
30 Furniture back
40 Furniture body
50 Pet pedestal
60 Pet
70 Furniture foreground
80 Particles
90 UI effects
100 HUD
```

Nếu có object overlap, tốt hơn nữa là sort theo `y`:

```
renderOrder = object.y
```

để vật thể phía dưới màn hình tự động nằm phía trước.

* * *

# 17\. Execution Plan cho Antigravity

### Phase 1 — Audit

-  Tìm component room hiện tại.
-  Tìm nơi đang render rectangle/emoji/placeholder furniture.
-  Tìm component/model pet hiện tại.
-  Xác định cơ chế asset loading hiện có.
-  Xác định framework SVG/animation đang sử dụng.

### Phase 2 — SVG foundation

-  Tạo `FurnitureSvg` base conventions.
-  Tạo shared gradients.
-  Tạo shared shadow/highlight primitives.
-  Tạo palette/rarity tokens.
-  Tạo `FurnitureRenderer`.

### Phase 3 — Furniture

Implement theo thứ tự:

1. `BedSvg`
2. `DeskSvg`
3. `GamingSofaSvg`
4. `BookshelfSvg`
5. `CarpetSvg`
6. `NeonLampSvg`
7. `MagicTreeSvg`

Mỗi asset phải có **silhouette test**: thu nhỏ asset và kiểm tra người dùng vẫn nhận ra món đồ.

### Phase 4 — Pet

-  Tạo `SvgPet`.
-  Map species → appearance.
-  Map evolution/level → morphology.
-  Map gender → accessory/mark.
-  Implement idle animation.
-  Implement blink.
-  Implement aura.
-  Implement pedestal.
-  Remove text/circle placeholder.
-  Ensure pet renders by default whenever room opens.

### Phase 5 — Room integration

-  Replace furniture placeholders.
-  Add depth ordering.
-  Add floor shadows.
-  Add ambient lighting.
-  Put `SvgPet` at room center.
-  Ensure furniture never accidentally occludes the pet.
-  Test responsive scaling.

### Phase 6 — Automated tests

Nên test cả **logic lẫn visual regression**.

#### Unit

```
FurnitureRenderer
✓ renders correct component for each type
✓ applies palette
✓ applies rarity
✓ respects position
✓ respects scale
✓ respects rotation
```

```
SvgPet
✓ renders for valid species
✓ renders correct evolution
✓ renders level
✓ renders gender accessory
✓ has no placeholder fallback
✓ remains visible in default room state
```

#### Integration

```
✓ opening room renders furniture
✓ opening room renders SvgPet
✓ furniture does not replace pet
✓ pet remains after state update
✓ changing furniture does not remove pet
✓ changing pet level updates appearance
```

#### Visual regression

Chụp snapshot các scene:

```
room-empty
room-basic
room-furnished
room-legendary
room-pet-level-1
room-pet-evolved
room-dark-theme
room-mobile
```

Đây là phần rất đáng làm vì lỗi “có component nhưng nhìn vẫn như rectangle” thường **unit test không phát hiện được**.

* * *

# 18\. Definition of Done

Tôi sẽ coi task này hoàn thành khi:

**Furniture**

-  Không còn rectangle/emoji làm đại diện chính.
-  Nhìn thumbnail vẫn nhận ra từng món.
-  Có depth/shadow/highlight.
-  Có palette/theme.
-  Có rarity treatment.
-  Scale không phá hình.

**Pet**

-  `SvgPet` xuất hiện mặc định khi mở phòng.
-  Pet nằm ở tâm phòng/pedestal.
-  Có body/face/accessory thực tế.
-  Level/evolution được phản ánh.
-  Gender accessory được phản ánh.
-  Có idle animation.
-  Có aura/pedestal.
-  Không còn vòng tròn chữ/emoji placeholder.

**Quality**

-  Không có layout shift khi SVG load.
-  Không có console error.
-  Không có SVG overflow ngoài room.
-  Không có z-index khiến pet bị mất.
-  Visual regression pass.
-  Performance không tụt đáng kể khi room có nhiều furniture.

## Kiến trúc tôi khuyến nghị chốt

```
                    RoomScene
                       │
          ┌────────────┴────────────┐
          │                         │
   FurnitureRenderer             PetStage
          │                         │
   ┌──────┼──────┐          ┌───────┴────────┐
   │      │      │          │                │
  Bed   Desk   Sofa      Pedestal          SvgPet
   │      │      │                           │
   └──────┴──────┴── ...                     │
                                             │
                                   ┌─────────┼─────────┐
                                   │         │         │
                                 Body      Face     Accessory
                                             │
                                        Animation
```

**Điểm mấu chốt:** đừng coi đây là task “đổi icon thành SVG”. Hãy coi nó là việc xây **một mini 2D rendering system cho căn phòng**. Furniture là các vector asset có cấu trúc; `SvgPet` là character renderer; `RoomScene` chịu trách nhiệm depth/lighting/animation. Làm theo kiến trúc này thì sau này thêm hàng chục món nội thất và nhiều dạng pet vẫn không biến code thành một mớ `if/else`.

Hiện trong context tôi không có snapshot file/component cụ thể của workspace để chỉ chính xác file nào cần sửa, nên Execution Plan trên được viết ở mức triển khai độc lập, không giả định tên file hay framework chưa được xác nhận.