> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.# MASTER PLAN — Composite Activity Registry / “Một lần nhưng nhiều cột”

## 0\. Kiến trúc đích

Tôi khuyến nghị **không biến `columns` hiện tại thành một bảng “siêu cột” quá phức tạp**. Thay vào đó, giữ `columns` làm thực thể tương thích ngược và bổ sung một lớp cấu hình **Composite Activity**.

Mô hình logic:

```
Composite Activity Registry
│
├── Activity: Bảo hiểm tai nạn
│   └── Sub-column: Tham gia [boolean]
│
├── Activity: Bán trú
│   ├── Sub-column: Đăng ký [boolean]
│   └── Sub-column: Ghi chú [text]
│
└── Activity: Hội thao
    ├── Sub-column: Cờ tướng [boolean]
    ├── Sub-column: Cờ vua [boolean]
    └── Sub-column: Kéo co [boolean]
```

Quan trọng: **Activity ≠ Column Record**.

- Activity là cấu trúc nghiệp vụ.
- Sub-column là trường dữ liệu hiển thị/nhập.
- Record là dữ liệu của từng học sinh.
- Export Profile là tập các cột được chọn để xuất.

Điều này giúp một “sổ một lần” có thể chứa 5, 10 hoặc 30 trường mà không phải tạo 30 báo cáo riêng.

* * *

# TRỤ CỘT 1 — DATA MODEL & SCHEMA EVOLUTION

## 1.1. Nguyên tắc tương thích ngược

Không đổi nghĩa của:

```
columns.frequency = 'one_time'
column_records.record_type = 'one_time'
column_records.value
column_records.note
```

Các column cũ tiếp tục chạy như hiện tại.

### Quy tắc nhận diện

```
column.activity_config IS NULL
        ↓
Legacy Column
        ↓
logic cũ
```

Nếu có:

```
column.activity_config.type = "composite"
```

thì sử dụng Composite Engine.

Như vậy:

```
Legacy data
     │
     ├── Không migration bắt buộc
     ├── Không đổi ID
     ├── Không đổi record cũ
     └── Không đổi API cũ
```

* * *

# 1.2. Mở rộng `columns`

Có thể giữ nguyên bảng và bổ sung các trường:

SQL

```
ALTER TABLE columns
ADD COLUMN activity_config JSONB;

ALTER TABLE columns
ADD COLUMN parent_column_id TEXT NULL;

ALTER TABLE columns
ADD COLUMN display_config JSONB;

ALTER TABLE columns
ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1;
```

### `activity_config`

Ví dụ:

JSON

```
{
  "type": "composite",
  "version": 1,
  "activity_code": "HOI_THAO_2026",
  "activity_name": "Tham gia hội thao",
  "allow_dynamic_children": true
}
```

Nhưng tôi **không khuyến nghị lưu toàn bộ cây con trong một JSON duy nhất**.

Nên dùng `columns` như một cây:

```
parent_column_id
```

Ví dụ:

```
HOI_THAO
├── CO_TUONG
├── CO_VUA
└── KEO_CO
```

### Vì sao?

Có thể:

- ẩn một cột;
- đổi tên;
- thêm cột mới;
- reorder;
- export một phần;
- query riêng;
- audit;
- phân quyền;
- giữ dữ liệu cũ khi xóa khỏi giao diện.

* * *

# 1.3. Schema đề xuất

### `columns`

```
id
class_id
academic_year_id        ← BẮT BUỘC đối với dữ liệu mới
user_id
parent_column_id        ← NULL = root
name
frequency
period_config
sub_periods
suggestions
applicable_scope
payment_config
is_shared_with_parents

activity_config JSONB
display_config JSONB
schema_version
is_archived
sort_order
created_at
updated_at
```

### `activity_config`

Ví dụ root:

JSON

```
{
  "type": "composite",
  "version": 1,
  "activity_code": "BAN_TRU",
  "input_mode": "matrix",
  "allow_children": true,
  "note_policy": "child_column"
}
```

Child:

JSON

```
{
  "type": "field",
  "data_type": "boolean",
  "input_mode": "checkbox",
  "export_format": "mark"
}
```

Hoặc:

