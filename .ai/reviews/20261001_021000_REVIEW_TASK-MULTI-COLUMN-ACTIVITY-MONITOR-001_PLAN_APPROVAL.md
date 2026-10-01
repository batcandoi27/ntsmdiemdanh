> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.## THẨM ĐỊNH ĐỘC LẬP

**Kết luận ngắn:** Kế hoạch Master có hướng kiến trúc đúng và có thể triển khai, nhưng **chưa đủ chặt để cho phép Antigravity code toàn diện ngay theo đúng bản hiện tại**. Có một số khoảng trống quan trọng giữa “nguyên tắc” và “schema/API contract” cần khóa trước khi triển khai.

Tôi đánh giá kiến trúc này **đủ điều kiện APPROVED\_FOR\_EXECUTION theo mô hình có các Architecture Gates bắt buộc**, tức là Antigravity được bắt đầu Phase 1, nhưng **không được tự diễn giải các điểm còn thiếu**.

* * *

# 1\. Đánh giá 7 Architectural Pillars

| Pillar | Đánh giá | Nhận xét |
| --- | --- | --- |
| 1\. Zero Breaking Changes | 🟢 Đúng hướng | Giữ legacy `frequency='one_time'` và `activity_config IS NULL` là hợp lý |
| 2\. Parent–Child Hierarchy | 🟢 Khả thi | `parent_column_id` phù hợp, nhưng cần khóa invariant cha/con |
| 3\. Atomic Child Record | 🟢 Tốt | Đây là lựa chọn tốt hơn nhồi toàn bộ matrix vào JSON |
| 4\. Notes = Child Column | 🟢 Tốt | Thiết kế thống nhất renderer/export |
| 5\. Archive First | 🟡 Thiếu schema | Master Plan sử dụng `is_archived` nhưng migration được đưa ra **không thêm trường này** |
| 6\. Decoupled Export | 🟢 Đúng | Cần chốt contract của export engine trước khi code UI |
| 7\. Class/Academic-Year Isolation | 🔴 Chưa đủ | Đây là điểm nguy hiểm nhất: mới nêu nguyên tắc, chưa có constraint/RLS/API contract cụ thể |

### Điểm cần sửa ngay

Migration hiện tại có:

SQL

```
parent_column_id
activity_config
display_config
schema_version
```

nhưng Pillar 5 lại yêu cầu:

```
is_archived = true
```

Do đó schema contract đang **không đồng nhất với architectural contract**.

Antigravity không được tự xử lý bằng cách dùng một trường khác hoặc xóa bản ghi thật.

* * *

# 2\. Schema Migration — Các rủi ro cần khóa

## 2.1. `parent_column_id` chưa đủ để bảo đảm cùng lớp/năm học

Ví dụ:

```
Parent:
class_id = A
academic_year_id = 2026

Child:
class_id = B
academic_year_id = 2026
parent_column_id = Parent.id
```

FK:

SQL

```
REFERENCES columns(id)
```

**không ngăn được trường hợp này.**

Vì vậy Pillar 7 hiện mới là **ý định kiến trúc**, chưa phải invariant DB.

### Khuyến nghị

Backend phải kiểm tra tối thiểu:

```
child.class_id === parent.class_id
child.academic_year_id === parent.academic_year_id
```

và kiểm tra lại ở server/service layer, không tin dữ liệu do frontend gửi.

Nếu DB engine/schema hiện tại phù hợp, có thể tăng cường bằng composite constraint/FK; nếu không, service-layer invariant + RLS phải là lớp bắt buộc.

* * *

# 3\. `is_archived` phải trở thành schema contract

Nên bổ sung:

SQL

```
ALTER TABLE columns
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
```

và index phù hợp nếu truy vấn thường xuyên theo:

```
class_id
academic_year_id
is_archived
parent_column_id
```

Quan trọng:

> **Archive không đồng nghĩa với “không còn tồn tại”.**

UI mặc định có thể không hiển thị archived column, nhưng:

- record vẫn tồn tại;
- có thể restore;
- export phải mặc định loại archived;
- lịch sử dữ liệu không được mất.

* * *

# 4\. Cần bổ sung invariant cho Parent/Child

