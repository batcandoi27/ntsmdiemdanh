---
type: review
task_id: TASK-SCHOOL-MATRIX-TIMETABLE-BATCH-IMPORT-EXPORT
created_at: 2026-09-06T03:43:39.714Z
model: chatgpt-web/luna
bridge_endpoint: http://127.0.0.1:17841/v1/responses
---

⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dựa trên handoff và bằng chứng kiểm thử đã cung cấp, tôi đánh giá thiết kế này **đạt mức kiến trúc tốt và có bằng chứng chức năng khá mạnh**, nhưng **chưa đủ bằng chứng để gọi là production-grade APPROVED tuyệt đối** ở các điểm liên quan đến transaction/concurrency và isolation theo năm học.

## 1\. Architecture & Separation of Concerns — **PASS**

Phân lớp hiện tại là hợp lý:

- `school-matrix-timetable-parser.ts` chịu trách nhiệm **XLSX → domain model**.
- `school-matrix-timetable-exporter.ts` chịu trách nhiệm **domain model → XLSX**.
- `timetable-service.ts` chịu trách nhiệm **persist/batch operation + provisioning**.
- `timetable-import-modal.tsx` chỉ đảm nhiệm **interaction + preview**.
- `timetable-tab.tsx` là lớp orchestration của màn hình Settings.

Điểm đáng khen nhất là parser/exporter được tách khỏi UI. Điều này giúp:

- test parser độc lập;
- test roundtrip độc lập với React;
- tái sử dụng engine cho import/export khác;
- tránh đưa logic XLSX vào component.

Mô hình `SÁNG` + `CHIỀU` → một `WeekSchedule` cũng là abstraction đúng: domain model không nên phụ thuộc trực tiếp vào layout Excel.

**Đánh giá: 9/10.**

### Một điểm cần kiểm tra thêm

Không có source code thực tế trong handoff nên tôi chưa thể xác nhận rằng UI thực sự không chứa business logic, hoặc exporter có phụ thuộc ngược vào UI/domain presentation hay không.

* * *

## 2\. DB Safety & Multi-Year Auto-Provisioning — **PASS có điều kiện**

Đây là phần tôi quan tâm nhất.

Flow:

> detect class → determine grade → provision class với `year_id` hiện hành → disable timetable cũ → save timetable mới

là đúng hướng.

Đặc biệt, việc `9A15` được tạo với:

- `grade = 9`
- `year_id = current year`

là rất quan trọng. **Không nên provision class vào một bảng/global scope mà không gắn năm học**, vì sẽ tạo dữ liệu xuyên năm.

### Tuy nhiên, có 4 invariant phải được đảm bảo ở tầng DB/service

**1\. Auto-provision phải idempotent**

Nếu import cùng file hai lần:

```
9A15 không được tạo thành 2 records.
```

Phải có unique/business key phù hợp, ví dụ về mặt logic:

```
(year_id, class_name)
```

hoặc constraint tương đương.

**2\. Disable + insert phải atomic**

Không nên có trạng thái:

```
disable old timetable
    ↓
insert new timetable FAILED
    ↓
school has no active timetable
```

Toàn bộ batch nên nằm trong **một transaction** nếu backend/database stack hỗ trợ.

**3\. Concurrency**

Hai admin cùng import một file gần như đồng thời phải không tạo:

- duplicate class;
- duplicate active timetable;
- hai batch cùng được đánh dấu active.

Đây là điểm mà `typecheck` và roundtrip test **không chứng minh được**.

**4\. Year isolation**

Cần xác nhận service không vô tình dùng:

```
class_name = "9A15"
```

để lookup class mà bỏ qua `year_id`.

Đúng phải là logic tương đương:

```
find class "9A15" IN current academic year
```

chứ không phải:

```
find any class named "9A15"
```

### Verdict cho lớp này

**Kiến trúc: PASS.  
Production safety: CONDITIONAL PASS.**

Nếu transaction + unique constraint + concurrency/idempotency đã có trong implementation, tôi sẽ nâng lên **9/10**. Nếu chưa có, đây là nhóm thay đổi tôi yêu cầu trước production.

* * *

## 3\. UX/UI & Edge Cases — **PASS**

Dashboard preview là một lựa chọn UX rất tốt.

Việc hiển thị ngay:

> **50 lớp · 1.677 tiết · 27 môn**

giúp admin xác nhận rằng file đã được đọc đúng trước khi mutation database xảy ra.

Các điểm tốt:

- drag & drop;
- preview trước import;
- search class;
- xem Monday → Saturday;
- phân biệt Sáng/Chiều;
- hiển thị lớp mới;
- explicit action `"Nhập Hàng Loạt Vào Hệ Thống"`.

Đặc biệt, **preview trước destructive/write operation** là đúng UX cho nghiệp vụ quản trị trường học.

### Những edge case tôi muốn thấy được xử lý

- File không có `SÁNG`.
- File không có `CHIỀU`.
- Sheet name sai casing hoặc có whitespace.
- File Excel rỗng.
- Class block bị thiếu ngày.
- Một tiết không có môn.
- Môn không nằm trong alias dictionary.
- Một lớp xuất hiện hai lần.
- File có duplicate timetable cells.
- File rất lớn.
- Người dùng đóng modal giữa lúc import.
- Import thất bại sau khi đã provision một phần.
- User click nút Import nhiều lần.

Nếu các trường hợp trên đã có test/runtime guard thì UX layer rất ổn.

**Đánh giá: 8.5/10.**

* * *

## 4\. Resilience & Fallback — **PASS**

Parser có hai lớp xử lý:

```
Matrix Excel
   ↓
SÁNG + CHIỀU
   ↓
WeekSchedule
```

và fallback:

```
Flat List
   ↓
normalize
   ↓
WeekSchedule
```

Đây là một quyết định tốt.

Bảng `SUBJECT_ALIASES` cũng phù hợp với dữ liệu thực tế trường học. Ví dụ:

```
Văn học → Ngữ văn
LS&ĐL → Lịch sử và Địa lý
Nhạc → Âm nhạc
```

giúp domain data không bị phân mảnh chỉ vì cách viết trong Excel.

### Nhưng có một rủi ro quan trọng

**Không nên silently normalize mọi unknown subject thành một subject gần nhất.**

Có thể phân biệt:

```
known alias
    → normalize tự động

unknown subject
    → giữ nguyên + warning
```

Thay vì:

```
unknown subject
    → đoán
    → import
```

Với dữ liệu thời khóa biểu, **false positive nguy hiểm hơn false negative**. Một môn bị nhận diện sai vẫn có thể tạo ra dữ liệu "hợp lệ" nhưng sai nghiệp vụ.

Tôi khuyến nghị preview có:

```
27 môn chuẩn hóa
0 môn chưa nhận diện
0 cảnh báo
```

và nếu có warning:

```
⚠ 2 môn chưa nhận diện
```

trước khi cho phép import hoặc yêu cầu admin xác nhận.

**Đánh giá: 8.5/10.**

* * *

# 5\. Export → Import Roundtrip

Đây là bằng chứng mạnh nhất trong handoff.

Bạn đã chứng minh:

```
Import original
      ↓
domain data
      ↓
Export XLSX
      ↓
Import exported XLSX
      ↓
same classes + same lessons
```

và kết quả:

> **Roundtrip Fidelity PASS**

Điều này xác nhận rất tốt rằng parser và exporter đang chia sẻ một semantic model nhất quán.

Tuy nhiên, "100% data fidelity" nên được hiểu chính xác là **domain-data fidelity**, không nhất thiết là **byte/layout fidelity**.

Hai file XLSX có thể khác:

- style IDs;
- merged-cell internals;
- XML ordering;
- workbook metadata;

nhưng vẫn có cùng timetable.

Vì vậy acceptance criterion tốt hơn là:

```
Domain Roundtrip Fidelity = 100%
```

còn "100% chuẩn mẫu trường" nên có thêm fixture/snapshot test về layout nếu đó là requirement bắt buộc.

* * *

# 6\. TypeScript Typecheck

`npx tsc --noEmit` → **0 errors** là cần thiết và đáng ghi nhận.

Nhưng nó chỉ chứng minh:

> code hợp lệ về mặt TypeScript types.

Nó **không chứng minh**:

- DB transaction safety;
- duplicate handling;
- concurrency;
- malformed Excel behavior;
- permission/security;
- React runtime behavior;
- production bundle behavior.

Do đó không nên dùng typecheck làm bằng chứng cho DB correctness.

* * *

# Acceptance Matrix

| Layer | Assessment | Verdict |
| --- | --- | --- |
| Architecture | Tách parser/exporter/service/UI tốt | ✅ PASS |
| Matrix parsing | 50/50 classes, 1,677/1,677 lessons | ✅ PASS |
| Subject normalization | Có alias + fallback | ✅ PASS |
| Export | 2-sheet school format | ✅ PASS |
| Roundtrip | 100% domain fidelity theo evidence | ✅ PASS |
| UX preview | Strong, appropriate for admin workflow | ✅ PASS |
| Auto-provisioning | Đúng hướng, year-scoped | ⚠️ CONDITIONAL |
| Transaction safety | Chưa có evidence | ⚠️ VERIFY |
| Idempotency | Chưa có evidence | ⚠️ VERIFY |
| Concurrency | Chưa có evidence | ⚠️ VERIFY |
| Malformed-file resilience | Có thiết kế fallback nhưng thiếu test evidence | ⚠️ VERIFY |
| Type safety | `tsc --noEmit` sạch | ✅ PASS |

* * *

# Kết luận nghiệm thu

### **VERDICT: APPROVED WITH CONDITIONS**

Tôi **không chọn `REQUEST_CHANGES` cho kiến trúc tổng thể**. Thiết kế hiện tại đủ tốt để coi là một implementation có chất lượng và bằng chứng chức năng rất thuyết phục.

Tuy nhiên, tôi cũng **chưa cấp APPROVED tuyệt đối cho production** chỉ dựa trên handoff này.

Ba acceptance gate cuối cùng cần được xác nhận:

1. **Batch import atomic transaction** — lỗi giữa batch không được để DB ở trạng thái nửa cũ/nửa mới.
2. **Idempotency + DB uniqueness** — import lại hoặc concurrent import không tạo duplicate class/timetable.
3. **Strict year isolation** — mọi lookup/provision/update timetable phải được scope theo `year_id`.

Nếu ba điều này **đã thực sự được enforce trong `timetable-service.ts` và DB constraints**, verdict của tôi chuyển thành:

> **✅ APPROVED — Production Ready**

Nếu chưa, tôi khuyến nghị sửa đúng ba điểm trên trước khi release, thay vì mở rộng scope sang refactor kiến trúc.

**Tổng thể: ~8.8/10.**  
Phần parser/exporter + roundtrip là điểm mạnh; **transactional integrity và concurrency là rủi ro còn lại đáng quan tâm nhất.**

Lưu ý: đây là **independent architectural review dựa trên source/evidence được mô tả trong handoff**; trong ngữ cảnh hiện tại tôi không có nội dung thực tế của các file `.ts/.tsx` để xác minh từng implementation detail.