JSON

```
{
  "type": "field",
  "data_type": "text",
  "input_mode": "inline_text",
  "export_format": "text"
}
```

* * *

# 1.4. Phân loại field

Nên chuẩn hóa `data_type` ngay từ đầu:

```
boolean
text
number
date
select
multi_select
```

Và:

```
input_mode:

checkbox
text
number
date
select
multi_select
```

Ví dụ:

JSON

```
{
  "data_type": "multi_select",
  "input_mode": "multi_select",
  "options": [
    "Cờ tướng",
    "Cờ vua",
    "Kéo co"
  ]
}
```

Tuy nhiên với UI ma trận, tôi vẫn ưu tiên:

```
1 môn = 1 child column
```

hơn là một `multi_select` khổng lồ.

* * *

# 1.5. `column_records.value`

Đây là điểm cần thiết kế cẩn thận nhất.

Không nên chuyển từ:

JSON

```
true
```

sang một cấu trúc phức tạp bắt buộc cho tất cả record.

### Legacy

JSON

```
true
```

vẫn hợp lệ.

### Composite child

JSON

```
true
```

hoặc:

JSON

```
"Ăn chay"
```

hoặc:

JSON

```
{
  "selected": true
}
```

Tôi khuyến nghị **value của từng child column vẫn là atomic value**.

Ví dụ:

```
student 001
   │
   ├── BAN_TRU_REGISTER = true
   └── BAN_TRU_NOTE     = "Dị ứng hải sản"
```

Không nên:

JSON

```
{
  "ban_tru": {
    "register": true,
    "note": "Dị ứng hải sản"
  }
}
```

trong cùng một record.

### Lý do

Atomic child records giúp:

- query;
- filter;
- aggregate;
- export;
- index;
- audit;
- update từng ô;
- tránh merge conflict.

* * *

# 1.6. Có nên thêm `column_record_values`?

**Chưa cần ở Phase 1.**

Với quy mô THCS thông thường, PostgreSQL JSONB hiện tại đủ dùng.

Nhưng cần chuẩn hóa:

```
column_id
student_code
record_type
value
note
```

và tạo index:

SQL

```
CREATE INDEX idx_column_records_column_student
ON column_records(column_id, student_code);

CREATE INDEX idx_column_records_class_type
ON column_records(class_id, record_type);
```

Nếu sau này dữ liệu hàng triệu record và cần analytics phức tạp mới cân nhắc normalized value table.

* * *

# 1.7. `note` — cực kỳ quan trọng

Không nên dùng duy nhất:

```
column_records.note
```

cho mọi loại ghi chú.

Nên có hai khái niệm:

### Note của record

```
column_records.note
```

→ ghi chú dữ liệu của chính record.

### Child “Ghi chú”

Ví dụ:

```
Bán trú
├── Đăng ký
└── Ghi chú
```

thì “Ghi chú” thực chất là **một child column kiểu text**.

Điều này cho phép export:

```
Bán trú | Đăng ký | Ghi chú
```

một cách tự nhiên.

* * *

# 1.8. Optional Notes

UI cho mỗi activity:

```
☑ Bảo hiểm tai nạn
   └─ ☐ Có cột ghi chú kế bên

☑ Bán trú
   ├─ ☑ Đăng ký
   └─ ☑ Ghi chú

☑ Hội thao
   ├─ ☑ Cờ tướng
   ├─ ☑ Cờ vua
   └─ ☑ Kéo co
```

Nếu giáo viên bật:

```
Ghi chú kế bên
```

thì hệ thống **tạo child column**, không tạo một ngoại lệ riêng trong renderer.

Đây là một quyết định kiến trúc quan trọng.

* * *

# TRỤ CỘT 2 — INTERACTIVE MATRIX DATA GRID

## 2.1. Màn hình chính

