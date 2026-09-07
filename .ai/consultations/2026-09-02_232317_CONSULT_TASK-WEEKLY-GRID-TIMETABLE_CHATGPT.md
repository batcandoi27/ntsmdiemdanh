---
type: consultation
task_id: TASK-WEEKLY-GRID-TIMETABLE
created_at: 2026-09-02T16:23:17.154Z
model: chatgpt-web/luna
bridge_endpoint: http://127.0.0.1:17841/v1/responses
---

# BẢN THAM VẤN KIẾN TRÚC & UX: BẢNG GRID THỜI KHÓA BIỂU CẢ TUẦN ZERO-TOUCH

⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là kiến trúc tôi khuyến nghị theo hướng **“Weekly Grid First + Zero-Touch 1-Chạm”**: người dùng nhìn được toàn bộ tuần trong một màn hình, thao tác nhập liệu chủ yếu bằng **1 click**, còn các thao tác nâng cao chỉ xuất hiện khi cần.

## 1\. Kiến trúc Bảng Grid Tuần

### 1.1. Cấu trúc tổng thể

Nên bỏ hoàn toàn mô hình:

> Tab Thứ 2 → danh sách tiết → Tab Thứ 3 → ...

và chuyển thành:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ THỜI KHÓA BIỂU · LỚP 7A1                         [Tuần 02/09–07/09]         │
│ [← Tuần trước] [Hôm nay] [Tuần sau →]          [Sao chép ngày] [In TKB]    │
├────────────┬────────────┬────────────┬────────────┬────────────┬────────────┤
│ TIẾT       │ THỨ 2      │ THỨ 3      │ THỨ 4      │ THỨ 5      │ THỨ 6      │
├────────────┼────────────┼────────────┼────────────┼────────────┼────────────┤
│ ☀ SÁNG     │            │            │            │            │            │
│ Tiết 1     │ Toán       │ Ngữ văn    │ ...        │ ...        │ ...        │
│ Tiết 2     │ ...        │ ...        │            │            │            │
│ Tiết 3     │            │            │            │            │            │
│ Tiết 4     │            │            │            │            │            │
│ Tiết 5     │            │            │            │            │            │
├────────────┼────────────┼────────────┼────────────┼────────────┼────────────┤
│ 🌤 CHIỀU   │            │            │            │            │            │
│ Tiết 6     │            │            │            │            │            │
│ Tiết 7     │            │            │            │            │            │
│ Tiết 8     │            │            │            │            │            │
│ Tiết 9     │            │            │            │            │            │
│ Tiết 10    │            │            │            │            │            │
└────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
```

Có thể thêm **Thứ 7** thành cột thứ sáu.

### 1.2. Quy tắc layout

**Cột đầu tiên:**

- `Tiết`
- width khoảng `72–88px`
- sticky bên trái.
- luôn hiển thị khi horizontal-scroll.

**6 cột ngày:**

- Thứ 2 → Thứ 7.
- width desktop lý tưởng: `minmax(150px, 1fr)`.
- mỗi ô có chiều cao khoảng `72–92px`.
- không nên để ô quá cao; TKB cần ưu tiên **scan toàn cảnh**.

**Header ngày:**

```
THỨ 2
02/09
```

Có thể highlight ngày hiện tại bằng trạng thái nhẹ, không nên dùng màu quá mạnh.

### 1.3. Phân chia Sáng / Chiều

Không tạo hai bảng riêng.

Thay vào đó, dùng **section row**:

```
☀ BUỔI SÁNG
──────────────────────────
Tiết 1
Tiết 2
Tiết 3
Tiết 4
Tiết 5

🌤 BUỔI CHIỀU
──────────────────────────
Tiết 6
Tiết 7
...
```

Điều này giúp người dùng nhận biết nhanh nhưng vẫn duy trì nguyên tắc **“1 bảng duy nhất”**.

Nếu trường cấu hình số tiết sáng/chiều khác nhau, Grid phải lấy cấu hình đó thay vì hard-code 5 + 5.

### 1.4. Sticky

Có hai lớp sticky quan trọng:

```
┌── sticky header ──────────────────────────────┐
│ Tiết │ T2 │ T3 │ T4 │ T5 │ T6 │ T7 │
└────────────────────────────────────────────────┘
       ↑
       sticky column
