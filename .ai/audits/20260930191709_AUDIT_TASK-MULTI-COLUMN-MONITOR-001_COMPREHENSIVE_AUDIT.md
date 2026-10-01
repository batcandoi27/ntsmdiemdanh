> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.Tôi sẽ audit theo đúng 7 invariant, nhưng tách rõ những gì đã được chứng minh bằng smoke test khỏi những gì mới chỉ là thiết kế/khẳng định. Điểm tôi sẽ soi kỹ nhất là race condition, tenant/class isolation, archive semantics và độ chuẩn của Excel xuất hành chính.## Kết quả Audit độc lập

**Kết luận nghiệm thu hiện tại: `REQUEST_CHANGES` — YÊU CẦU BỔ SUNG.**

Không phải vì kiến trúc composite hiện tại sai. Ngược lại, 7 invariant được mô tả khá chặt. Vấn đề là **bằng chứng kiểm thử hiện có chưa đủ để chứng minh các invariant thực sự bất biến trong môi trường concurrent/multi-user và khi xuất dữ liệu thực tế**.

Smoke test `100%` mới chứng minh được happy path ở mức service integration; nó **chưa đủ để nghiệm thu production** cho một hệ thống quản lý dữ liệu học sinh.

* * *

# 1\. Audit 7 invariant

| Invariant | Đánh giá | Nhận xét |
| --- | --- | --- |
| 1\. Zero Breaking Changes | 🟢 Có cơ sở | Giữ `columns`, `column_records`, `activity_config IS NULL` là hướng backward-compatible tốt |
| 2\. Parent/Child hierarchy | 🟢 | Mô hình rõ ràng, dễ mở rộng |
| 3\. Atomic Records | 🟡 | Thiết kế tốt nhưng `id='${childColId}_${studentCode}'` chưa đủ chứng minh chống race/duplicate |
| 4\. Notes first-class | 🟢 | Đúng hướng, tránh special-case storage |
| 5\. Archive First | 🟡 | Cần kiểm thử restore, uniqueness và truy vấn mặc định |
| 6\. Decoupled Export | 🟡 | Kiến trúc đúng, nhưng chưa chứng minh Excel thực tế đạt chuẩn |
| 7\. Permission/Data Isolation | 🔴 | Đây là điểm cần bổ sung kiểm thử nghiêm ngặt nhất |

**Điểm yếu lớn nhất hiện tại: Invariant 7 mới là một quy tắc khởi tạo dữ liệu, chưa phải một security boundary được chứng minh ở mọi đường đọc/ghi.**

* * *

# 2\. C01–C25: Counterexample Verification

Trong handoff hiện tại **chưa có bảng nội dung cụ thể của C01–C25**, vì vậy không thể trung thực tuyên bố rằng toàn bộ 25 counterexample đã được chạy.

Smoke test được mô tả:

> Typecheck 0 errors → CRUD parent/child → batch save 3 ô → query kiểm tra → cleanup

chỉ kiểm chứng một đường đi thuận lợi.

Tôi đề nghị coi **C01–C25 dưới đây là bộ acceptance test bắt buộc**:

| ID | Counterexample cần kiểm | Rủi ro |
| --- | --- | --- |
| C01 | Tạo composite không có child | orphan/invalid activity |
| C02 | Child trỏ sang parent khác class | **cross-class leakage** |
| C03 | Child có `class_id` khác parent | **critical** |
| C04 | Student không thuộc class ghi record | **critical** |
| C05 | Gửi `studentCode` của lớp khác qua API | **critical** |
| C06 | Hai user save cùng một ô đồng thời | lost update |
| C07 | Batch save trùng record ID | duplicate/upsert ambiguity |
| C08 | Batch save thất bại giữa chừng | partial write |
| C09 | Network timeout sau khi DB đã commit | retry duplicate/lost-state |
| C10 | Double-click checkbox | race/idempotency |
| C11 | Quick Fill đồng thời với manual edit | **lost update** |
| C12 | Child column bị archive trong lúc đang edit | stale write |
| C13 | Parent bị archive khi child vẫn active | inconsistent tree |
| C14 | Restore parent sau khi archive | hierarchy restoration |
| C15 | Xóa/đổi mã học sinh sau khi đã có records | historical integrity |
| C16 | Đổi `studentCode` nhưng giữ ID cũ | orphan records |
| C17 | Hai activity có cùng tên | identity phải dựa ID, không dựa name |
| C18 | Hai child có cùng label | export/header ambiguity |
| C19 | Notes column chứa Unicode/emoji/dấu xuống dòng | Excel corruption/layout |
| C20 | Nội dung học sinh nhập `=HYPERLINK(...)` | **Excel formula injection** |
| C21 | Activity có 50–100 child columns | UI/export performance |
| C22 | Class có 40–1000 học sinh | query/render/export scalability |
| C23 | Export trong khi đang debounce save | **stale Excel** |
| C24 | User không có quyền nhưng gọi trực tiếp export/API | **authorization bypass** |
| C25 | User A class 8A12 truy cập ID activity của class 8A13 | **tenant/class isolation breach** |

