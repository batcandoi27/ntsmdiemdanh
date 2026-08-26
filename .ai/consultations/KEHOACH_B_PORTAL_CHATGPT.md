⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# Thẩm định & Chỉ thị Kế hoạch B cho Cổng Phụ huynh `/portal`

## 1\. Kết luận điều hành

**Kế hoạch A đúng hướng, nhưng chưa đủ “đột phá”.**

A đang giải quyết rất tốt các nhu cầu giao dịch:

> **Xem → Gửi → Xin → Đóng tiền → Nhận thông báo**

Nhưng một Portal phụ huynh thực sự có giá trị phải tiến thêm một tầng:

> **Hiểu con → Phối hợp với GVCN → Hành động đúng lúc → Theo dõi kết quả → Xây dựng niềm tin**

Điểm tôi sẽ thay đổi lớn nhất là **không biến `/portal` thành một “siêu app trường học” với thật nhiều menu**. Đây là cái bẫy thường gặp.

Thay vào đó, hãy xây `/portal` như một **“Parent–Teacher Collaboration System”**: hệ thống phối hợp giữa gia đình và GVCN, trong đó mọi dữ liệu đều dẫn tới một hành động cụ thể.

* * *

# 2\. Phản biện Kế hoạch A

## 2.1. Nỗi đau lớn nhất không phải là thiếu tính năng

Các nền tảng như eNetViet, VnEdu Connect hay các sổ liên lạc điện tử đã khiến phụ huynh quen với việc:

- xem điểm;
- xem chuyên cần;
- nhận thông báo;
- đóng các khoản phí;
- đọc nhận xét.

Vấn đề sâu hơn là **information overload nhưng action clarity thấp**.

Phụ huynh có thể nhận rất nhiều thông tin nhưng vẫn không biết:

> “Con tôi hôm nay có vấn đề gì không?”  
> “Tôi cần làm gì?”  
> “Giáo viên đã xử lý chưa?”  
> “Tình hình có tiến bộ không?”

Do đó, KPI quan trọng của `/portal` không nên chỉ là:

**DAU / số lần đăng nhập / số lượt xem.**

Mà nên bổ sung:

### `Time-to-Understand`

Thời gian để phụ huynh hiểu được tình hình của con.

### `Time-to-Action`

Thời gian từ khi có vấn đề đến khi phụ huynh thực hiện hành động.

### `Parent Response Rate`

Tỷ lệ phụ huynh phản hồi khi GVCN cần phối hợp.

### `Issue Resolution Rate`

Tỷ lệ vấn đề được đóng vòng từ:

**Phát hiện → Thông báo → Phụ huynh phối hợp → GVCN xử lý → Kết quả.**

* * *

# 3\. Vấn đề lớn nhất của Kế hoạch A

## A1. Zero-friction Access: Đúng, nhưng phải thiết kế lại security

QR trên thẻ học sinh là một ý tưởng rất tốt.

Nhưng:

**QR không nên chứa thông tin định danh nhạy cảm hoặc trở thành “chìa khóa vĩnh viễn”.**

Nên dùng:

`QR → short-lived token → xác minh → parent session`

và có thể bổ sung:

- thiết bị đã tin cậy;
- OTP khi đăng nhập lần đầu;
- revoke session;
- giới hạn thời gian/token;
- audit log.

### Số điện thoại phụ huynh

Cũng nên hỗ trợ, nhưng **không dùng số điện thoại đơn thuần làm authentication**.

Luồng nên là:

`SĐT đã đăng ký → OTP → chọn/hiển thị các con được phép truy cập`

Điều này đặc biệt quan trọng với phụ huynh có **2–3 con trong cùng trường**.

* * *

# 4\. Killer Feature #1 — “Hôm nay con thế nào?”

Đây mới là **Home Screen quan trọng nhất**.

Thay vì mở Portal và nhìn thấy một dashboard đầy số liệu:

```
Học sinh: Nguyễn Văn A
Chuyên cần: 96%
P: 3 | K: 1 | T: 0 | VP: 1
```

hãy biến nó thành:

> ## Hôm nay của Minh
> 
> 🟢 **Đi học đầy đủ**
> 
> 📚 Học tập: Bình thường  
> 😊 Nề nếp: Tốt  
> 📝 GVCN: Chưa có vấn đề cần phối hợp
> 
> **Không có việc gì bạn cần xử lý hôm nay.**

Nếu có vấn đề:

> 🔴 **Minh cần bạn phối hợp**
> 
> Hôm nay Minh đi học muộn 18 phút.
> 
> GVCN đề nghị gia đình trao đổi về việc đi học đúng giờ.
> 
> **\[Đã đọc\] \[Trao đổi với GVCN\]**

Đây là khác biệt rất lớn.

**Portal không chỉ hiển thị dữ liệu. Portal phải diễn giải dữ liệu thành trạng thái của đứa trẻ.**

* * *

# 5\. Killer Feature #2 — “Parent Action Center”

Mỗi phụ huynh có một inbox công việc:

## Việc cần làm

- 🔴 Xác nhận đơn xin nghỉ của ngày 24/08
- 🟡 Trả lời khảo sát chuyến dã ngoại
- 🟡 Xác nhận đã đọc nhận xét tháng
- 🟢 Khoản thu A — đã thanh toán
- 🟢 Tin nhắn GVCN — đã xử lý

Mục tiêu:

> **Mở Portal lên là biết ngay mình phải làm gì.**

Không phải tìm trong 7 tab.

* * *

# 6\. Killer Feature #3 — “Incident → Collaboration → Resolution”

Đây là tính năng tôi đánh giá **có giá trị chiến lược nhất** đối với module GVCN.

Ví dụ:

### GVCN phát hiện

> “Học sinh đi muộn 3 lần trong tuần.”

GVCN tạo một **Case**:

```
CASE #2026-00125
Vấn đề: Đi học muộn
Mức độ: Cần phối hợp
```

Portal phụ huynh nhận:

> **GVCN muốn phối hợp với gia đình**
> 
> Minh đã đi học muộn 3 lần trong tuần này.
> 
> Bạn có thể chia sẻ nguyên nhân để GVCN hỗ trợ Minh.

### Phụ huynh

> “Gia đình đang thay đổi giờ đưa đón.”

### GVCN

> “Đã hiểu. Cô sẽ theo dõi thêm trong tuần này.”

### Một tuần sau

System tự tạo:

> **Kết quả phối hợp**
> 
> Minh đã đi học đúng giờ 5/5 ngày.
> 
> 🎉 Vấn đề đã được giải quyết.

Đây là thứ mà một “app xem điểm” không làm được.

* * *

# 7\. Killer Feature #4 — Leave Request, nhưng phải là Workflow Engine

Kế hoạch A:

`Parent → Xin nghỉ → GVCN duyệt → P`

Tốt, nhưng cần thêm **state machine**.

```
DRAFT
  ↓
SUBMITTED
  ↓
TEACHER_REVIEW
  ↓
APPROVED / REJECTED
  ↓
ATTENDANCE_APPLIED
  ↓
CLOSED
```

Không nên để frontend trực tiếp:

```
attendance.status = "P"
```

khi phụ huynh gửi đơn.

### Quan trọng nhất

Khi GVCN duyệt:

**Leave Request không “ghi đè” Attendance một cách mù quáng.**

Phải kiểm tra:

- học sinh có điểm danh chưa;
- giáo viên bộ môn đã điểm danh chưa;
- ngày đó có phải ngày học;
- đã có trạng thái khác hay chưa;
- ai là người duyệt;
- thời điểm duyệt.

Sau đó mới tạo **attendance adjustment/audit event**.

Ví dụ:

```
Attendance
    |
    +-- original_status = "VP"
    |
    +-- adjusted_status = "P"
    |
    +-- reason = "Approved leave request"
    |
    +-- approved_by = GVCN
    |
    +-- approved_at = ...
```

**Auditability là bắt buộc.**

* * *

# 8\. Killer Feature #5 — Smart Payment

Kế hoạch A về VietQR là đúng.

Nhưng tôi không khuyến nghị biến Portal thành hệ thống kế toán hoàn chỉnh ngay Phase 1.

Nên xây theo mô hình:

```
FEE
 ↓
PAYMENT_INTENT
 ↓
VietQR
 ↓
BANK TRANSFER
 ↓
PARENT SUBMITS PROOF
 ↓
TEACHER / FINANCE VERIFY
 ↓
RECEIPT
```

Quan trọng là **idempotency**.

Nếu phụ huynh bấm:

> “Tôi đã chuyển khoản”

3 lần thì không được tạo 3 payment claims.

Mỗi khoản phải có:

`payment_intent_id`

và trạng thái rõ ràng:

```
UNPAID
PENDING_VERIFICATION
VERIFIED
REJECTED
REFUNDED
```

* * *

# 9\. Killer Feature #6 — “Evidence-based Parent Communication”

Thay vì chat tự do 100%, nên có **conversation có ngữ cảnh**.

Ví dụ phụ huynh không gửi:

> “Cô ơi cho hỏi tình hình học tập của cháu?”

Mà Portal gợi ý:

> **Trao đổi về học tập**
> 
> Môn: Toán  
> Tuần: 3  
> Nội dung: ...
> 
> `[Gửi GVCN]`

Hoặc:

> **Trao đổi về chuyên cần**
> 
> “Tôi muốn hỏi về lần nghỉ ngày 18/08.”

Conversation được liên kết với entity:

```
student_id
case_id
attendance_id
leave_request_id
fee_id
poll_id
```

Nhờ vậy GVCN không phải lục lại lịch sử để hiểu phụ huynh đang nói về việc gì.

* * *

# 10\. Killer Feature #7 — Parent Pulse

Khảo sát không nên chỉ là:

> “Bạn có tham gia dã ngoại không?”

Hãy cho GVCN khả năng tạo:

- Poll;
- Survey;
- Acknowledgement;
- Consent;
- Quick feedback.

Ví dụ:

> **Khảo sát nhanh**
> 
> Con bạn có gặp khó khăn khi học ở nhà trong tuần này không?
> 
> ○ Không  
> ○ Một chút  
> ○ Có, cần nhà trường hỗ trợ

Nếu chọn “Có”:

> **Bạn muốn GVCN liên hệ?**
> 
> `[Có] [Chưa cần]`

Đây là cách biến khảo sát thành **early-warning system**.

* * *

# 11\. Killer Feature #8 — “Growth Timeline”

Tôi sẽ thay thế tư duy:

> **Sổ liên lạc = một báo cáo PDF**

bằng:

> **Hồ sơ phát triển theo thời gian.**

Ví dụ:

```
THÁNG 8
│
├─ Chuyên cần: 96%
├─ Nề nếp: Tốt
├─ Đi học muộn: 3 → 1
├─ Nhận xét GVCN
│
├─ Điểm mạnh
│   └─ Chủ động phát biểu
│
└─ Cần cải thiện
    └─ Quản lý thời gian
```

Sau 3 tháng:

> “Việc đi học muộn đã giảm 67%.”

Đây là thứ phụ huynh **có cảm giác giá trị** khi mở Portal.

* * *

# 12\. Killer Feature #9 — AI Assistant, nhưng không được là chatbot chung chung

Phase 3 không nên bắt đầu bằng:

> “Xin chào, tôi là AI. Tôi có thể giúp gì?”

Đó là chatbot.

Thứ nên xây là:

## AI Parent Copilot

Nó được phép trả lời dựa trên **dữ liệu mà phụ huynh có quyền xem**.

Ví dụ:

> **“Tháng này tình hình của con tôi thế nào?”**

AI:

> “So với tháng trước, chuyên cần tăng từ 91% lên 96%.  
> Số lần đi muộn giảm từ 4 xuống 1.  
> GVCN ghi nhận Minh tích cực hơn trong hoạt động nhóm.”

Sau đó:

> **“Tôi nên làm gì để hỗ trợ?”**

AI:

> “Theo nhận xét của GVCN, điểm cần cải thiện hiện tại là quản lý thời gian. Bạn có thể thử thống nhất với Minh giờ chuẩn bị đi học vào tối hôm trước.”

### Nguyên tắc cực kỳ quan trọng

AI **không được tự suy diễn thành chẩn đoán trẻ em**.

