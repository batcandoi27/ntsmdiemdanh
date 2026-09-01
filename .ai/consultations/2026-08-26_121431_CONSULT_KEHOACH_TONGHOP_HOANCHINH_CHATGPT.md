⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# Thẩm định Senior Architect: **PHÊ DUYỆT CÓ ĐIỀU KIỆN**

Kế hoạch **đúng hướng, có tính khả thi và có tư duy Product/Operation tốt**. Tuy nhiên, để đạt chuẩn production, tôi **không khuyến nghị code toàn bộ Phase 1 theo đúng thứ tự hiện tại**. Cần bổ sung một **Phase 0 — Data & Trust Foundation** nhỏ trước, vì các chức năng như điểm danh, nghỉ phép, QR token và thanh toán đều phụ thuộc vào tính đúng đắn của identity + authorization + audit.

## 1\. Sanity Check tổng thể

| Hạng mục | Đánh giá | Nhận xét |
| --- | --- | --- |
| Kiến trúc 3 Phase | ✅ Tốt | Foundation → Automation → AI là thứ tự hợp lý |
| GVCN 360 / Timeline | ✅ Khả thi | Nên xây làm nguồn dữ liệu trung tâm |
| Leave → Attendance | ⚠️ Cần khóa transaction | Không được chỉ cập nhật UI/bảng điểm danh |
| QR Parent Portal | ⚠️ Rủi ro cao | Token không nên đồng nghĩa với quyền truy cập |
| VietQR | ✅ Khả thi | Cần tách `payment_intent` khỏi `bank_transaction` |
| SePay webhook | ⚠️ Cần idempotency | Webhook có thể retry/duplicate/out-of-order |
| AI Phase 3 | ✅ Khả thi | Chỉ nên triển khai sau khi dữ liệu đủ sạch |
| Tỷ lệ nhập lại <10% | 🟡 Có thể đạt | Phải thiết kế domain event ngay từ đầu |
| Booklet/Sổ chủ nhiệm | 🟡 Khả thi | Cần version hóa template theo năm học/quy định |
| Closed-loop PH ↔ GVCN | ✅ Rất tốt | Đây nên là nguyên tắc kiến trúc, không chỉ UX |

**Điểm tôi đặc biệt đồng ý:** `/homeroom` và `/portal` không nên là hai hệ thống độc lập. Chúng phải là **hai projection/UI trên cùng một domain model**.

* * *

# 2\. Kiến trúc nên chốt trước khi code

Nên tư duy theo chuỗi:

**Student Identity → Domain Events → Current State → Timeline → Action Center → Parent Portal**

Ví dụ:

`StudentAbsent`  
→ cập nhật Attendance  
→ Risk Radar tính lại  
→ tạo Action cho GVCN  
→ phụ huynh thấy Today Pulse.

Tương tự:

`LeaveApproved`  
→ Attendance chuyển `P`  
→ ghi Audit Log  
→ Timeline thêm event  
→ Today Pulse cập nhật.

### Các entity/domain tối thiểu

Nên có canonical ID cho:

- `Student`
- `Parent / Guardian`
- `ParentStudentRelation`
- `Class / SchoolYear`
- `AttendanceRecord`
- `LeaveRequest`
- `BehaviorEvent`
- `Achievement`
- `HomeroomNote`
- `ParentMessage / CollaborationCase`
- `Notification`
- `PaymentIntent`
- `PaymentTransaction`
- `AuditLog`
- `PortalAccessToken`

**Nguyên tắc quan trọng:** không để `/homeroom` tự tạo một bộ dữ liệu học sinh riêng và `/portal` lại tạo bộ khác.

* * *

# 3\. Những risk/edge case bắt buộc xử lý

## 🔴 A. Duyệt phép và điểm danh — race condition

Đây là điểm cần đặc biệt nghiêm túc.

Ví dụ:

1. GVCN đang duyệt đơn nghỉ.
2. Giáo viên bộ môn đồng thời cập nhật học sinh thành `Absent`.
3. Transaction duyệt phép chạy sau.
4. Kết quả cuối cùng có thể là `P`, nhưng audit lại không rõ ai thay đổi.