```
┌───────────────────────────────────────────────────────────────┐
│ SỔ ĐĂNG KÝ HOẠT ĐỘNG – 8A12                                 │
├───────────────────────────────────────────────────────────────┤
│ [Thêm hoạt động] [Thêm cột] [Ẩn cột] [Xuất báo cáo]         │
├───────────────┬──────────────┬──────────────┬────────────────┤
│ HỌC SINH      │ BẢO HIỂM     │ BÁN TRÚ     │ HỘI THAO       │
│               ├──────┬───────┼──────┬───────┼───┬───┬───────┤
│               │ Có   │ Ghi chú│Đăng │Ghi chú │Cờ │Cờ │Kéo    │
│               │      │       │ ký   │        │tướng│vua│co    │
├───────────────┼──────┼───────┼──────┼────────┼───┼───┼───────┤
│ Nguyễn Văn A  │  ✓   │       │ ✓    │ Dị ứng │ ✓ │   │       │
│ Trần Văn B    │      │       │ ✓    │        │   │ ✓ │ ✓     │
└───────────────┴──────┴───────┴──────┴────────┴───┴───┴───────┘
```

* * *

# 2.2. Multi-header phải là cấu trúc thật

Không hard-code header bằng HTML.

Frontend nhận:

JSON

```
{
  "columns": [
    {
      "id": "bh",
      "name": "Bảo hiểm tai nạn",
      "children": [
        {
          "id": "bh_yes",
          "name": "Có",
          "type": "boolean"
        }
      ]
    }
  ]
}
```

Renderer tự tính:

```
colspan
rowspan
sort_order
visibility
```

Do đó thêm 20 hoạt động vẫn không cần sửa code UI.

* * *

# 2.3. Quick Actions

Mỗi activity có menu:

```
⋮
├── Chọn tất cả
├── Bỏ chọn tất cả
├── Đảo trạng thái
├── Xóa dữ liệu cột
├── Ẩn cột
├── Chỉnh sửa
└── Xuất riêng
```

Cực kỳ nên có **Confirm** khi:

```
Xóa dữ liệu cột
```

vì đây là thao tác destructive.

* * *

# 2.4. Keyboard UX

Nên hỗ trợ:

```
↑ ↓ ← →    di chuyển
Space       toggle checkbox
Enter       xuống dòng tiếp
Tab         ô kế tiếp
Shift+Tab   ô trước
F2          sửa text
Esc         hủy
Ctrl+Z      undo
Ctrl+Y      redo
```

### Đặc biệt

Không dùng:

```
onClick → save toàn bảng
```

mỗi lần click.

Nên:

```
UI action
   ↓
local state
   ↓
dirty cell
   ↓
debounced persistence
```

và backend có API cập nhật từng cell/batch.

* * *

# 2.5. Batch update

Ví dụ giáo viên chọn 25 học sinh tham gia Cờ vua:

JSON

```
{
  "column_id": "CO_VUA",
  "changes": [
    {
      "student_code": "HS001",
      "value": true
    },
    {
      "student_code": "HS002",
      "value": true
    }
  ]
}
```

Một request thay vì 25 request.

* * *

# 2.6. Không được mất dữ liệu khi xóa cột

Đây là invariant:

> **Ẩn/xóa khỏi giao diện ≠ xóa dữ liệu.**

### UI:

```
Xóa cột khỏi sổ
```

thực chất:

```
is_archived = true
```

Dữ liệu record vẫn tồn tại.

Nếu muốn xóa vĩnh viễn:

```
Xóa vĩnh viễn dữ liệu
```

phải là thao tác riêng + xác nhận.

* * *

# TRỤ CỘT 3 — CONSOLIDATED EXPORT ENGINE

## 3.1. Tách Export Engine khỏi UI

Kiến trúc:

```
Database
    ↓
Activity Schema Resolver
    ↓
Column Selection
    ↓
Export View Model
    ↓
Excel Renderer
    ↓
.xlsx
```

Không được để UI tự dựng Excel.

* * *

# 3.2. Export Selector

Giao diện:

```
CHỌN NỘI DUNG XUẤT

☑ Bảo hiểm tai nạn
   ☑ Có

☑ Bán trú
   ☑ Đăng ký
   ☑ Ghi chú

☑ Hội thao
   ☑ Cờ tướng
   ☑ Cờ vua
   ☐ Kéo co

[Chọn tất cả]
[Bỏ chọn tất cả]

────────────────────────
[ XUẤT EXCEL ]
```