### Ba test tôi coi là blocker

**C03, C24, C25.**

Nếu một trong ba test này thất bại thì không được nghiệm thu production.

* * *

# 3\. Race condition: thiết kế atomic là đúng nhưng chưa đủ

Việc không lưu một hàng dạng JSON lớn là quyết định kiến trúc tốt.

Nhưng:

```
${childColId}_${studentCode}
```

chỉ tạo ra một **logical key**.

Cần chứng minh database có constraint tương ứng, ví dụ:

```
UNIQUE(child_column_id, student_id)
```

hoặc một khóa tương đương.

Đặc biệt cần tránh tình huống:

```
Request A:
read → no record → insert

Request B:
read → no record → insert
```

Hai request đồng thời vẫn có thể tạo duplicate nếu chỉ kiểm tra ở application layer.

### Khuyến nghị

`batchSaveMatrixRecords()` nên có semantics:

```
UPSERT
  ON UNIQUE(child_column_id, student_id)
```

và phải **idempotent**.

Ngoài ra nên có:

```
updated_at
updated_by
```

và nếu nghiệp vụ yêu cầu audit mạnh:

```
version
```

để phát hiện stale write.

* * *

# 4\. Quick Fill là vùng nguy hiểm nhất về dữ liệu

Tính năng:

> quick fill toàn lớp + debounced batch save

rất tiện cho giáo viên nhưng tạo một concurrency problem lớn.

Ví dụ:

```
Teacher A:
Quick Fill = Có

Teacher B:
đang sửa riêng Student 15 = Không

A's debounce batch
        ↓
ghi đè B
```

Nếu không có version/conflict strategy, **0ms UI latency không đồng nghĩa với data integrity**.

Tôi yêu cầu test:

```
Manual edit
       +
Quick Fill
       +
Concurrent save
       +
Retry
```

Nếu muốn UX đơn giản, tối thiểu phải đảm bảo:

- request cuối cùng có deterministic behavior;
- batch không ghi đè các record ngoài phạm vi thực sự thay đổi;
- retry không tạo duplicate;
- lỗi save phải được hiển thị;
- không được để checkbox xanh/đã tick trong UI nhưng DB thực tế chưa lưu mà người dùng không biết.

* * *

# 5\. `class_id` inheritance chưa đủ để bảo mật

Invariant 7 nói:

> child kế thừa `class_id` từ parent khi khởi tạo.

Điều này **tốt cho data integrity**, nhưng chưa phải authorization.

Phải có kiểm tra ở **server/database boundary**, không chỉ ở UI hoặc service caller:

```
currentUser
   ↓
permission
   ↓
class access
   ↓
activity ownership/class_id
   ↓
child ownership
   ↓
student ownership
   ↓
read/write
```

Không được dựa vào:

```
URL /classes/:id
```

hoặc:

```
hidden UI button
```

để bảo vệ.

### Test bắt buộc

User thuộc lớp A:

```
GET activity-B
GET child-B
GET records-B
POST records-B
PATCH child-B
DELETE/archive activity-B
EXPORT activity-B
```

**tất cả phải bị từ chối**, kể cả khi biết chính xác UUID/ID.

