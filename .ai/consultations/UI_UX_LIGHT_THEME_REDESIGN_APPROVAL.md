⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới góc nhìn **Senior Enterprise UI/UX Architect**, tôi phán quyết: **GO-AHEAD triển khai**. Bộ yêu cầu mới có hướng đi đúng, nhưng nên khóa một số quy tắc Design System trước khi dev tiếp tục để tránh tình trạng mỗi portal có một kiểu UI riêng.

## 1\. Phán quyết kiến trúc Layout & Grid

### Design System nền tảng

| Token | Giá trị đề xuất | Vai trò |
| --- | --- | --- |
| App background | `bg-slate-50` | Nền toàn hệ thống |
| Card | `bg-white` | Surface chính |
| Primary text | `text-slate-900` | Heading / nội dung quan trọng |
| Secondary text | `text-slate-500` | Metadata |
| Border | `border-slate-200` | Phân vùng |
| Hover | `bg-slate-100` | Interactive state |
| Primary action | Blue `600` | CTA chính |
| Success | Emerald `600` | Hoàn thành |
| Warning | Amber `600` | Kiểm tra / cảnh báo |
| Danger | Rose `600` | Việc cần xử lý |

**Nguyên tắc:** `slate-950` không còn được sử dụng làm background page. Nếu cần dark color, chỉ dùng có kiểm soát cho icon, accent hoặc một thành phần đặc biệt.

### Grid

**Desktop ≥1024px**

```
┌──────────────────────────────────────────────────────────┐
│ Header / Navigation                                      │
├──────────────────────────────────────────────────────────┤
│ Breadcrumb / Page Context                                │
│                                                          │
│ Page Title                     Date / Primary Actions    │
│ Subtitle                                                │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Summary / KPI / Quick Actions                        │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Main Content                                             │
└──────────────────────────────────────────────────────────┘
```

Khuyến nghị:

- `max-width: 1440px`
- Desktop content: `px-6` → `px-8`
- Grid 12 cột.
- Khoảng cách section: `24–32px`.
- Card padding: `20–24px`.
- Border radius thống nhất khoảng `12–16px`.
- Không lạm dụng shadow; Light Theme nên dựa chủ yếu vào **surface + border + hierarchy**.

* * *

# 2\. Sổ Báo Bài — Desktop phải ưu tiên Full Table

Đây là thay đổi UX quan trọng nhất.

Ở desktop, **không nên ép người dùng đọc danh sách card theo chiều dọc**. Sổ Báo Bài vốn là dữ liệu có cấu trúc → Table là pattern đúng.

### Desktop

```
SỔ BÁO BÀI
Thứ 3, 02/09/2026                         [←] [Hôm nay] [→]

[ Tất cả môn ▼ ] [ Tất cả trạng thái ▼ ]        [＋ Ghi báo bài]

┌──────┬───────────┬──────────────────┬──────────────────┬──────────────┬──────────┐
│ Tiết │ Môn học   │ Bài tập về nhà   │ Dụng cụ / Lưu ý │ Kiểm tra 15p │ Hoàn tất │
├──────┼───────────┼──────────────────┼──────────────────┼──────────────┼──────────┤
│  1   │ Toán      │ BT trang 45...   │ Máy tính         │ ⚠ Thứ 5      │    □     │
│  2   │ Ngữ văn   │ Soạn bài...      │ Đọc trước...     │ —            │    ☑     │
│  3   │ Anh       │ Workbook Unit 3  │ Vở bài tập       │ ⚠ Thứ 4      │    □     │
└──────┴───────────┴──────────────────┴──────────────────┴──────────────┴──────────┘
```

### Quy tắc UX

**Checkbox "Đã hoàn thành" phải là trạng thái cá nhân của học sinh**, không phải trạng thái làm thay đổi dữ liệu giáo viên/BCS.

Sau khi check:

- row giảm emphasis nhẹ;
- text có thể chuyển `text-slate-400`;
- checkbox chuyển Success;
- vẫn giữ nội dung bài tập để xem lại;
- thao tác phải có optimistic UI, không bắt học sinh chờ reload.

### Cảnh báo kiểm tra 15p

Không dùng text đỏ dài dòng.

Dùng badge:

> `⚠ Kiểm tra 15p • Thứ 5`

Amber là phù hợp vì đây là **attention**, chưa phải error.

* * *

# 3\. Grid Cards — Mobile/Tablet

Breakpoint nên được hiểu như sau:

- `<768px`: Card/List.
- `768–1023px`: Card grid hoặc compact table tùy width.
- `≥1024px`: Full Table mặc định.

Mobile:

```
┌─────────────────────────────────┐
│ Tiết 1 · TOÁN                   │
│                                  │
│ BTVN                             │
│ Bài tập trang 45–46              │
│                                  │
│ 🧰 Máy tính                      │
│ ⚠ Kiểm tra 15p · Thứ 5          │
│                                  │
│                         ☑ Xong   │
└─────────────────────────────────┘
```

**Không cố nhét 6 cột vào mobile.**