Cho phép:

```
Save Export Profile
```

Ví dụ:

```
"Danh sách hội thao 2026"
```

Lần sau chỉ cần:

```
Xuất → Profile → Excel
```

* * *

# 3.3. Export Profile

Có thể bổ sung bảng:

```
export_profiles
```

với:

```
id
class_id
academic_year_id
name
selected_columns JSONB
layout_config JSONB
created_by
created_at
updated_at
```

Ví dụ:

JSON

```
{
  "selected_columns": [
    "bh_yes",
    "bantru_register",
    "bantru_note",
    "co_tuong",
    "co_vua"
  ],
  "mark": "✓",
  "include_totals": true
}
```

* * *

# 3.4. Excel Layout

Tôi đề xuất:

```
A1:H1
QUỐC HIỆU – TIÊU NGỮ

A3:H3
TRƯỜNG THCS ...

A4:H4
LỚP 8A12 – NĂM HỌC 2026–2027

A6:H6
DANH SÁCH ĐĂNG KÝ CÁC HOẠT ĐỘNG
```

Sau đó:

```
┌────┬────────┬──────────┬───────────┬───────────────┐
│STT │Mã HS   │Họ và tên │Bảo hiểm   │Bán trú        │
│    │        │          │     Có    │Đăng ký│Ghi chú│
├────┼────────┼──────────┼───────────┼───────────────┤
```

Activity có nhiều child:

```
Hội thao
 ├ Cờ tướng
 ├ Cờ vua
 └ Kéo co
```

thì merge header cấp 1:

```
        HỘI THAO
   ┌──────┬──────┬──────┐
   │Cờ    │Cờ    │Kéo   │
   │tướng │vua   │co    │
```

* * *

# 3.5. Quy tắc giá trị

Boolean:

```
true → ✓
false → ""
null → ""
```

Nhưng phải cấu hình được:

```
mark: "✓"
```

hoặc:

```
mark: "X"
```

Không hard-code.

* * *

# 3.6. Dòng tổng kết

Ví dụ:

```
TỔNG SỐ HS THAM GIA

Bảo hiểm: 38
Bán trú: 22
Cờ tướng: 8
Cờ vua: 12
Kéo co: 17
```

Phép đếm phải dựa trên:

```
value === true
```

chứ không dựa vào số dòng xuất ra.

* * *

# 3.7. Hậu tố A/B

Không sửa dữ liệu học sinh gốc.

Export resolver mới xử lý:

```
Nguyễn Văn An A
Nguyễn Văn An B
```

nếu hệ thống đã có quy tắc nhận diện.

Điều này giữ separation:

```
Student Master Data
        ≠
Export Presentation
```

* * *

# 3.8. Ký tên

Cuối sheet:

```
        Người lập bảng              Giáo viên chủ nhiệm

        (Ký, ghi rõ họ tên)         (Ký, ghi rõ họ tên)



                         HIỆU TRƯỞNG
                       (Ký, đóng dấu)
```

Cấu trúc layout nên là config để sau này có thể thay mẫu.

* * *

# TRỤ CỘT 4 — SECURITY / RLS / ACADEMIC YEAR

Đây là phần **không được coi là tùy chọn**.

## 4.1. Composite không được tạo ra “lỗ hổng quyền”

Mọi query phải gắn:

```
user
 ↓
academic_year
 ↓
class
 ↓
activity
 ↓
child column
 ↓
record
```

Không được:

SQL

```
SELECT * FROM column_records
WHERE column_id = ?
```

mà không kiểm tra ownership/class/year.

* * *

# 4.2. Invariant khóa vùng dữ liệu

Mỗi composite entity phải xác định:

```
class_id
academic_year_id
```

và:

```
column.class_id
=
column_records.class_id
```

đồng thời:

```
column.academic_year_id
=
class.academic_year_id
```

* * *

# 4.3. Composite Child không được tự do đổi class

Nếu:

```
parent_column.class_id = 8A12
```

thì:

```
child_column.class_id MUST = 8A12
```

Không cho API client gửi:

JSON

```
{
  "parent_column_id": "A",
  "class_id": "8A13"
}
```