### Khuyến nghị

`LeaveRequest` không nên trực tiếp "ghi đè" attendance.

Dùng state machine:

`PENDING → APPROVED → APPLIED`

và:

`PENDING → REJECTED`

Khi `APPROVED → APPLIED`, hệ thống tạo một **attendance adjustment** có:

- actor
- timestamp
- reason
- source = `LEAVE_REQUEST`
- reference ID = leave request
- before/after value.

Database transaction phải đảm bảo operation là **atomic**.

Đồng thời nên có unique constraint kiểu:

`(student_id, attendance_date, session)`

để không tồn tại hai bản ghi điểm danh chính thức cho cùng một phiên.

* * *

## 🔴 B. QR Token 32 ký tự

**Không nên hiểu "token 32 ký tự" = bảo mật.**

Nếu token có entropy thấp, bị đoán, bị log hoặc bị chụp ảnh, người khác có thể truy cập.

Nên:

- token cryptographically random;
- token **không chứa student ID/email/phone**;
- lưu **hash của token**, không nhất thiết lưu plaintext;
- có cơ chế revoke/rotate;
- giới hạn rate;
- audit access;
- token chỉ xác định **scope**, không cấp quyền admin;
- tuyệt đối không trả dữ liệu của học sinh khác nếu sửa URL/ID thủ công.

### Quan trọng nhất

**QR token nên là credential để bootstrap access, không phải authorization model.**

Authorization vẫn phải kiểm tra:

`Parent → ParentStudentRelation → Student`

và mọi query phải được scope theo student mà principal được phép xem.

* * *

# 4\. SePay: cần thiết kế chống duplicate ngay từ đầu

Không được viết logic kiểu:

`Webhook received → update invoice = paid`

Vì webhook có thể:

- gửi lại;
- đến hai lần;
- đến không đúng thứ tự;
- transaction ngân hàng có nội dung giống nhau;
- webhook timeout nhưng thực tế server đã xử lý thành công.

### Nên có

`PaymentTransaction`

với một `provider_transaction_id`/external identifier có **unique constraint**.

Flow:

`Webhook`  
→ validate signature/source  
→ persist raw event  
→ idempotency check  
→ match payment intent  
→ transactionally update payment state  
→ emit `PaymentConfirmed`  
→ generate receipt.

**Không dùng số tiền + nội dung chuyển khoản làm unique key.**

Ngoài ra cần xử lý:

- chuyển thừa;
- chuyển thiếu;
- một giao dịch trả nhiều khoản;
- cùng một học sinh có nhiều invoice;
- refund/reversal;
- giao dịch không match;
- webhook đến trước khi invoice được tạo.

* * *

# 5\. Risk Radar: tránh biến "AI-looking" thành black box

Phase 1 nên dùng **rule-based scoring**, chưa cần AI.

Ví dụ:

`RiskScore = absence + lateness + discipline + academic_signal`

Nhưng UI phải giải thích được:

> 🔴 Nguyễn A — High Risk  
> • 3 lần vắng không phép / 2 tuần  
> • 2 lần đi muộn  
> • 1 vi phạm nề nếp

Chứ không nên:

> "AI đánh giá học sinh có nguy cơ cao."

**Explainability > sophistication.**

Sau này Phase 3 mới dùng ML/LLM để bổ sung insight.

* * *

# 6\. Closed-loop nên được biến thành Domain Event

Đây là chìa khóa để đạt mục tiêu nhập lại <10%.

Ví dụ:

`LeaveApproved`

có thể fan-out:

- Attendance projection
- Student Timeline
- GVCN Action Center
- Parent notification
- Today Pulse

Tương tự:

`BehaviorRecorded`  
→ Student Timeline  
→ Risk Radar  
→ notification nếu policy yêu cầu.

Như vậy **một lần nhập → nhiều nơi tự cập nhật**, thay vì frontend gọi hàng loạt API cập nhật thủ công.

* * *

# 7\. Phase 1 nên thực thi theo thứ tự này

### Phase 0 — Trust Foundation

**Không cần xây UI lớn.**

Chốt trước:

1. Student/Parent/Class identity.
2. School year + class membership.
3. Authorization/RBAC.
4. Database constraints.
5. Audit log.
6. Domain event conventions.
7. Portal token model.
8. Notification abstraction.
9. API error/idempotency conventions.

### Phase 1A — Student 360 + Attendance

Làm:

- Student 360
- attendance canonical model
- timeline
- behavior/achievement events
- audit.

### Phase 1B — GVCN Command Center

Sau khi dữ liệu nền ổn:

- Today Command Center
- Risk Radar rule engine
- Quick Capture
- 1-click actions.

### Phase 1C — Leave Workflow

`Parent submit → GVCN approve → Attendance apply → Audit → Notification`

Đây là **vertical slice production đầu tiên** tôi ưu tiên.

### Phase 1D — Portal

Sau khi identity/authorization ổn:

- QR bootstrap
- Today Pulse
- leave request
- notification.

### Phase 1E — VietQR

Chỉ làm **payment intent + manual confirmation** trước.

SePay webhook có thể để Phase 2 như kế hoạch hiện tại.

* * *

# 8\. Definition of Done cho Phase 1

Không nên nghiệm thu chỉ vì UI chạy.

Phase 1 chỉ nên được coi là done khi có các invariant:

-  Một học sinh có canonical identity duy nhất.
-  Parent chỉ đọc được student mà mình được phép truy cập.
-  QR token bị revoke thì không truy cập được nữa.
-  Mỗi attendance slot có tối đa một authoritative record.
-  Approve leave là idempotent.
-  Hai request approve đồng thời không tạo hai side effects.
-  Mọi thay đổi quan trọng có audit trail.
-  Timeline phản ánh được nguồn gốc thay đổi.
-  Notification failure không làm transaction nghiệp vụ chính thất bại.
-  Payment webhook xử lý duplicate an toàn.
-  Có integration test cho leave → attendance.
-  Có authorization test chống IDOR.
-  Có test timezone/ngày học.
-  Có backup/restore strategy.

* * *

# 9\. Một số điều chỉnh cho Phase 2–3

### Phase 2

**Seat Optimizer** nên là constraint solver/rule engine trước, không cần AI.

**Handbook 35 tuần:** tuyệt đối không hard-code "35" vào business logic. Nên có:

`AcademicYear → Term → Week → TemplateVersion`

vì năm học, cấp học và biểu mẫu có thể thay đổi.

**Export:** tạo từ canonical data snapshot để tránh trường hợp dữ liệu thay đổi giữa lúc generate các trang.

### Phase 3

AI chỉ nên đọc từ **read models đã được kiểm soát quyền**.

Đặc biệt:

> GVCN hỏi "Ai vắng không phép nhiều nhất?"

LLM **không được tự suy luận từ raw database**. Nó nên gọi một tool/query có authorization và trả về structured result, rồi mới diễn giải.

Parent AI càng phải nghiêm ngặt hơn:

**Parent A tuyệt đối không được inference hoặc retrieve thông tin của Student B.**

* * *

# 10\. Verdict

### 🟢 Tôi **phê duyệt kiến trúc và roadmap**, nhưng với 5 điều kiện bắt buộc:

1. **Thêm Phase 0 — Trust/Data Foundation.**
2. **Canonical Student Identity** là nguồn dữ liệu duy nhất.
3. **Domain events + audit trail** phải xuất hiện từ Phase 1.
4. **Authorization và QR security** phải được thiết kế trước UI Portal.
5. **Payment/Leave phải idempotent + transactional**, không xử lý kiểu CRUD đơn thuần.

Nếu thực hiện đúng các điểm trên, roadmap này có thể phát triển thành một **GVCN Operating System + Parent Collaboration Hub thực sự**, thay vì chỉ là hai dashboard có nhiều tính năng.

**Ưu tiên code đầu tiên:** `Student Identity → Attendance domain → Leave state machine → authorization → audit → vertical slice Leave → Attendance → Parent/GVCN notification`. Đây là đường ngắn nhất để chứng minh toàn bộ triết lý **"nhập một lần → liên thông → hành động → phản hồi → lưu lịch sử"** trước khi mở rộng sang các module còn lại.