Không:

> “Con bạn có dấu hiệu ADHD.”

Không:

> “Con bạn đang bị trầm cảm.”

AI chỉ được:

**summarize → explain → suggest → route to teacher**

* * *

# 13\. Kiến trúc dữ liệu 2 chiều Portal ↔ GVCN

Đây là phần tôi muốn thay đổi mạnh nhất trong kiến trúc.

Không nên xây:

```
/portal
   ↓
database
   ↑
/homeroom
```

với mỗi module tự thao tác database theo cách riêng.

Nên hướng tới:

```
                ┌──────────────────┐
                │   CORE SCHOOL    │
                │      DATA        │
                └────────┬─────────┘
                         │
              Domain / Service Layer
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   ┌────▼────┐                       ┌────▼─────┐
   │ /portal │                       │/homeroom │
   │ Parent  │                       │ Teacher  │
   └────┬────┘                       └────┬─────┘
        │                                 │
        └──────────── Events ─────────────┘
```

* * *

# 14\. Domain Model đề xuất

Tôi đề xuất chuẩn hóa các entity lõi:

```
Student
Parent
ParentStudentRelationship
Class
HomeroomTeacher

Attendance
AttendanceAdjustment

LeaveRequest

Incident
IncidentCase
CaseMessage
CaseAction
CaseResolution

Announcement
Conversation
Message

Poll
PollResponse

Fee
PaymentIntent
PaymentClaim
PaymentReceipt

ReportCard
TeacherComment

Notification
AuditLog
```

Đặc biệt:

## `IncidentCase`

Đây có thể trở thành **domain object trung tâm** của hệ thống phối hợp phụ huynh–GVCN.

Một Case có:

```
case_id
student_id
created_by
category
severity
status
visibility
description
parent_response
teacher_response
action_plan
resolution
created_at
resolved_at
```

* * *

# 15\. Luồng dữ liệu khép kín

## Chiều GVCN → Parent

```
GVCN tạo Case
      ↓
Domain validation
      ↓
Case Event
      ↓
Notification
      ↓
Parent Portal
      ↓
Parent acknowledges
      ↓
Parent responds
      ↓
Case updated
```

## Chiều Parent → GVCN

```
Parent Action
      ↓
Portal API
      ↓
Authorization
      ↓
Domain Command
      ↓
Event
      ↓
GVCN Inbox
      ↓
Teacher Action
      ↓
Event
      ↓
Portal cập nhật
```

Điểm quan trọng:

> **Event là lịch sử sự kiện, không phải trạng thái hiện tại.**

Ví dụ:

```
LeaveRequestSubmitted
LeaveRequestApproved
AttendanceAdjusted
ParentNotified
```

Nhờ vậy sau này có thể audit toàn bộ lịch sử.

* * *

# 16\. Notification Center

Không nên chỉ dùng push notification.

Mỗi notification cần có:

```
notification_id
recipient_id
type
entity_type
entity_id
priority
created_at
read_at
action_url
```

Ví dụ:

```
type = LEAVE_REQUEST_APPROVED
entity_type = LEAVE_REQUEST
entity_id = LR-00125
action_url = /portal/leave/LR-00125
```

Như vậy notification **dẫn thẳng đến hành động**, thay vì chỉ báo:

> “Bạn có thông báo mới.”

* * *

# 17\. Before vs After

| Hạng mục | Before | After — Vision B |
| --- | --- | --- |
| Đăng nhập | Chọn lớp + mã HS + PIN | QR/OTP + trusted device |
| Home | Dashboard dữ liệu | **Hôm nay con thế nào?** |
| Chuyên cần | Xem P/K/T/VP/KH | Xem + giải thích + xử lý |
| Nghỉ phép | Chưa có workflow | Request → Approve → Audit → P |
| Nề nếp | Xem sự việc | **Case → Collaboration → Resolution** |
| Tin nhắn | Gửi GVCN | Conversation có context |
| Thông báo | Một chiều | Hai chiều + acknowledgement |
| Khảo sát | Không/đơn giản | Poll + Survey + Consent |
| Thu phí | VietQR | Payment Intent → Verify → Receipt |
| Báo cáo | PDF/nhận xét | **Growth Timeline** |
| GVCN | Xem dữ liệu | **Parent Collaboration Inbox** |
| Phụ huynh | Consumer | **Active Partner** |
| AI | — | Parent Copilot |
| Audit | Hạn chế | Event + Audit Log |