Không nên cho phép cấu trúc tùy ý.

Tối thiểu phải khóa:

```
Parent:
parent_column_id = NULL
activity_config.type = "composite"

Child:
parent_column_id != NULL
activity_config.type = "field"
```

Không cho phép:

```
Parent → Parent
Child → Child → Child
```

nếu hệ thống chỉ thiết kế đúng 2 tầng.

Tôi **không khuyến nghị biến hệ thống thành cây đệ quy vô hạn** ở task này.

Nên xác định rõ:

```
Activity
 ├── Child 1
 ├── Child 2
 ├── Child 3
 └── Notes Child
```

thay vì:

```
A → B → C → D → ...
```

Điều này làm UI, Excel export, validation và query đơn giản hơn rất nhiều.

* * *

# 5\. `activity_config JSONB` cần validation

Hiện tại JSONB rất linh hoạt nhưng cũng tạo nguy cơ:

JSON

```
{
  "type": "abc",
  "data_type": "whatever"
}
```

lọt xuống database.

Không nên để mỗi frontend tự quyết định schema.

Cần có một **canonical TypeScript contract**, ví dụ về mặt kiến trúc:

```
CompositeActivityConfig
FieldColumnConfig
```

với enum rõ ràng:

```
type:
  composite | field

data_type:
  boolean | text | number | select

input_mode:
  checkbox | inline_text | select | number
```

Backend phải validate trước khi ghi.

* * *

# 6\. `column_records` — điểm cần kiểm tra rất kỹ

Master Plan nói:

```
column_records
column_id
student_code
value
```

nhưng cần bảo đảm **mỗi học sinh chỉ có một record cho một column**.

Nếu schema hiện tại chưa có unique constraint/index tương ứng thì batch-save có thể tạo:

```
HS001 + column_A
HS001 + column_A
HS001 + column_A
```

và sau đó renderer không biết record nào là chính xác.

Cần invariant tương đương:

```
UNIQUE(column_id, student_code)
```

hoặc dùng đúng định danh học sinh hiện hữu của hệ thống nếu `student_code` không phải khóa ổn định.

* * *

# 7\. Không nên coi `student_code` là đủ nếu hệ thống đã có student ID

Counterexample C07 nói:

> Học sinh trùng tên phải định danh chính xác theo `student_code`.

Điều này đúng về mặt nghiệp vụ, **nhưng cần kiểm tra schema hiện tại**.

Nếu hệ thống đã có:

```
student.id
```

thì record nên liên kết với ID ổn định đó; tên và mã học sinh chỉ là thuộc tính hiển thị/định danh nghiệp vụ.

Antigravity phải kiểm tra schema thực tế trước khi quyết định thay đổi khóa.

* * *

# 8\. Batch API cần contract chặt hơn

`batchSaveColumnRecords` là hướng đúng nhưng Master Plan chưa định nghĩa đủ.

Không nên chỉ có:

```
batchSaveColumnRecords(records)
```

Cần xác định rõ:

### Input

```
classId
academicYearId
columnId
records[]
```

hoặc batch nhiều column nếu thực sự cần.

### Mỗi record

```
studentId
value
note
```

### Backend phải kiểm tra

```
authenticated user
        ↓
class permission
        ↓
academic year
        ↓
column ownership
        ↓
student belongs to class
        ↓
column belongs to class/year
        ↓
value matches column data_type
        ↓
transaction
        ↓
upsert
```

**Không được để frontend quyết định `class_id` hợp lệ.**

* * *

# 9\. Race Condition — Master Plan mới giải quyết một nửa

Nguyên tắc atomic record rất tốt, nhưng:

> Batch request ≠ tự động chống race condition.

Ví dụ hai tab cùng sửa:

```
Teacher Tab A → HS001 = true
Teacher Tab B → HS001 = false
```

Request đến khác thứ tự.

Cần quyết định chiến lược:

- last-write-wins;
- optimistic concurrency/version;
- hoặc timestamp/version của record.

Với ứng dụng sổ theo dõi, tôi khuyến nghị ít nhất phải có **updated\_at/version và transaction/upsert rõ ràng**.