```

- Header ngày: `position: sticky; top: 0`.
- Cột Tiết: `position: sticky; left: 0`.
- Khi scroll ngang, ngày vẫn có header.
- Khi scroll dọc, tên ngày vẫn nằm trên cùng.
- Z-index phải phân tầng rõ:
  
  - body
  - sticky column
  - sticky header
  - giao điểm header + column cao nhất.

### 1.5. Responsive

Không nên biến mobile thành 6 tab ngày — như vậy sẽ quay lại vấn đề ban đầu.

Thay vào đó:

**Desktop/tablet landscape**

```
Tiết | T2 | T3 | T4 | T5 | T6 | T7
```

**Mobile**

Giữ nguyên Grid nhưng cho phép:

```
←──────── horizontal scroll ────────→
     T2 | T3 | T4 | T5 | T6 | T7
```

Cột `Tiết` sticky.

Thêm một thanh nhỏ:

```
← Vuốt ngang để xem các ngày →
```

chỉ hiện lần đầu.

* * *

# 2\. Popover môn học Zero-Touch

Đây là phần UX quan trọng nhất.

## 2.1. Một click = mở danh sách

Ô trống:

```
┌────────────────────┐
│                    │
│     + Chọn môn     │
│                    │
└────────────────────┘
```

Click một lần:

```
┌────────────────────┐
│ Thứ 2 · Tiết 1    │
├────────────────────┤
│ 🔎 Tìm môn học...  │
├────────────────────┤
│ 📘 Toán            │
│ 📖 Ngữ văn         │
│ 🌍 Tiếng Anh       │
│ 🔬 Khoa học tự nhiên│
│ 💻 Tin học         │
│ 🎨 Nghệ thuật      │
├────────────────────┤
│ 🚩 Chào Cờ         │
│ 🏫 Sinh Hoạt Lớp   │
│ ✨ Hoạt động TNST   │
│ ⏸ Nghỉ             │
└────────────────────┘
```

**Click môn → đóng popover → ô được cập nhật ngay.**

Không có:

- modal,
- nút Save,
- bước xác nhận,
- form trung gian.

Đó chính là Zero-Touch.

* * *

## 2.2. Anchor position

Popover nên anchor trực tiếp vào ô đang chọn.

Ưu tiên:

1. mở bên dưới ô nếu còn không gian;
2. nếu sát đáy → mở phía trên;
3. nếu sát cạnh phải → dịch sang trái;
4. không được làm Grid nhảy layout.

Trên desktop nên dùng khoảng:

- width: `280–320px`
- max-height: khoảng `420px`
- scroll nội bộ.

Trên mobile, nếu Popover quá nhỏ, chuyển thành **bottom sheet**, nhưng vẫn giữ hành vi 1-chạm.

* * *

## 2.3. Palette nhóm môn

Không nên cho mỗi môn một màu ngẫu nhiên.

Nên định nghĩa màu theo **nhóm môn**:

```
📘 Ngôn ngữ
📐 Toán
🔬 Khoa học
🌍 Ngoại ngữ
🎨 Nghệ thuật
🏃 Thể chất
💻 Công nghệ / Tin học
🧭 Hoạt động
🏫 Sinh hoạt
🚩 Nghi lễ
⏸ Nghỉ
```

Màu trong Grid nên là **tint nhẹ**, còn icon/badge sử dụng màu mạnh hơn.

Ví dụ:

```
┌──────────────────────────┐
│ 📐  TOÁN                 │
│     GV: Nguyễn Văn A     │
│     P.203                │
└──────────────────────────┘
```

Như vậy người dùng nhìn cả tuần sẽ nhận diện bằng **shape + icon + màu**, không phụ thuộc duy nhất vào màu.

* * *

# 3\. Đồng bộ trực tiếp với “Quản lý Danh mục Môn học”

Đây nên được coi là **Single Source of Truth**.

Nguồn:

> Settings → Quản lý Danh mục Môn học

Grid **không tự duy trì một danh sách môn học riêng**.

## 3.1. Data contract nên chuẩn hóa

Ví dụ:

JavaScript

```
{
  id: "math",
  name: "Toán",
  shortName: "Toán",
  icon: "calculator",
  color: "...",
  group: "math",
  levels: ["THCS"],
  grades: ["6", "7", "8", "9"],
  active: true,
  sortOrder: 10
}
```

Các trường quan trọng:

- `id`: immutable, dùng để lưu dữ liệu TKB.
- `name`: tên hiển thị.
- `shortName`: tên rút gọn trong ô Grid.
- `group`: nhóm môn.
- `icon`
- `color`
- `levels`
- `grades`
- `active`
- `sortOrder`.

**Không nên lưu tên môn trực tiếp vào TKB:**

JavaScript

```
// Không nên
subject: "Toán"
```

nên:

JavaScript

```
subjectId: "math"
```

Tên môn được resolve từ Catalog.

Điều này cực kỳ quan trọng khi đổi tên môn trong Settings.

* * *

## 3.2. Auto-detect khối lớp

Flow:

```
Lớp hiện tại
   ↓