* * *

# 6\. Một vấn đề kiến trúc nữa: `studentCode`

Tôi đặc biệt khuyến nghị xem lại:

```
childColId_studentCode
```

Nếu `studentCode` có thể thay đổi trong hệ thống thì đây là một historical-integrity risk.

Ví dụ:

```
HS001 → Nguyễn Văn A
```

sau đó đổi mã:

```
HS001 → HS047
```

Record cũ sẽ thế nào?

Tốt hơn là:

```
child_column_id + student_id
```

trong đó `student_id` là immutable internal identifier.

`studentCode` chỉ nên là **display/business identifier**, không nên là nền tảng của historical identity nếu nó có khả năng thay đổi.

* * *

# 7\. Archive First — đúng hướng nhưng cần hoàn thiện semantics

`archived=true` tốt hơn physical delete.

Nhưng cần quy định rõ:

### Khi archive parent

- child tự động archive?
- child vẫn tồn tại nhưng không hiển thị?
- record cũ có còn export được?
- restore parent có restore children không?

### Khi archive child

- record lịch sử giữ nguyên?
- có cho tạo child mới trùng tên không?
- export mặc định bỏ archived child hay cho chọn?

Tôi khuyến nghị:

```
archive ≠ delete
archive ≠ destroy history
```

và:

```
default UI → chỉ active
history/export → có thể chọn archived
```

* * *

# 8\. Excel Export — hiện chưa đủ bằng chứng để gọi là “chuẩn Bộ GD&ĐT”

Có một điểm cần chỉnh cách gọi.

**Không nên tuyên bố “Excel chuẩn biểu mẫu hành chính Bộ GD&ĐT” chỉ dựa vào việc có Quốc hiệu + tiêu ngữ + Times New Roman + merged header.**