Đây là Progressive Disclosure: mobile chỉ hiển thị thông tin cần hành động; desktop mới hiển thị toàn bộ dataset.

* * *

# 4\. Subject Color Palette

Tôi khuyến nghị **màu môn học dùng làm semantic accent**, không dùng làm background toàn card.

| Môn | Accent | Badge nền |
| --- | --- | --- |
| Toán | Blue | `bg-blue-50 text-blue-700` |
| Ngữ văn | Violet | `bg-violet-50 text-violet-700` |
| Tiếng Anh | Emerald | `bg-emerald-50 text-emerald-700` |
| Vật lý | Cyan | `bg-cyan-50 text-cyan-700` |
| Hóa học | Orange | `bg-orange-50 text-orange-700` |
| Sinh học | Green | `bg-green-50 text-green-700` |
| Lịch sử | Amber | `bg-amber-50 text-amber-700` |
| Địa lý | Teal | `bg-teal-50 text-teal-700` |
| Tin học | Indigo | `bg-indigo-50 text-indigo-700` |
| GDCD | Pink | `bg-pink-50 text-pink-700` |
| Công nghệ | Slate | `bg-slate-100 text-slate-700` |

**Quan trọng:** màu phải có cùng semantic ở tất cả `/student`, `/student/homework` và `/portal`.

Không được xảy ra tình trạng Toán ở Student là xanh nhưng ở Parent lại tím.

* * *

# 5\. Student Portal `/student`

Yêu cầu "login xong thấy ngay Sổ Báo Bài + Lịch Học Hôm Nay" là **đúng UX**.

Không nên bắt học sinh đi qua Dashboard → Menu → Sổ Báo Bài.

### Above-the-fold đề xuất

```
┌─────────────────────────────────────────────────────────┐
│ Banner / Welcome                                        │
└─────────────────────────────────────────────────────────┘

┌────────────────────────────────┐ ┌──────────────────────┐
│ 📖 SỔ BÁO BÀI                 │ │ 📅 LỊCH HỌC HÔM NAY │
│                                │ │                      │
│ 3 bài cần hoàn thành           │ │ Tiết 1 · Toán       │
│ 2 cảnh báo                     │ │ Tiết 2 · Văn        │
│                                │ │ Tiết 3 · Anh        │
│ [Xem sổ báo bài →]             │ │ [Xem TKB →]         │
└────────────────────────────────┘ └──────────────────────┘
```

Đây chính là **Zero-Touch Dashboard**:

> Đăng nhập → biết ngay hôm nay học gì → có bài gì → việc nào cần làm.

Không cần suy nghĩ "mình phải bấm vào đâu?"

* * *

# 6\. `/student/homework` — UX ngày thông minh

Nên dùng segmented date selector thay vì date picker truyền thống làm control chính:

```
[←]   HÔM QUA   |   HÔM NAY   |   NGÀY MAI   [→]
```

Bên dưới:

```
[Tất cả môn ▼]       [Chưa hoàn thành 3]
```

Date picker calendar chỉ nên là **secondary interaction** khi học sinh muốn nhảy tới ngày xa hơn.

### BCS — "Ghi Báo Bài" 1 chạm

CTA nên luôn nằm ở vị trí dễ nhận biết:

**`＋ Ghi Báo Bài`**

Nếu BCS có quyền:

```
＋ Ghi Báo Bài
       ↓
Chọn tiết → chọn môn → nhập BTVN
       ↓
[ Lưu & Ghi tiếp ]
```

Tối ưu hơn nữa là:

> **Lưu & Ghi tiếp**

để BCS không phải đóng modal → mở lại modal cho từng tiết.

* * *

# 7\. Modal Design

Modal phải tuân thủ cùng Light Theme:

```
┌──────────────────────────────────────────────┐
│ Ghi Báo Bài                            ×     │
│ Thứ 3, 02/09                                 │
├──────────────────────────────────────────────┤
│ Tiết          [ 1 ▼ ]                        │
│ Môn học       [ Toán ▼ ]                     │
│                                              │
│ Bài tập về nhà                               │
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Dụng cụ / Lưu ý                              │
│ [..........................................] │
│                                              │
│ ☐ Có kiểm tra 15 phút                       │
├──────────────────────────────────────────────┤
│                    [Hủy] [Lưu & Ghi tiếp]    │
└──────────────────────────────────────────────┘
```

**Không nên dùng modal full-screen trên desktop** cho form đơn giản này.

* * *

# 8\. Parent Portal `/portal`

Đây nên là **một dashboard duy nhất**, không phải hai trang rời.

Ngay dưới phần thông tin con:

```
┌─────────────────────────────────────────────────────────┐
│ Con: Nguyễn Văn A · Lớp 7A1                            │
├─────────────────────────────────────────────────────────┤
│ [📖 Sổ Báo Bài & Dặn Dò] [📅 Thời Khóa Biểu]           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                 Tab content                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Đây là lựa chọn UX tốt vì **Parent thường có intent tra cứu**, không phải khám phá hệ thống.

* * *

# 9\. Tab Sổ Báo Bài & Dặn Dò

Nên ưu tiên "ngày" làm primary navigation:

```
[←]  Hôm qua | Hôm nay | Ngày mai  [→]

