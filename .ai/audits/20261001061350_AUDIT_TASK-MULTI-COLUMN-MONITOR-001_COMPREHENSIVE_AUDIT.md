> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.Tôi sẽ audit theo đúng 4 nhóm rủi ro bạn yêu cầu, nhưng phân biệt rõ đã chứng minh bằng test với mới được mô tả trong handoff. Điểm đáng chú ý ngay: “Smoke Test 100%” chưa đủ để nghiệm thu một hệ thống có dữ liệu lịch sử, concurrent writes và phân quyền đa lớp.## KẾT QUẢ AUDIT ĐỘC LẬP

**Kết luận nghiệm thu: `REQUEST_CHANGES` — YÊU CẦU BỔ SUNG**

Lý do không phải vì kiến trúc hiện tại có sai sót hiển nhiên, mà vì với bằng chứng được cung cấp, **chưa đủ cơ sở để xác nhận an toàn ở mức production**, đặc biệt đối với **C01–C25, concurrent write, archive/history integrity và authorization enforcement phía backend**.

### 1\. Audit kiến trúc dữ liệu

| Hạng mục | Đánh giá | Nhận xét |
| --- | --- | --- |
| Giữ nguyên `columns` / `column_records` | 🟢 | Thiết kế tương thích ngược tốt |
| Parent → Child | 🟢 | Mô hình rõ ràng, dễ mở rộng |
| Atomic record | 🟢 | Tốt hơn JSON monolithic về merge/concurrency |
| Notes = child column | 🟢 | Đúng hướng, tránh special-case |
| Archive-first | 🟢 | Bảo toàn lịch sử tốt |
| Composite export độc lập | 🟢 | Coupling thấp |
| Child kế thừa scope | 🟡 | **Chưa đủ chứng cứ backend enforcement** |
| `id=${childColId}_${studentCode}` | 🟡 | Có nguy cơ collision/duplicate nếu assumption về studentCode thay đổi |

**Điểm cần đặc biệt kiểm tra:** `applicableScope` và `applicableStudentIds` không được chỉ kiểm tra ở UI hoặc lúc tạo child. Mọi mutation/query/export phải re-validate `class_id` và quyền người dùng tại server/service boundary.

* * *

# 2\. Counterexample C01–C25

Trong handoff hiện tại **không có nội dung cụ thể của bảng C01–C25**, vì vậy không thể trung thực kết luận rằng cả 25 case đã được chạy.

Smoke test:

> Typecheck 0 errors + CRUD parent/child + batch save 3 ô + query + cleanup

chỉ chứng minh **happy path cơ bản**.

Nó chưa chứng minh các trường hợp adversarial.

### Các counterexample bắt buộc phải có

| Nhóm | Counterexample cần kiểm |
| --- | --- |
| C01 | Tạo composite không có child |
| C02 | Xóa/archive parent khi còn child |
| C03 | Archive child nhưng parent vẫn active |
| C04 | Restore archived child |
| C05 | Thêm child vào parent đã archive |
| C06 | Child thuộc class A nhưng request giả mạo class B |
| C07 | Student không thuộc class nhưng gửi `studentCode` hợp lệ |
| C08 | Student chuyển lớp sau khi record đã tồn tại |
| C09 | Hai tab sửa cùng một ô |
| C10 | Hai người dùng sửa cùng một ô |
| C11 | Batch save thất bại giữa chừng |
| C12 | Retry request sau timeout |
| C13 | Double-click / duplicate batch request |
| C14 | Offline → online với dữ liệu stale |
| C15 | User mất quyền giữa lúc mở grid và lúc Save |
| C16 | Parent bị archive trong lúc export |
| C17 | Child bị archive trong lúc export |
| C18 | Đổi tên activity sau khi đã có historical records |
| C19 | Đổi thứ tự child columns |
| C20 | Thêm notes column sau khi đã có dữ liệu |
| C21 | Xóa logic notes column |
| C22 | Export chỉ một số child |
| C23 | Export activity có child archived |
| C24 | 2 activity có tên giống nhau |
| C25 | Restore/import dữ liệu cũ vào schema mới |

### Hai lỗi tiềm ẩn đáng chú ý