Không nhất thiết phải triển khai hệ thống locking phức tạp.

* * *

# 10\. Phase 1 phải có Architecture Gate

Antigravity **không nên nhảy ngay sang Phase 2** chỉ vì migration chạy thành công.

Phase 1 chỉ PASS khi chứng minh được:

### Legacy

```
one_time + activity_config NULL
```

vẫn hoạt động.

### Composite

```
Parent
 ├── Child A
 ├── Child B
 └── Notes
```

hoạt động.

### Isolation

Không thể:

```
Class A → access Class B
Year 2026 → access Year 2025
```

### Archive

```
archive
↓
record remains
↓
restore
↓
record returns
```

### Atomicity

Một batch 40 học sinh:

```
all succeed
```

hoặc transaction xử lý lỗi theo contract đã định; tuyệt đối không để trạng thái “20 học sinh lưu, 20 học sinh mất” mà API lại báo thành công.

* * *

# 11\. Phase 2 — UI cần thêm một số quy tắc

Thiết kế Matrix Grid là hợp lý.

Tôi yêu cầu Antigravity đặc biệt chú ý:

### Không render archived column mặc định

```
active columns → visible
archived columns → hidden
```

nhưng có:

```
Quản lý cột → Cột đã ẩn → Khôi phục
```

### Sticky column

Ít nhất:

```
STT
Mã HS
Họ và tên
```

phải sticky.

### Keyboard

Phải kiểm thử:

```
Space
Tab
Shift + Tab
Enter
Esc
```

để giáo viên có thể nhập nhanh.

### Debounce

Inline note không được:

```
mỗi ký tự → 1 API request
```

Nên debounce và có trạng thái:

```
Đang lưu...
Đã lưu ✓
Lỗi lưu ⚠
```

Nếu save thất bại phải **không âm thầm mất dữ liệu**.

* * *

# 12\. Phase 3 — Export Engine

Đây là phần có nhiều khả năng phát sinh lỗi nhất.

Tôi đề nghị **không để UI tự dựng Excel**.

Luồng bắt buộc:

```
UI
 ↓
Export Selection DTO
 ↓
Composite Export Service
 ↓
Normalized Export Model
 ↓
Excel Renderer
 ↓
.xlsx
```

Ví dụ:

```
ExportSelection
        ↓
Selected Activities
        ↓
Selected Child Columns
        ↓
Student Rows
        ↓
Normalized Matrix
        ↓
ExcelJS
```

Như vậy sau này có thể thêm:

```
Excel
PDF
Print
CSV
```

mà không phải viết lại logic nghiệp vụ.

* * *

# 13\. Excel Merged Header cần test đặc biệt

Ví dụ:

```
┌──────────┬───────────────┬────────────────────┐
│ HỌC SINH │ BẢO HIỂM     │ BÁN TRÚ            │
│          │ Có            │ Đăng ký │ Ghi chú │
└──────────┴───────────────┴────────────────────┘
```

Nếu chọn:

```
Bảo hiểm
Bán trú
```

thì merge phải được tính lại.

Nếu chỉ chọn:

```
Bán trú → Ghi chú
```

thì **không được xuất một Parent Header rỗng hoặc merge sai colspan**.

Đây nên là một nhóm test riêng trong Phase 3.

* * *

# 14\. Counterexample Table hiện mới có 8/25 test

Master Plan nói:

> kiểm thử 25 kịch bản

nhưng bảng hiện tại chỉ liệt kê:

```
C01 → C08
```

Đây là một khoảng trống đáng kể.

Tôi yêu cầu bổ sung ít nhất các nhóm:

### Data integrity

```
C09 duplicate record
C10 invalid data_type
C11 orphan child
C12 parent archived
C13 restore archived column
```

### Security/isolation

```
C14 cross-class child
C15 cross-year child
C16 unauthorized API update
C17 unauthorized export
```

### Concurrency

```
C18 simultaneous update
C19 repeated batch request
```

### Export

```
C20 empty selection
C21 archived column selected
C22 partial child selection
C23 notes column
C24 merged header
C25 totals/signature section
```

* * *

# 15\. Chỉ dẫn thực thi cho Antigravity