và backend tự chấp nhận.

* * *

# 4.4. RLS

Logic policy phải bảo đảm:

```
user
  ↓
has access to academic_year
  ↓
has access to class
  ↓
can access column
  ↓
can access child
  ↓
can access records
```

Không được dựa vào frontend để bảo vệ.

* * *

# 4.5. Academic Year

Tôi khuyến nghị:

```
academic_year_id NOT NULL
```

đối với **mọi dữ liệu mới**.

Dữ liệu cũ chưa có trường này:

```
migration mapping
```

phải được thực hiện trước khi bật constraint bắt buộc.

### Không làm:

```
academic_year_id = current year
```

một cách mù quáng.

Phải map từ dữ liệu class hiện hữu.

* * *

# TRỤ CỘT 5 — MASTER ROADMAP

## PHASE 1 — Data Foundation

### Mục tiêu

Có thể tạo:

```
1 Activity
    ↓
N Child Columns
    ↓
N Student Records
```

mà không ảnh hưởng legacy.

### Công việc

1. Migration schema.
2. `parent_column_id`.
3. `activity_config`.
4. `display_config`.
5. `schema_version`.
6. `academic_year_id`.
7. index.
8. API CRUD composite.
9. API batch record update.
10. RLS.
11. migration test.

### Acceptance

Phải chạy đồng thời:

```
Legacy one-time
+
Composite one-time
```

trên cùng hệ thống.

* * *

# PHASE 2 — Matrix + Export

### Mục tiêu

Giáo viên sử dụng được end-to-end:

```
Tạo hoạt động
→ thêm cột con
→ nhập dữ liệu
→ chỉnh sửa
→ ẩn
→ khôi phục
→ chọn cột
→ xuất Excel
```

### Công việc

#### UI

- Multi-header.
- Sticky student column.
- Sticky header.
- Checkbox.
- Inline text.
- Keyboard navigation.
- Quick-fill.
- Column reorder.
- Hide/archive.
- Undo.

#### Export

- Selector.
- Export profile.
- ExcelJS.
- Merge cells.
- Header.
- Totals.
- Signature.
- Print setup.

* * *

# PHASE 3 — Hardening / Production

### Security

- RLS test.
- Cross-class test.
- Cross-year test.
- privilege escalation test.
- archived-column test.

### Reliability

- transaction.
- batch update.
- optimistic concurrency.
- audit log.

### UX

- loading state.
- autosave state.
- retry.
- conflict notification.
- empty state.
- mobile/tablet fallback.

### Performance

Test tối thiểu:

```
40 học sinh × 30 child columns
```

sau đó:

```
100 học sinh × 100 child columns
```

và:

```
500+ students/large registry
```

để tìm ngưỡng virtualized grid.

* * *

# COUNTEREXAMPLE TABLE — BẮT BUỘC NGHIỆM THU

| # | Tình huống | Kỳ vọng |
| --- | --- | --- |
| 1 | Legacy one-time column | Không thay đổi |
| 2 | Tạo Activity mới | Tạo được root |
| 3 | Activity có 10 child | Matrix hiển thị đúng |
| 4 | Thêm child sau khi nhập dữ liệu | Dữ liệu cũ không mất |
| 5 | Archive child | Record vẫn tồn tại |
| 6 | Restore child | Dữ liệu quay lại |
| 7 | Xóa parent | Không được xóa ngầm records |
| 8 | Quick tick 40 HS | Tất cả record đúng |
| 9 | Hai giáo viên sửa cùng lúc | Không silently overwrite |
| 10 | Export 3 activity | Một Excel duy nhất |
| 11 | Export chỉ 2 child | Chỉ 2 child xuất |
| 12 | Boolean | Xuất ✓/X đúng |
| 13 | Text note | Không bị mất Unicode |
| 14 | Empty value | Không xuất `"null"` |
| 15 | Cross-class request | RLS từ chối |
| 16 | Cross-year request | RLS từ chối |
| 17 | Child thuộc parent khác class | Backend từ chối |
| 18 | Legacy record `value=true` | Đọc đúng |
| 19 | Composite record | Query/export đúng |
| 20 | Reload browser | Không mất dữ liệu |
| 21 | Offline/network retry | Không tạo duplicate |
| 22 | 100 child columns | Header không vỡ |
| 23 | Duplicate student name | Dựa vào `student_code`, không dựa tên |
| 24 | Archived child export | Không xuất nếu chưa chọn |
| 25 | Export profile cũ | Vẫn resolve được column ID |