Xác định khối
   ↓
Xác định cấp học
   ↓
Load Subject Catalog
   ↓
Filter:
  active === true
  + level phù hợp
  + grade phù hợp
   ↓
+ Môn mặc định hệ thống
   ↓
Popover
```

Ví dụ lớp `7A1`:

```
THCS
  ↓
Grade 7
  ↓
Danh mục THCS / Khối 7
  ↓
Danh sách môn
```

Nếu cấu hình hỗ trợ môn chung toàn cấp:

```
subjects where:
level = THCS
AND (
  grades includes 7
  OR grades = all
)
```

* * *

# 4\. Realtime Sync với Settings

Tôi khuyến nghị mô hình **Event + Cache + Revalidate**.

```
Settings
   │
   ├── update catalog
   │
   ├── persist server
   │
   └── dispatch "subjects:updated"
                     │
                     ▼
              TKB Grid listener
                     │
              invalidate cache
                     │
              reload catalog
                     │
                     ▼
                Popover mới
```

## 4.1. LocalStorage cache

Có thể cache:

```
tkb.subjectCatalog.v1
```

Payload:

JavaScript

```
{
  version: 1,
  updatedAt: 1756820000000,
  grade: "7",
  level: "THCS",
  subjects: [...]
}
```

Nhưng cần phân biệt:

> **Cache để tăng tốc, không phải nguồn sự thật.**

Nguồn chính vẫn là Settings/backend.

* * *

## 4.2. Event nội bộ

Nếu Settings và TKB cùng SPA:

JavaScript

```
window.dispatchEvent(
  new CustomEvent("subjects:updated", {
    detail: {
      version: catalogVersion
    }
  })
);
```

TKB:

JavaScript

```
window.addEventListener("subjects:updated", refreshSubjects);
```

Sau event:

1. invalidate memory cache;
2. cập nhật localStorage;
3. refresh Popover;
4. nếu môn đang chọn vừa bị inactive → không xóa dữ liệu TKB cũ một cách âm thầm.

* * *

## 4.3. Nếu mở Settings và TKB ở hai tab

Dùng thêm:

JavaScript

```
window.addEventListener("storage", ...)
```

hoặc `BroadcastChannel`:

```
settings tab
     ↓
BroadcastChannel
     ↓
TKB tab
```

`BroadcastChannel` phù hợp hơn nếu ứng dụng cần realtime giữa nhiều tab.

* * *

# 5\. Fallback an toàn

Đây là điểm cần thiết để tránh UX “vỡ”.

### Trường hợp A — mất mạng

Hiển thị:

```
✓ Đang sử dụng danh mục đã lưu
```

Không khóa Grid.

Nếu Catalog cache còn hợp lệ:

> Cho phép người dùng tiếp tục chỉnh sửa.

### Trường hợp B — chưa cấu hình môn học

Popover:

```
Chưa có môn học được cấu hình cho Khối 7.

