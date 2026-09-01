⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.## Đánh giá Enterprise Architecture — Giai đoạn 1

**Phạm vi đánh giá:** dựa trên danh sách file, kết quả test và TypeScript compilation được cung cấp. Tôi **không coi 7/7 PASS là bằng chứng đã kiểm chứng production behavior** nếu chưa có integration/e2e test với Gateway + Supabase + Zalo thật.

Zalo hiện có hệ thống Official Account/OpenAPI và webhook, bao gồm các capability liên quan đến nhóm chat; vì vậy hướng tích hợp qua một Gateway là hợp lý về mặt boundary. [Zalo For Developers+1](https://developers.zalo.me/docs?utm_source=chatgpt.com)

### 1\. Architectural Integrity — **PASS có điều kiện**

Thiết kế đang đi đúng hướng:

- `zalo-gateway-client.ts` đóng vai trò **integration boundary**, tránh để domain/service layer phụ thuộc trực tiếp vào Zalo session.
- `zalo-service.ts` giữ mapping phụ huynh ↔ học sinh trong CSDL.
- `homework-service.ts` giữ nghiệp vụ Báo bài/TKB độc lập với transport.
- `webhook/route.ts` là ingress adapter.
- Việc có types riêng cho Zalo và Homework giúp giảm coupling.

**Điểm tôi đánh giá cao:** Zalo được xem như một **Gateway/transport**, không phải System of Record. Đây là đúng hướng Enterprise.

Tuy nhiên cần xác nhận thêm một invariant quan trọng:

> Không được phép có nghiệp vụ quan trọng nào phụ thuộc vào trạng thái session Zalo hiện tại.

Nếu Gateway restart, mất connection hoặc Zalo unavailable, dữ liệu học sinh/TKB/Báo bài vẫn phải nguyên vẹn; message chỉ chuyển sang `pending/retry/failed`.

**Khuyến nghị:** chuẩn hóa kiến trúc thành:

`Web/API → Domain Service → DB/Outbox → Zalo Gateway`

thay vì:

`Web/API → Zalo → DB`

* * *

### 2\. Security & Invariants — **REQUEST\_CHANGES**

Đây là lớp tôi **chưa chấp thuận production** chỉ từ evidence hiện có.

#### `x-bridge-token`

Việc sử dụng `x-bridge-token` là đúng hướng cho boundary giữa app và Gateway, nhưng cần chứng minh tối thiểu:

- token chỉ nằm ở server-side secret/environment;
- không xuất hiện trong client bundle;
- constant-time comparison khi verify;
- reject nếu thiếu/sai token;
- không log token;
- rotation được;
- production/dev token tách biệt.

Đặc biệt, `x-bridge-token` nên được hiểu là **credential của internal bridge**, không phải bằng chứng thay thế cho authorization ở tầng application.

#### School Authorization

Đây là invariant quan trọng nhất.

Mọi mutation kiểu:

- `/ketnoi`
- `/baobai`
- `/thoikhoabieu`
- `/diemdanh`
- `/hocphi`

phải xác định được:

`actor → school → class/student → permitted action`

Không được chỉ dựa trên `zalo_user_id`, `MÃ_HS`, hoặc một identifier do request gửi lên.

Nếu Supabase đang sử dụng RLS, cần test cả trường hợp **cross-school access** và **cross-class access**.

#### Anti-Flood 1.5s

`1.5s/message` là một biện pháp tốt ở client SDK, nhưng **chưa đủ để gọi là distributed anti-flood protection**.

Nếu có 2 process/server instances:

```
Instance A → message
Instance B → message
```

cả hai đều có thể nghĩ rằng chúng đang cách nhau 1.5 giây.

Production nên có **durable outbound queue/outbox** với scheduling/locking ở shared infrastructure. 1.5 giây nên là delivery policy, không phải security boundary.

Ngoài ra cần có:

- retry policy;
- exponential backoff;
- idempotency key;
- dead-letter/failed state;
- max retry;
- audit log;
- correlation/message ID.

* * *

### 3\. Zero-Touch UX — **PASS**

Về mặt thiết kế UX, đây là phần mạnh nhất.

`/ketnoi` + Live QR Deeplink + one-touch flow có tiềm năng giảm đáng kể thao tác của GVCN/phụ huynh.

Multi-child mapping cũng là quyết định đúng: một phụ huynh không nên bị giới hạn bởi assumption `1 Zalo account = 1 student`.

Báo bài cũng có UX hợp lý:

> ngày → tự load môn → Smart Preset → chỉnh sửa → 1-click gửi group.

Điểm cần bảo vệ là **smart suggestion không được tự động biến thành authoritative data**. Giáo viên/Ban cán sự vẫn phải có quyền chỉnh sửa/xác nhận trước khi publish.

Với role `Ban Cán Sự`, cần có authorization rõ ràng ở backend; ẩn/hiện button ở UI **không phải security control**.

* * *

### 4\. Empirical Test Evidence — **REQUEST\_CHANGES**

`7/7 PASS (100%)` và `npx tsc --noEmit` = 0 lỗi là tín hiệu rất tốt.

Nhưng về Enterprise QA, tôi chỉ xếp đây là:

**Unit/functional smoke evidence — chưa phải production acceptance evidence.**

Bộ test cần bổ sung ít nhất các negative/security scenarios:

| Area | Test bắt buộc |
| --- | --- |
| Auth | thiếu `x-bridge-token` |
| Auth | token sai |
| Authorization | user School A truy cập School B |
| Authorization | phụ huynh truy cập học sinh không thuộc mapping |
| Role | student thường gọi API của cán sự |
| Webhook | duplicate event |
| Webhook | replay event |
| Queue | Gateway timeout |
| Queue | Gateway 429/5xx |
| Queue | process restart giữa chừng |
| Flood | concurrent sends từ 2 workers |
| Data | duplicate `/ketnoi` |
| Data | multi-child mapping |
| DB | transaction rollback |
| UX | timetable thiếu môn / ngày không có tiết |
| Publish | gửi group thất bại sau khi lưu Báo bài |

Đặc biệt cần có **integration test thật với Gateway contract** và một số E2E test; TypeScript compilation không thể chứng minh runtime contract.

* * *

# 5\. Phán quyết

## **REQUEST\_CHANGES**

**Không phải vì kiến trúc sai. Ngược lại, kiến trúc nền tảng đang khá tốt.**

Lý do REQUEST\_CHANGES là **evidence chưa đủ để cấp production approval cho một subsystem có authentication, school authorization, external messaging và automated outbound delivery.**

### Các blocking changes

**P0 — Security**

1. Chứng minh `x-bridge-token` verification + secret handling.
2. Chứng minh School/tenant authorization ở server-side.
3. Thêm cross-school/cross-class negative tests.
4. Không coi UI role gating là authorization.

**P0 — Messaging reliability**  
5\. Đưa outbound Zalo delivery về durable outbox/queue nếu hiện tại 1.5s throttle chỉ nằm trong process.  
6\. Có idempotency + retry/backoff + DLQ/failed state.  
7\. Xử lý duplicate/replayed webhook.

**P1 — Verification**  
8\. Mở rộng `7/7` thành security + integration + failure-mode suite.  
9\. Có test Gateway unavailable/timeout/429/5xx.  
10\. Có restart/concurrency test để chứng minh invariant 1.5s.

**P1 — Observability**  
11\. Correlation ID cho request → domain event → outbound message.  
12\. Audit trail cho `/ketnoi`, role changes và publish Báo bài.  
13\. Không log credential/token hoặc dữ liệu nhạy cảm không cần thiết.

### Tổng kết kiến trúc

**Điểm mạnh:** separation of concerns tốt, Gateway boundary rõ, domain nghiệp vụ tương đối độc lập Zalo, Multi-child mapping hợp lý, Zero-Touch UX có giá trị thực tế.

**Rủi ro chính:** hiện chưa có đủ bằng chứng về **authorization boundary, distributed delivery semantics, idempotency và failure recovery**.

Vì vậy verdict của tôi là:

> **REQUEST\_CHANGES — Architecture direction APPROVED, Production Readiness NOT YET APPROVED.**

Sau khi đóng P0 và bổ sung integration/security evidence, tôi sẽ kỳ vọng verdict có thể nâng lên **APPROVED** mà không cần thay đổi lớn kiến trúc hiện tại.

[Zalo For Developers — tài liệu chính thức](https://developers.zalo.me/docs?utm_source=chatgpt.com)