**Strength = 4:** không chỉ test “happy path”, mà phải chứng minh hệ thống không phá vỡ khi thao tác sai, dữ liệu cũ tồn tại, cột thay đổi hoặc quyền truy cập không hợp lệ.

* * *

# API CONTRACT ĐỀ XUẤT

## Tạo Composite Activity

http

```
POST /classes/:classId/activities
```

JSON

```
{
  "name": "Tham gia hội thao",
  "frequency": "one_time",
  "activity_config": {
    "type": "composite",
    "version": 1
  }
}
```

## Tạo child

http

```
POST /columns/:parentId/children
```

JSON

```
{
  "name": "Cờ vua",
  "activity_config": {
    "type": "field",
    "data_type": "boolean",
    "input_mode": "checkbox"
  }
}
```

## Batch update

http

```
PATCH /column-records/batch
```

JSON

```
{
  "changes": [
    {
      "column_id": "co_vua",
      "student_code": "HS001",
      "value": true
    },
    {
      "column_id": "co_vua",
      "student_code": "HS002",
      "value": true
    }
  ]
}
```

* * *

# Quyết định kiến trúc quan trọng nhất

Tôi chốt 7 nguyên tắc sau trong Master Plan:

### 1\. Không phá `columns` cũ

`one_time` vẫn hoạt động như trước.

### 2\. Parent–Child là cấu trúc chính

```
Activity
  └── Child Columns
```

### 3\. Một child = một field

Không nhồi toàn bộ activity vào một JSON record.

### 4\. `value` giữ JSONB

Nhưng **atomic value theo child column**.

### 5\. “Ghi chú kế bên” là child column

Không tạo một cơ chế đặc biệt thứ hai.

### 6\. Archive thay cho destructive delete

Giáo viên có thể thay đổi cấu trúc sổ mà không mất dữ liệu.

### 7\. Export là một engine độc lập

UI chỉ chọn:

```
what to export
```

Export Engine quyết định:

```
how to render
```

* * *

# MASTER FLOW HOÀN CHỈNH

```
                 ┌─────────────────────┐
                 │   CLASS + YEAR      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Composite Activity  │
                 │      Parent         │
                 └──────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Boolean         Boolean        Text
          "Có"            "Cờ vua"       "Ghi chú"
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                    Student Records
                            │
                            ▼
                    Matrix Data Grid
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
              Save/Batch          Export Selector
                                      │
                                      ▼
                                Export View Model
                                      │
                                      ▼
                                   ExcelJS
                                      │
                                      ▼
                                    .xlsx
```

* * *

# Thứ tự thi công tôi khuyến nghị

Không nên bắt đầu bằng giao diện.

Thứ tự chuẩn là:

```
1. Freeze current schema/API contract
          ↓
2. Define invariants
          ↓
3. Migration + academic_year isolation
          ↓
4. Composite parent/child model
          ↓
5. RLS
          ↓
6. CRUD/API + batch records
          ↓
7. Matrix UI
          ↓
8. Export View Model
          ↓
9. ExcelJS renderer
          ↓
10. Counterexample tests
          ↓
11. Performance test
          ↓
12. Production hardening
```

**Không nên triển khai Phase 2 trước khi Phase 1 pass các counterexample #1, #5, #15, #16, #18 và #20.**

Đây là điểm kiểm soát quan trọng để tính năng “một lần nhưng nhiều cột” không trở thành một lớp dữ liệu mới tách rời, gây nợ kỹ thuật cho hệ thống Sổ theo dõi hiện tại.

**MASTER PLAN được xem là đủ điều kiện để chuyển sang bước implementation khi:** schema contract, invariants, RLS, API contract và Counterexample Table đã được chốt; sau đó mới giao từng Phase cho agent thi công và nghiệm thu độc lập.

END OF HANDOFF