[Đi đến Quản lý Danh mục Môn học]
```

Nhưng vẫn hiển thị:

- Chào Cờ
- Sinh Hoạt Lớp
- Hoạt động TNST
- Nghỉ

### Trường hợp C — môn đã bị vô hiệu hóa

Nếu TKB cũ đang có:

```
subjectId = "abc"
```

nhưng Settings đã inactive:

```
⚠ Môn không còn trong danh mục
```

**Không tự động xóa.**

Cho phép user chọn môn mới.

Đây là nguyên tắc quan trọng:

> Catalog thay đổi không được làm mất dữ liệu lịch sử một cách âm thầm.

* * *

# 6\. UX cho GV + Phòng học

Không nên bắt user mở form chi tiết.

Sau khi chọn môn:

```
┌────────────────────────┐
│ 📐 Toán                │
│ 👨‍🏫 GV: Chọn GV          │
│ 🚪 Phòng: Chọn phòng    │
└────────────────────────┘
```

Có thể cho phép:

**Click lần 1:** chọn môn.

**Click vào badge GV:** chọn giáo viên.

**Click vào badge phòng:** chọn phòng.

Nếu trường có quy tắc phân công cố định:

```
Toán → GV Nguyễn Văn A
```

thì hệ thống có thể auto-fill.

* * *

# 7\. Quick Fill / Delighters

Đây là nhóm tính năng làm sản phẩm có cảm giác “thông minh”.

## 7.1. Chào Cờ

Nút:

> **⚡ Điền Chào Cờ**

Tự động:

```
T2 · Tiết 1 → Chào Cờ
```

Có thể gọi theo cấu hình trường thay vì hard-code.

## 7.2. Sinh Hoạt Lớp

```
T7 · Tiết 5 → Sinh Hoạt Lớp
```

Tương tự, **không nên hard-code vị trí nếu backend đã có cấu hình**.

Tên yêu cầu “T7-T5” nên được diễn giải thành:

> Thứ 7, tiết 5.

## 7.3. Nghỉ

Click:

```
⏸ Nghỉ
```

để đánh dấu tiết không học.

Không nên để ô trống và “Nghỉ” mang cùng một semantics:

```
empty = chưa nhập
off = đã xác định nghỉ
```

Đây là khác biệt dữ liệu rất quan trọng.

* * *

# 8\. Sao chép ngày

UX:

```
Thứ 2  ⋮
       ├─ Sao chép ngày
       ├─ Xóa ngày
       └─ In ngày
```

Sau khi chọn:

```
Sao chép Thứ 2 → Thứ 3
```

nên có preview:

```
Sao chép 8 tiết từ Thứ 2 sang Thứ 3?

[Hủy] [Sao chép]
```

Với thao tác destructive như xóa thì cần confirmation.

Với copy, có thể cho phép **1 click + Undo**:

```
✓ Đã sao chép Thứ 2 → Thứ 3     [Hoàn tác]
```

Cách này nhanh hơn confirmation modal.

* * *

# 9\. Batch Copy nâng cao

Thêm một toolbar:

```
[☑ Chọn nhiều ô] [Copy] [Paste] [Xóa]
```

Ví dụ:

```
T2-T4 · Tiết 1-3
        ↓
Copy
        ↓
T5-T7 · Tiết 1-3
```

Nhưng tính năng này nên nằm ở **Advanced mode**, không làm UI mặc định phức tạp.

* * *

# 10\. Keyboard UX

Nếu người dùng quản lý TKB nhiều, keyboard sẽ tạo khác biệt rất lớn.

### Điều hướng

```
↑ ↓ ← →
```

di chuyển giữa các ô.

### Chọn môn

Khi ô focus:

```
Enter / Space
```

→ mở Popover.

Sau đó:

```
↑ ↓
```

→ chọn môn.

```
Enter
```

→ commit.

```
Esc
```

→ đóng.

### Shortcut

Đề xuất:

| Phím | Tác vụ |
| --- | --- |
| `Enter` | Mở/chọn ô |
| `Esc` | Đóng Popover |
| `Delete` | Xóa môn |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + P` | In TKB |
| `/` | Focus tìm môn |