**A. Race condition vẫn chưa được chứng minh là đã triệt tiêu.**

Atomic records giúp giảm merge conflict, nhưng:

```
request A → read
request B → read
request A → write
request B → write
```

vẫn có thể gây **last-write-wins**.

Nếu business requirement là "không mất thay đổi của người dùng khác", cần optimistic concurrency/versioning hoặc conflict detection.

Ví dụ nên có:

```
record_version
updated_at
updated_by
```

và update theo kiểu:

```
UPDATE column_records
SET value = ?, version = version + 1
WHERE id = ?
  AND version = ?
```

Nếu affected rows = `0` → conflict.

**B. `childColId_studentCode` không phải composite identity hoàn hảo nếu `studentCode` không immutable.**

Nếu mã học sinh thay đổi/chuyển lớp/import lại dữ liệu, historical record có thể bị orphan hoặc mapping sai.

Nên cân nhắc:

```
record_id
column_id
student_id
class_id
value
version
created_at
updated_at
```

với unique constraint thích hợp:

```
UNIQUE(column_id, student_id)
```

thay vì phụ thuộc vào string ID ghép.

* * *

# 3\. Concurrent save / UX

### `0ms local latency + debounced batch save`

Đây là hướng UX tốt.

Nhưng **0ms latency chỉ là optimistic UI**, không phải "save thành công".

UI phải có ít nhất 4 trạng thái:

```
✓ Đã lưu
◷ Đang lưu
! Chưa đồng bộ
⚠ Xung đột
```

Không nên để giáo viên nhìn thấy checkbox đã tick nhưng không biết server đã ghi thành công hay chưa.

### Debounce cũng cần có giới hạn

Không nên chỉ:

```
debounce(500ms)
```

Mà nên có:

```
debounce
+
maximum wait
+
flush on navigation
+
flush on page unload
+
retry
+
idempotency
```

Ví dụ:

```
click
 ↓
local state update
 ↓
queue mutation
 ↓
debounce 300–500ms
 ↓
batch save
 ↓
server ACK
 ↓
mark synced
```

Nếu request thất bại:

```
pending → retry → failed
```

không được silently discard.

* * *

# 4\. Sticky header / sticky columns

Thiết kế **sticky 3 cột đầu** phù hợp với bảng ma trận lớn.

Tuy nhiên phải test thực tế:

- 40 học sinh
- 100 học sinh
- 200+ học sinh
- 10 child columns
- 30+ child columns
- activity có notes column
- nhiều activity cùng lúc

Đặc biệt phải tránh lỗi:

```
sticky column
+
horizontal scroll
+
sticky header
+
merged header
```

bị lệch `z-index`, border hoặc header không còn đồng bộ với body.

### UX nên có

```
STT | Mã HS | Họ tên | Bảo hiểm | Bán trú | Hội thao...
```

và khi cuộn ngang:

- Họ tên luôn nhìn thấy.
- Header hoạt động luôn nhìn thấy.
- Có indication rõ ràng rằng còn dữ liệu bên phải.

* * *

# 5\. Export Excel — MOET / hành chính

Ở đây cần phân biệt một điểm quan trọng:

**Một file Excel dùng làm "biểu mẫu theo phong cách hành chính" không đồng nghĩa với một văn bản hành chính theo đúng thể thức pháp lý.**