Quy định về thể thức văn bản hành chính quy định nhiều yếu tố hơn, như khổ A4, hướng trang, lề, phông chữ, vị trí Quốc hiệu, tiêu ngữ và các thành phần thể thức. Ví dụ, hướng dẫn của Bộ Nội vụ quy định A4 và các khoảng lề cụ thể; Quốc hiệu gồm hai dòng và quy định cả cỡ chữ/cách trình bày. [Chính Phủ Văn Bản+1](https://vanban.chinhphu.vn/default.aspx?docid=99777&pageid=27160&utm_source=chatgpt.com)

Trong trường hợp này đây là **một bảng biểu/phiếu theo dõi xuất Excel**, không nên đồng nhất nó với “văn bản hành chính” nếu chưa có mẫu nghiệp vụ cụ thể của trường/cơ quan.

### Vì vậy tôi đề nghị gọi chính xác hơn:

> **“Mẫu Excel bảng theo dõi hành chính theo thể thức trình bày được cấu hình”**

thay vì khẳng định:

> “chuẩn Bộ GD&ĐT”.

* * *

# 9\. Các yêu cầu Excel tôi đánh giá

### 🟢 Nên có

```
A4
Landscape khi nhiều cột
Fit to width = 1 page
Repeat header rows
Freeze panes
Times New Roman
Border
Alignment
Wrap text
Print area
Page numbering
```

### Header

Cấu trúc:

```
┌─────┬─────────┬──────────────┬─────────────────────┐
│ STT │ Mã HS   │ Họ và tên    │ BẢO HIỂM │ BÁN TRÚ │
│     │         │              │ Có/Không │ Đăng ký │ Ghi chú │
└─────┴─────────┴──────────────┴─────────────────────┘
```

là hợp lý về mặt dữ liệu.

Nhưng phải test:

- activity chỉ có 1 child;
- activity có 10 child;
- activity bị archive;
- activity chỉ có notes;
- nhiều activity;
- activity không có child;
- child bị reorder;
- export subset.

* * *

# 10\. Tick `✓` / `X`: cần quy định rõ

Không nên chỉ đổi:

```
true → ✓
false → X
```

mà không định nghĩa:

```
true
false
null
```

Ba trạng thái có ý nghĩa khác nhau:

| DB | Excel |
| --- | --- |
| `true` | ✓ |
| `false` | X |
| `null` | để trống |

Đây là điểm quan trọng vì:

> **Không đăng ký ≠ chưa xác nhận ≠ không có thông tin.**

Đặc biệt đối với:

- bảo hiểm;
- bán trú;
- hội thao.

Nếu checkbox hiện tại chỉ có Boolean, cần xác định rõ nghiệp vụ có thực sự chỉ cần 2 trạng thái hay không.

* * *

# 11\. Notes column

Ý tưởng:

```
isNotesColumn = true
dataType = text
```

là tốt.

Nhưng cần test:

- text dài;
- xuống dòng;
- dấu `;`;
- Unicode;
- emoji;
- ký tự Excel đặc biệt;
- chuỗi bắt đầu bằng:

```
=
+
-
@
```

### Excel Formula Injection

Ví dụ người dùng nhập:

```
=HYPERLINK(...)
```

Nếu ExcelJS ghi thẳng thành formula, file Excel có thể chứa executable formula behavior.

Do đó export phải phân biệt:

```
user text
```

với:

```
formula
```

và mặc định phải coi notes là **text thuần**.

Đây là một security test nên thêm vào C20.

* * *

# 12\. UX: 0ms latency là tốt nhưng cần sửa cách đo

Cụm:

> “0ms latency”

nên hiểu là:

> **optimistic local UI update**

chứ không phải hệ thống thực sự có latency bằng 0 ms.

UX tốt nên có trạng thái:

```
✓ Đã lưu
↻ Đang lưu
⚠ Chưa lưu
✕ Lưu thất bại
```

Nếu người dùng tick:

```
☑
```

mà network fail thì UI không thể tiếp tục giả vờ rằng dữ liệu đã được lưu.

Đây là một điểm **rất quan trọng đối với sổ theo dõi giáo viên**.

* * *

# 13\. Sticky header + 3 cột đầu

Đây là lựa chọn UX đúng cho ma trận rộng.

Tuy nhiên cần test trên:

```
40 học sinh × 20 cột
40 × 50
40 × 100
```

và đặc biệt:

```
horizontal scroll
+
vertical scroll
+
sticky header
+
sticky STT/Mã HS/Họ tên
```

Cần đảm bảo không xảy ra:

- text đè lên nhau;
- border bị mất;
- sticky column che checkbox;
- z-index sai;
- header lệch body;
- scroll giật.

* * *

# 14\. Export Selector

Cây:

```
BẢO HIỂM
 ├── Có/Không
 └── Ghi chú

BÁN TRÚ
 ├── Đăng ký
 └── Ghi chú

HỘI THAO
 ├── Cờ vua
 ├── Cờ tướng
 └── Kéo co
```

là UX tốt.

Nhưng modal cần thể hiện rõ:

```
[✓] BẢO HIỂM
    [✓] Có/Không
    [ ] Ghi chú

[✓] BÁN TRÚ
    [✓] Đăng ký
    [✓] Ghi chú
```

và tránh trạng thái mơ hồ:

> Parent được chọn nhưng không child nào được chọn.

Tôi đề nghị quy định:

```
Select parent
→ select all active children
```

và cho phép bỏ từng child.

* * *

# 15\. Một blocker quan trọng: Export phải snapshot dữ liệu

Có một race condition ít được nhắc tới:

```
Teacher đang chỉnh ô
        ↓
debounce chưa flush
        ↓
click Export
        ↓
Excel lấy DB state cũ
```

Kết quả:

> **màn hình hiển thị A nhưng Excel xuất B.**

Đây là lỗi nghiệp vụ nghiêm trọng.

Luồng đúng nên là:

```
Edit
 ↓
flush pending saves
 ↓
confirm persisted state
 ↓
create export snapshot
 ↓
generate XLSX
```

hoặc export engine phải làm việc trên một state snapshot đã bao gồm local pending changes.

**Tôi xếp C23 vào nhóm acceptance blocker.**

* * *

# 16\. Khả năng mở rộng

Thiết kế atomic record tốt hơn monolithic JSON cho concurrent update.

Nhưng với:

```
40 students
×
100 child columns
```

đã là:

```
4,000 records/activity
```

Nếu:

```
100 classes
×
20 activities
```

thì quy mô record tăng rất nhanh.

Do đó cần index ít nhất theo các access pattern thực tế:

```
(class_id, archived)
(parent_column_id)
(child_column_id, student_id)
```

và query:

```
getRecordsForColumns()
```

không nên thực hiện N+1 query.

* * *

# 17\. Migration

`migrate-composite-columns.mjs` cần thêm acceptance test:

### Before migration

```
old column
old column_records
```

### After migration

```
old column unchanged
old records unchanged
activity_config = null
```

Đặc biệt phải chứng minh:

```
migration chạy lần 2
```

không phá dữ liệu.

Tức là migration nên **idempotent**.

* * *

# 18\. Tôi đề nghị bổ sung bộ invariant thực sự

7 invariant hiện tại nên nâng thành:

### I8 — Database Uniqueness

Không có hai record cho cùng:

```
(child_column_id, student_id)
```

### I9 — Server Authorization

Không request nào được read/write/export dữ liệu ngoài class scope.

### I10 — Idempotent Save

Retry cùng payload không làm thay đổi kết quả ngoài lần đầu.

### I11 — Snapshot Export

Excel phải phản ánh persisted snapshot xác định.

### I12 — Immutable Historical Identity

Record lịch sử không phụ thuộc vào student code có thể thay đổi.

### I13 — Formula Safety

User text không được biến thành Excel formula ngoài chủ đích.

* * *

# 19\. Acceptance Gate tôi đề nghị

Đừng dùng:

> **Smoke Test = 100% → Approved**

Thay bằng:

```
TYPECHECK                  PASS
UNIT TEST                  PASS
CRUD TEST                  PASS
MIGRATION TEST             PASS
CONCURRENCY TEST           PASS
AUTHORIZATION TEST         PASS
CLASS ISOLATION TEST       PASS
ARCHIVE/RESTORE TEST       PASS
EXPORT SNAPSHOT TEST       PASS
XLSX VISUAL TEST           PASS
FORMULA INJECTION TEST     PASS
LARGE DATA TEST            PASS
UX REGRESSION TEST         PASS
```

Chỉ khi toàn bộ đạt mới:

> **APPROVED**

* * *

# 20\. Final Verdict

## `REQUEST_CHANGES`

### Không yêu cầu thay đổi kiến trúc nền tảng.

Kiến trúc:

```
Parent Activity
      ↓
Child Columns
      ↓
Atomic Records
      ↓
Composite Export
```

là hướng phù hợp.

**Không cần quay lại monolithic JSON.**

Nhưng trước khi nghiệm thu production, tôi yêu cầu bổ sung tối thiểu 6 nhóm sau:

1. **DB unique constraint + idempotent UPSERT**
2. **Server-side class authorization và cross-class isolation**
3. **Concurrent edit / Quick Fill / retry tests**
4. **Export snapshot sau khi flush pending saves**
5. **XLSX security: formula injection + Unicode/text safety**
6. **C01–C25 phải trở thành test case thực thi được, thay vì chỉ mô tả**

### Mức độ ưu tiên

**P0 — bắt buộc trước nghiệm thu**

- C03 — child khác class
- C05 — student khác class
- C24 — direct API authorization bypass
- C25 — truy cập activity của class khác
- C06/C11 — concurrent save
- C23 — export khi debounce chưa flush

**P1 — bắt buộc trước production rộng**

- archive/restore
- migration idempotency
- student identity
- Excel formula injection
- large dataset
- export formatting regression

**P2 — cải thiện UX**

- save status
- conflict indication
- export preview
- parent/child selection UX

* * *

## Kết luận nghiệm thu

**Kiến trúc: PASS có điều kiện.**

**Implementation evidence hiện tại: CHƯA ĐỦ để APPROVED.**

**Final Verdict: `REQUEST_CHANGES`**

Sau khi 6 nhóm P0 được kiểm thử và chứng minh đạt, tính năng có thể chuyển sang vòng nghiệm thu cuối thay vì phải thiết kế lại kiến trúc.

**END OF HANDOFF**