Không nên ép người dùng nhớ shortcut; tất cả vẫn phải dùng được bằng chuột/touch.

* * *

# 11\. Undo là tính năng nên có

Vì Zero-Touch nghĩa là click là commit, người dùng rất dễ click nhầm.

Do đó:

```
✓ Đã chọn "Toán"
                       [Hoàn tác]
```

Toast tồn tại khoảng 3–5 giây.

History nên lưu operation:

JavaScript

```
{
  cell: "mon-1",
  previous: null,
  next: {
    subjectId: "math"
  }
}
```

Có thể undo nhiều bước.

Đây là cơ chế an toàn tốt hơn việc bắt user xác nhận mọi click.

* * *

# 12\. Trạng thái của một ô Grid

Nên thiết kế state machine rõ ràng:

```
EMPTY
  ↓
SUBJECT_SELECTED
  ↓
DETAIL_EDITING
  ↓
SAVED
```

Các trạng thái đặc biệt:

```
OFF
SYNCING
ERROR
STALE_SUBJECT
DISABLED
```

Ví dụ ô đang lưu:

```
┌───────────────────┐
│ 📐 Toán           │
│ 👨‍🏫 Nguyễn Văn A  │
│ 🚪 P.203          │
└───────────────────┘
```

Ô chưa nhập:

```
┌───────────────────┐
│       +           │
│    Chọn môn       │
└───────────────────┘
```

Ô lỗi:

```
┌───────────────────┐
│ ⚠ Chưa lưu         │
│ Thử lại            │
└───────────────────┘
```

* * *

# 13\. In TKB

Không nên in nguyên UI responsive.

Có một **Print View chuyên biệt**:

```
        TRƯỜNG THCS TRẦN BỘI CƠ
        THỜI KHÓA BIỂU LỚP 7A1
             TUẦN ...

┌──────┬────┬────┬────┬────┬────┬────┐
│ Tiết │ T2 │ T3 │ T4 │ T5 │ T6 │ T7 │
├──────┼────┼────┼────┼────┼────┼────┤
│  1   │    │    │    │    │    │    │
...
└──────┴────┴────┴────┴────┴────┴────┘
```

Ưu tiên:

- A4 landscape.
- header trường.
- tên lớp.
- tuần.
- ngày in.
- bảng vừa 1 trang nếu có thể.
- không in toolbar/button.
- màu đủ tương phản khi grayscale.
- tên môn không bị cắt.

* * *

# 14\. Kiến trúc component đề xuất

Có thể chia thành:

```
WeeklyTimetable
│
├── TimetableToolbar
│   ├── WeekNavigator
│   ├── QuickActions
│   └── PrintButton
│
├── TimetableGrid
│   ├── StickyTimeColumn
│   ├── DayHeader
│   ├── SessionRow
│   └── TimetableCell
│
├── SubjectPopover
│   ├── SubjectSearch
│   ├── SubjectGroup
│   └── SubjectItem
│
├── CellDetailPopover
│   ├── TeacherPicker
│   └── RoomPicker
│
├── BatchActions
│
└── Toast / Undo
```

Data layer:

```
SubjectCatalogService
        │
        ├── API
        ├── Memory Cache
        ├── LocalStorage
        └── Event / BroadcastChannel

TimetableService
        │
        ├── Load week
        ├── Update cell
        ├── Batch update
        └── Undo/redo
```

**Điểm kiến trúc quan trọng:** UI không được trực tiếp tự xử lý nguồn Subject Catalog. Nên có `SubjectCatalogService` làm lớp trung gian.

* * *

# 15\. Checklist kiểm thử thực nghiệm

## A. Happy path