Nghị định 30/2020/NĐ-CP là văn bản hiện hành về công tác văn thư. [Chính Phủ Văn Bản](https://vanban.chinhphu.vn/default.aspx?docid=199378&pageid=27160&utm_source=chatgpt.com)

Các quy định về khổ A4, Unicode, lề và trình bày văn bản hành chính được quy định trong hệ thống thể thức văn bản; nguồn chính thức của Chính phủ nêu A4 210×297 mm và Unicode TCVN 6909:2001. [Chính Phủ Văn Bản+1](https://vanban.chinhphu.vn/default.aspx?docid=99777&pageid=27160&utm_source=chatgpt.com)

Vì vậy, nếu sản phẩm quảng bá là:

> **"Excel chuẩn biểu mẫu hành chính Bộ GD&ĐT"**

thì tôi khuyến nghị đổi cách mô tả thành:

> **"Excel theo bố cục biểu mẫu hành chính/giáo dục, có thể tùy chỉnh theo mẫu đơn vị."**

Trừ khi có **mẫu chính thức cụ thể của cơ quan ban hành** để đối chiếu.

### Những thứ export engine nên bắt buộc kiểm tra

**Header tầng 1**

```
BẢO HIỂM TAI NẠN
        ↓
      Có / Không
```

**Header tầng 2**

```
STT | Mã HS | Họ và tên | Bảo hiểm | Bán trú | Hội thao
                            ↓
                       Đăng ký | Ghi chú
```

Cần kiểm:

- merged ranges không overlap;
- không merge nhầm `STT/Mã HS/Họ tên`;
- child columns đúng parent;
- archived column không xuất ngoài ý muốn;
- thứ tự cột đúng UI;
- title override không làm mất activity identity;
- empty activity vẫn export hợp lệ;
- activity chỉ có notes vẫn export;
- Unicode tiếng Việt;
- wrap text;
- vertical/horizontal alignment;
- print area;
- landscape khi bảng rộng;
- repeat header khi in nhiều trang;
- freeze panes;
- page fit;
- row height;
- column width.

### Font

Nếu mục tiêu là biểu mẫu hành chính, cần xác minh **font thực tế trong XLSX**, không chỉ CSS/UI. Các quy định thể thức hành chính sử dụng bộ mã Unicode; các hướng dẫn thể thức cũng quy định cụ thể về cỡ chữ và trình bày Quốc hiệu/Tiêu ngữ. [Chính Phủ Văn Bản](https://vanban.chinhphu.vn/default.aspx?docid=99777&pageid=27160&utm_source=chatgpt.com)

Vì vậy test nên mở XLSX bằng Excel/LibreOffice và kiểm tra:

```
font.name
font.size
bold
alignment
border
mergeCells
pageSetup
printArea
```

* * *

# 6\. Dòng tổng cộng

Đây là một điểm tôi cho rằng **cần bổ sung trước nghiệm thu**.

"✓ / X" không nên chỉ là text presentation.

Ví dụ:

```
Bảo hiểm:
Có = 32
Không = 8
```

hoặc:

```
Bán trú:
Đăng ký = 25
Chưa đăng ký = 15
```

Nên có:

```
TỔNG CỘNG
```

và công thức/giá trị được xác định từ dataset xuất.

Quan trọng: **không hard-code tổng trong export service**.

* * *

# 7\. Security / authorization

Đây là phần tôi đánh giá nghiêm khắc nhất.

Invariant 7 hiện mô tả:

> Child bắt buộc kế thừa `class_id` từ parent.

Điều đó **chưa đủ**.

Phải kiểm tra chuỗi:

```
Authenticated User
       ↓
Permission
       ↓
Class authorization
       ↓
Parent authorization
       ↓
Child authorization
       ↓
Student authorization
       ↓
Record mutation
```

Không được cho phép:

http

```
POST /records/batch
{
  columnId: "class-A-column",
  studentCode: "student-B"
}
```

và server tin rằng client đã kiểm tra.

### Các request phải chống IDOR

Đặc biệt:

```
GET records
POST batch records
PATCH column
archive column
restore column
add child
export
```

Tất cả đều phải authorization phía server.

**Export là điểm rất dễ bị bỏ sót.**

Ví dụ user có quyền class A nhưng gửi:

```
columnIds = [
  "column-class-A",
  "column-class-B"
]
```

Nếu export service chỉ query theo `columnIds`, dữ liệu lớp B có thể bị xuất.

Phải enforce:

```
requestedColumn
      ↓
resolve parent
      ↓
resolve class
      ↓
authorize user
      ↓
only then query records
```

* * *

# 8\. Archive-first: cần bổ sung invariant

Archive là tốt, nhưng cần phân biệt:

```
archived
deleted
restored
historical
```

Tôi đề nghị tối thiểu:

```
archived_at
archived_by
```

và nếu restore:

```
restored_at
restored_by
```

Không nên chỉ:

```
archived = true
```

vì như vậy audit trail yếu.

Đặc biệt không được cho phép:

```
archive parent
→ tạo parent mới cùng semantic identity
→ historical data bị nhập nhằng
```

* * *

# 9\. Export selector

`export-column-selector-modal.tsx` là đúng hướng, nhưng cần một invariant UX:

### Selection phải hiểu được 3 trạng thái

```
☐ Activity
├── ☐ Field A
├── ☐ Field B
└── ☐ Notes
```

Nếu chọn parent:

```
☑ Activity
├── ☑ Field A
├── ☑ Field B
└── ☑ Notes
```

Nếu bỏ một child:

```
◐ Activity
├── ☑ Field A
├── ☐ Field B
└── ☑ Notes
```

Parent phải hiện trạng thái **indeterminate**, không chỉ checked/unchecked.

Đây là chi tiết UX nhỏ nhưng cực kỳ quan trọng khi có nhiều hoạt động.

* * *

# 10\. Bảng chấm audit tổng hợp

| Domain | Trạng thái |
| --- | --- |
| Backward compatibility | 🟢 |
| Data model | 🟢 |
| Parent/child architecture | 🟢 |
| Atomic records | 🟢 |
| Archive concept | 🟢 |
| Composite export architecture | 🟢 |
| Optimistic UX | 🟢 |
| Debounced save | 🟡 |
| Concurrent editing | 🔴 Chưa chứng minh |
| Retry/idempotency | 🔴 Chưa chứng minh |
| Conflict detection | 🔴 Chưa chứng minh |
| Cross-class authorization | 🔴 Chưa chứng minh |
| Export authorization | 🔴 Chưa chứng minh |
| Student/class integrity | 🟡 |
| Historical audit trail | 🟡 |
| MOET-style layout | 🟡 |
| Exact font/print configuration | 🟡 |
| 2-level merged header | 🟢 về thiết kế, chưa có artifact để kiểm chứng |
| C01–C25 | 🔴 Chưa cung cấp |
| Production readiness | 🟡 |

* * *

# FINAL VERDICT

## **REQUEST\_CHANGES**

Không nên đánh dấu `APPROVED` ở thời điểm này.

Không phải vì kiến trúc 7 invariants yếu — ngược lại, **kiến trúc nền tảng khá tốt và có tính mở rộng**. Vấn đề là bằng chứng nghiệm thu hiện tại mới chứng minh **CRUD + happy path**, chưa chứng minh các failure/security paths.

### Điều kiện để chuyển sang APPROVED

Tôi đề nghị bổ sung một **Production Acceptance Suite** tối thiểu:

```
1. C01–C25 đầy đủ
2. Concurrent write test
3. Duplicate/retry test
4. Offline/timeout test
5. Authorization matrix test
6. Cross-class IDOR test
7. Export authorization test
8. Archive/restore test
9. Student transfer test
10. XLSX structural validation
11. XLSX visual validation
12. 40 / 100 / 200+ student stress test
13. 30+ child-column test
14. Regression test cho legacy columns
15. Audit log verification
```

Và đặc biệt phải có test kiểu:

```
User A → Class A
User B → Class B

A cố:
GET B records
POST B record
PATCH B column
ARCHIVE B column
EXPORT B column
MIX A+B column IDs

Expected:
401/403 hoặc empty authorized result
ZERO data leakage
ZERO unauthorized mutation
```

Nếu toàn bộ suite này pass, khi đó tuyên bố **APPROVED** sẽ có cơ sở kỹ thuật vững hơn rất nhiều so với chỉ dựa vào smoke test 100%.

**Mức đánh giá hiện tại:** kiến trúc **có triển vọng production**, nhưng **chưa đủ evidence để nghiệm thu production**.

[Nghị định 30/2020/NĐ-CP — Công tác văn thư](https://vanban.chinhphu.vn/default.aspx?docid=199378&pageid=27160&utm_source=chatgpt.com)  
[Thông tư 01/2011/TT-BNV — thể thức và kỹ thuật trình bày văn bản hành chính](https://vanban.chinhphu.vn/default.aspx?docid=99777&pageid=27160&utm_source=chatgpt.com)

END OF HANDOFF