[ Tất cả môn ▼ ]

──────────────────────────────────────

📖 Toán · Tiết 1
Bài tập trang 45–46

🧰 Máy tính

──────────────────────────────────────

📖 Ngữ văn · Tiết 2
Soạn bài ...

💬 Dặn dò của giáo viên
"Nhớ mang..."
```

Parent **không cần checkbox hoàn thành** nếu đó là trạng thái riêng của học sinh. Parent chủ yếu cần:

- bài gì;
- môn gì;
- khi nào;
- cần chuẩn bị gì;
- có kiểm tra không;
- giáo viên dặn gì.

* * *

# 10\. Tab Thời Khóa Biểu

Yêu cầu lưới **Thứ 2 → Thứ 7 + Sáng/Chiều** là hợp lý.

Desktop:

```
              THỨ 2       THỨ 3       THỨ 4       ... THỨ 7
           ┌──────────┬──────────┬──────────┬──────────────┐
SÁNG       │ Toán     │ Văn      │ Anh      │              │
           │ P.201    │ P.203    │ P.105    │              │
           │ GV: ...  │ GV: ...  │ GV: ...  │              │
           ├──────────┼──────────┼──────────┼──────────────┤
CHIỀU      │ Lý       │ Hóa      │ Toán     │              │
           │ P.301    │ P.302    │ P.201    │              │
           │ GV: ...  │ GV: ...  │ GV: ...  │              │
           └──────────┴──────────┴──────────┴──────────────┘
```

Mỗi cell nên có 3 tầng:

**Môn học → Phòng → Giáo viên**

Không nên để tên GV có visual weight ngang tên môn.

* * *

# 11\. Zero-Touch Architecture

Tôi đề xuất hệ thống tuân theo chuỗi ưu tiên:

### Học sinh

**Hôm nay → Học gì → Bài gì → Đã làm chưa**

### BCS

**Hôm nay → Tiết → Môn → Ghi → Ghi tiếp**

### Phụ huynh

**Con → Hôm nay → Học gì → Có bài gì → Có lưu ý gì**

Đây là điểm quan trọng: **không thiết kế ba portal theo cấu trúc dữ liệu của backend; thiết kế theo intent của từng persona.**

* * *

# 12\. Các trạng thái bắt buộc phải có

Design System nên chuẩn hóa ngay từ đầu:

- `Default`
- `Hover`
- `Active`
- `Focus`
- `Disabled`
- `Loading`
- `Empty`
- `Success`
- `Warning`
- `Error`

Đặc biệt:

### Empty State

Không để màn hình trắng.

Ví dụ:

> **Hôm nay chưa có bài tập 🎉**  
> Bạn đã hoàn thành mọi việc được giao.

### Loading

Dùng skeleton cho table/card thay vì spinner toàn trang.

### Error

Hiển thị inline:

> Không thể tải Sổ Báo Bài. **Thử lại**

Không đá người dùng về Login nếu chỉ API dữ liệu bị lỗi.

* * *

# 13\. Thứ tự ưu tiên triển khai

Tôi đề xuất dev thực hiện theo thứ tự:

**P0 — Design System**

1. Light Theme tokens.
2. Card / Badge / Button / Input / Tabs.
3. Subject color mapping.
4. Modal chuẩn.
5. Responsive breakpoints.

**P1 — Student**

1. `/student` Today Dashboard.
2. `/student/homework`.
3. Desktop Table.
4. Mobile Cards.
5. Completion state.

**P1 — Parent**

1. Inline tabs.
2. Sổ Báo Bài.
3. TKB 6 ngày.
4. Responsive behavior.

**P2 — BCS**

1. Quick Add.
2. Save & Continue.
3. Optimistic interaction.
4. Validation / permission states.

* * *

# 14\. Final Architecture Verdict

### 🟢 GO-AHEAD

Tôi **phê duyệt hướng triển khai** với 5 nguyên tắc bắt buộc:

1. **Light Theme là global contract**, không phải skin riêng của từng page.
2. **Desktop Sổ Báo Bài = Full Table**, Mobile = Cards.
3. **Student = action-oriented**, Parent = information-oriented.
4. **BCS phải đạt Zero-Touch**, đặc biệt thao tác `Ghi & Ghi tiếp`.
5. **Subject colors + spacing + component states phải dùng chung Design System**, không hard-code theo từng màn hình.

Nếu thực hiện đúng các nguyên tắc trên, hệ thống sẽ có cảm giác như **một sản phẩm enterprise thống nhất**, thay vì tập hợp nhiều màn hình được xây độc lập.

**Mức ưu tiên UX:** `Student Today Dashboard` → `Sổ Báo Bài Desktop Table` → `Parent Inline Tabs` → `BCS Quick Entry` → polish responsive/modal.