-  Load TKB → hiển thị đủ T2–T7.
-  Sáng/chiều phân tách rõ.
-  Click ô trống → Popover mở.
-  Click môn → ô cập nhật ngay.
-  Không cần nút Save.
-  Reload → dữ liệu vẫn còn.
-  Đổi môn → dữ liệu mới.
-  GV/Phòng học cập nhật được.
-  In TKB đúng layout.

## B. Counterexample — những trường hợp dễ làm kiến trúc sai

### Catalog thay đổi trong lúc đang mở TKB

```
TKB đang mở
     ↓
Settings đổi "Toán"
     ↓
TKB nhận event
     ↓
Popover phải dùng catalog mới
```

### Môn bị xóa/inactive

Không được:

```
subject missing → tự xóa cell
```

Phải:

```
⚠ Môn không còn hoạt động
```

### Đổi khối

```
7A1 → 8A1
```

Popover phải re-filter danh mục.

### Tên môn trùng

Ví dụ:

```
Tin học
Tin học nâng cao
```

UI cần dùng `id`, không dùng `name` để phân biệt.

### Môn có ký tự đặc biệt

Test:

```
GDĐP
HĐTN-HN
KHTN
Nghệ thuật
```

Không được overflow hoặc sai search.

* * *

# 16\. Error handling

### API catalog timeout

```
⚠ Không thể tải danh mục mới.
Đang sử dụng danh mục gần nhất.
```

### Update TKB thất bại

Không được giả vờ thành công.

```
⚠ Chưa lưu thay đổi
[Thử lại]
```

Nếu optimistic update:

```
User click
   ↓
UI cập nhật ngay
   ↓
API
   ├─ success → ✓
   └─ fail → rollback + Retry
```

Đây là mô hình rất phù hợp với Zero-Touch.

### Hai người cùng chỉnh

Nếu hệ thống có multi-user:

```
version / updatedAt
```

để phát hiện conflict.

Không nên silently overwrite.

* * *

# 17\. Definition of Done cho UX này

Tôi sẽ coi tính năng đạt chuẩn khi **5 điều sau đồng thời đúng**:

### ① Một màn hình

> Người dùng nhìn được **T2 → T7 + toàn bộ tiết sáng/chiều** mà không phải chuyển tab.

### ② Một chạm

> `Click ô → Click môn → xong`.

Không modal, không Save.

### ③ Một nguồn dữ liệu

> Danh sách môn trong TKB luôn lấy từ **Quản lý Danh mục Môn học**, có filter theo cấp/khối.

### ④ Không mất dữ liệu

> Catalog thay đổi, offline, API lỗi hoặc môn bị inactive **không được làm mất TKB hiện hữu**.

### ⑤ Có đường thoát

> Mọi thao tác nhanh đều có Undo/Retry khi phù hợp.

* * *

## Ưu tiên triển khai

Nếu chia thành roadmap, tôi khuyên:

**P0 — Core**

1. Weekly Grid T2–T7.
2. Sticky header + sticky Tiết.
3. Sáng/Chiều.
4. Subject Catalog Service.
5. Auto-filter theo khối.
6. Subject Popover.
7. Zero-Touch selection.
8. Save + optimistic update.

**P1 — Productivity**

9. GV.
10. Phòng học.
11. Chào Cờ / Sinh Hoạt Lớp.
12. Nghỉ.
13. Copy ngày.
14. Undo.
15. Print.

**P2 — Power User**

16. Keyboard navigation.
17. Batch copy.
18. Multi-cell selection.
19. BroadcastChannel realtime.
20. Conflict detection.

### Kết luận kiến trúc

Tôi đặc biệt khuyến nghị **không chỉ sửa giao diện từ “tab ngày” thành “table”**. Hãy coi đây là một **interaction model mới**:

> **Weekly Grid = canvas chính → Subject Catalog = Single Source of Truth → Popover = command palette → click = commit → Undo = safety net.**

Cách này vừa giải quyết nhu cầu nhìn tổng thể cả tuần, vừa giữ thao tác nhập TKB cực nhanh cho giáo viên/cán bộ quản lý.