* * *

# 18\. Kiến trúc UX tôi khuyến nghị

Không nên có quá nhiều tab.

## Bottom navigation mobile

```
🏠 Trang chủ
📋 Việc cần làm
💬 Trao đổi
📈 Con tôi
☰ Thêm
```

### Trang chủ

Tập trung vào:

```
Con hôm nay thế nào?

[Status]

Việc cần bạn xử lý
------------------
2 việc

GVCN muốn phối hợp
------------------
1 case

Mới cập nhật
------------------
...
```

Đây sẽ tốt hơn rất nhiều so với việc bắt phụ huynh đọc 4–5 dashboard.

* * *

# 19\. PWA: Có, nhưng Push Notification không phải Killer Feature

PWA nên có:

- installable;
- responsive;
- offline shell;
- service worker;
- push notification;
- deep-link;
- camera/upload;
- mobile-friendly QR;
- session persistence;
- biometric/device unlock nếu nền tảng hỗ trợ.

Nhưng:

> **Đừng đầu tư quá sâu vào “app-like animation” trước khi workflow backend ổn định.**

Một PWA tuyệt đẹp nhưng:

`GVCN duyệt → Portal không cập nhật`

sẽ phá niềm tin nhanh hơn một UI xấu.

* * *

# 20\. Ba Phase triển khai

## Phase 1 — Core Portal

**Mục tiêu: Trust + Reliability**

### Authentication

- QR student card;
- OTP parent phone;
- multi-child account;
- trusted device;
- session/revoke.

### Dashboard

- “Hôm nay con thế nào?”;
- attendance;
- timeline;
- teacher info;
- announcements.

### Core workflow

- Leave Request;
- GVCN approval;
- Attendance adjustment;
- Audit log;
- notification center.

### Communication

- parent → GVCN message;
- read status;
- basic teacher reply.

### Payment

- fee list;
- VietQR;
- payment claim;
- screenshot;
- verification status.

**Exit criteria:**

> Phụ huynh có thể đăng nhập, hiểu tình hình của con và hoàn thành các hành động cơ bản mà không cần gọi điện cho GVCN.

* * *

# 21\. Phase 2 — Interactive Services

**Mục tiêu: Collaboration**

Thêm:

- Incident Case;
- Case Inbox cho GVCN;
- two-way conversation;
- Poll;
- Survey;
- Consent;
- electronic receipt;
- report card;
- Growth Timeline;
- richer push notifications;
- PWA install.

Đây là phase biến Portal từ:

**“tra cứu” → “phối hợp”.**

* * *

# 22\. Phase 3 — AI Assistant for Parents

**Mục tiêu: Personalization**

AI có thể:

### 1\. Summarize

> “Tóm tắt tháng này của con.”

### 2\. Explain

> “Tại sao chuyên cần giảm?”

### 3\. Recommend

> “Tôi nên hỗ trợ con thế nào?”

### 4\. Prepare communication

> “Giúp tôi soạn câu hỏi cho cô giáo.”

### 5\. Detect workflow signals

Ví dụ:

```
3 lần đi muộn
+
2 lần phụ huynh chưa phản hồi
+
GVCN đánh dấu cần phối hợp
```

→ đề xuất:

> “Có vẻ đây là vấn đề nên được GVCN và gia đình trao đổi trực tiếp.”

**Không tự động gửi hoặc tự quyết định các vấn đề nhạy cảm.**

* * *

# 23\. Bốn nguyên tắc kiến trúc bắt buộc

## 1\. Parent chỉ nhìn thấy dữ liệu được authorize

Đặc biệt với phụ huynh có nhiều con.

Phải kiểm tra:

```
parent
   ↓
relationship
   ↓
student
   ↓
resource
```

Không được dựa vào `student_id` truyền từ frontend.

* * *

## 2\. Mọi hành động quan trọng phải audit được

Các hành động như:

- duyệt nghỉ;
- sửa chuyên cần;
- xác nhận thanh toán;
- công khai sự việc;
- phản hồi case;

phải biết:

**ai — làm gì — lúc nào — trước/sau là gì — lý do gì.**

* * *

## 3\. Privacy-by-default

Đặc biệt với:

- giấy khám;
- ảnh đơn;
- thông tin sức khỏe;
- thông tin tài chính;
- nhận xét giáo viên;
- hành vi/nề nếp.

Không nên đưa tất cả dữ liệu vào cùng một API response.

* * *

## 4\. API phải domain-oriented

Không:

```
POST /update-student
```

Mà:

```
POST /leave-requests
POST /leave-requests/:id/approve
POST /attendance/:id/adjust
POST /cases
POST /cases/:id/respond
POST /payment-claims
POST /polls/:id/respond
```

Tên API phản ánh **business action**, giúp hệ thống dễ kiểm soát và audit.

* * *

# 24\. Một quyết định sản phẩm quan trọng: “Don't build everything”

Tôi **không khuyến nghị** Phase 1 làm ngay:

- chat realtime kiểu Messenger;
- ví điện tử;
- thanh toán ngân hàng tích hợp sâu;
- AI chatbot;
- social feed;
- marketplace;
- gamification;
- quá nhiều loại khảo sát;
- hệ thống báo cáo học tập cực kỳ phức tạp.

Đó là cách biến Portal thành một dự án không bao giờ hoàn thành.

Hãy ưu tiên theo chuỗi:

```
IDENTITY
   ↓
TRUST
   ↓
VISIBILITY
   ↓
ACTION
   ↓
COLLABORATION
   ↓
INSIGHT
   ↓
AI
```

* * *

# 25\. Chỉ thị kiến trúc cuối cùng

Nếu tôi là Senior Architect chịu trách nhiệm phê duyệt roadmap, tôi sẽ **không duyệt Kế hoạch A nguyên trạng**.

Tôi sẽ chuyển thành:

## **PLAN B — “FROM SCHOOL PORTAL TO PARENT COLLABORATION HUB”**

### North Star

> **Mỗi phụ huynh mở Portal trong 10 giây phải biết: Con mình đang thế nào, có việc gì cần mình làm, và nhà trường đang cần mình phối hợp ở đâu.**

### Ba Killer Features phải ưu tiên

**① Today — “Hôm nay con thế nào?”**

Biến dữ liệu thành một trạng thái dễ hiểu.

**② Collaboration Case — “Nhà trường cần tôi phối hợp việc gì?”**

Biến thông báo một chiều thành vòng đời:

**Issue → Parent Response → Teacher Action → Resolution.**

**③ Growth Timeline — “Con tôi đang tiến bộ thế nào?”**

Biến dữ liệu rời rạc thành câu chuyện phát triển của học sinh.

Sau đó mới phủ lên:

**Payment + Leave + Poll + Report + PWA + AI.**

* * *

## Kiến trúc mục tiêu

```
                    ┌───────────────────────┐
                    │   STUDENT / SCHOOL    │
                    │     DOMAIN DATA       │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   DOMAIN SERVICES     │
                    │                       │
                    │ Attendance             │
                    │ Leave                  │
                    │ Cases                  │
                    │ Communication          │
                    │ Payment                │
                    │ Poll                   │
                    │ Report                 │
                    └───────────┬───────────┘
                                │
                       Events + Audit
                                │
             ┌──────────────────┴──────────────────┐
             │                                     │
      ┌──────▼──────┐                       ┌──────▼──────┐
      │   /portal   │                       │ /homeroom   │
      │   PARENT    │◄──── Collaboration ──►│   TEACHER   │
      └──────┬──────┘                       └──────┬──────┘
             │                                     │
             └────────────────┬────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Notification / AI │
                    │     Layer         │
                    └───────────────────┘
```

**Tóm lại:** Kế hoạch A đang xây một **cổng tra cứu tốt**. Kế hoạch B nên xây một **hệ thống phối hợp phụ huynh–GVCN tốt**. Đó là bước nhảy về sản phẩm, không chỉ là thêm tính năng.