## PHASE 1 — KHÔNG được code UI trước

Thứ tự:

```
1. Inspect existing schema
2. Inspect column-service.ts
3. Inspect record-service.ts
4. Inspect existing RLS/auth rules
5. Inspect current one_time flow
6. Write migration
7. Write TypeScript domain contracts
8. Implement service layer
9. Implement validation/invariants
10. Add tests
11. Run legacy regression
12. Run composite tests
```

**Không được tự ý refactor unrelated code.**

**Không được migration phá dữ liệu cũ.**

* * *

## PHASE 2

Chỉ bắt đầu sau khi Phase 1 Gate PASS.

Thứ tự:

```
Matrix model
→ header calculation
→ sticky grid
→ cell editor
→ batch persistence
→ dynamic column modal
→ archive/restore
→ keyboard interaction
→ error/retry UX
```

* * *

## PHASE 3

Chỉ bắt đầu sau khi Phase 2 Gate PASS.

Thứ tự:

```
Export DTO
→ selection tree
→ normalized matrix
→ ExcelJS renderer
→ merged headers
→ totals
→ signatures
→ formatting
→ export regression tests
```

* * *

# 16\. Quy tắc quan trọng nhất cho Antigravity

Tôi đề nghị thêm nguyên văn vào task implementation:

> **DO NOT invent missing business rules.**
> 
> Nếu implementation gặp một điểm chưa được định nghĩa trong Master Plan, Antigravity phải:
> 
> 1. kiểm tra code/schema hiện tại;
> 2. ưu tiên backward compatibility;
> 3. không tự thay đổi behavior legacy;
> 4. ghi nhận `ARCHITECTURE_DECISION_REQUIRED`;
> 5. chỉ tiếp tục nếu quyết định không ảnh hưởng dữ liệu hoặc security boundary.

Đặc biệt cấm tự ý:

```
DELETE old columns
DELETE column_records
migrate all legacy one_time → composite
change existing student identity
bypass RLS
store entire matrix as JSON
```

* * *

# 17\. Đánh giá cuối cùng

### Về kiến trúc

**Đạt mức triển khai được.**

Ý tưởng quan trọng nhất — **Parent Activity → Atomic Child Columns → Independent Export Engine** — là cấu trúc hợp lý và có khả năng mở rộng.

### Về schema hiện tại

**Chưa thể coi là hoàn chỉnh**, chủ yếu vì:

1. `is_archived` chưa có trong migration.
2. Parent/Child chưa có invariant cùng `class_id` + `academic_year_id`.
3. Chưa thấy contract bảo đảm unique record/student/column.
4. JSONB chưa có validation contract rõ ràng.
5. Batch API chưa định nghĩa transaction/concurrency/security contract.
6. RLS mới được nêu như yêu cầu, chưa được đặc tả implementation.

### Về roadmap

**3 Phase là hợp lý**, nhưng phải có Gate:

```
PHASE 1
   ↓
ARCHITECTURE + DATA INTEGRITY GATE
   ↓
PHASE 2
   ↓
UI + PERSISTENCE GATE
   ↓
PHASE 3
   ↓
EXPORT + SECURITY + REGRESSION GATE
   ↓
RELEASE
```

* * *

# KẾT LUẬN THẨM ĐỊNH

**FINAL VERDICT: `APPROVED_FOR_EXECUTION`**

Antigravity **được phép khởi động Phase 1 ngay**, với điều kiện các điểm bắt buộc ở trên được coi là **Architecture Gates**, không phải tùy chọn.

Đặc biệt, trước khi migration phải khóa 5 contract sau:

```
[1] is_archived contract
[2] Parent/Child class + academic_year invariant
[3] column_record uniqueness
[4] batch transaction + authorization contract
[5] canonical TypeScript/validation contract
```

Sau khi 5 contract này được khóa, kiến trúc Composite Activity có thể triển khai mà vẫn giữ nguyên nguyên tắc quan trọng nhất của hệ thống:

> **Legacy hoạt động như cũ — Composite là năng lực mới — dữ liệu cũ không bị phá — dữ liệu mới được lưu nguyên tử — export hoàn toàn độc lập với UI.**

END OF HANDOFF