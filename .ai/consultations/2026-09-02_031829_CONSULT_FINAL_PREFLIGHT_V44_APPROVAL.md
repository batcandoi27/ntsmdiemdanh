⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Đã rà soát Master V4.4 ở góc độ **Senior Enterprise Architect**. Kết luận của tôi là: **kiến trúc đủ tốt để bắt đầu Phase 1, nhưng chưa nên gọi là “Ready-To-Code tuyệt đối” nếu chưa khóa một số contract kỹ thuật quan trọng**.

Các tài liệu Zalo hiện tại vẫn xác nhận Zalo Official Account có hệ thống API hai chiều, webhook và các năng lực tương tác với người dùng/nhóm; tuy nhiên một số capability cụ thể phải được xác nhận theo đúng loại OA/app và quyền được cấp, thay vì giả định mọi API trong Master Plan đều khả dụng mặc định. [Zalo For Developers+1](https://developers.zalo.me/?utm_source=chatgpt.com)

## 1\. Phán quyết kiến trúc

**GO — cho phép đội Dev bắt đầu Phase 1.**

Nhưng tôi đặt trạng thái:

> **GO WITH 8 ARCHITECTURAL GUARDRAILS**

Không có blocker kiến trúc nào buộc phải dừng Phase 1. Có một số **blindspot cần khóa ngay trong implementation contract**, đặc biệt là identity binding, webhook authenticity, idempotency và khả năng thực tế của Deeplink/Group API.

* * *

# 2\. Những điểm mù quan trọng nhất

### 🔴 Blindspot #1 — `sender_id/source_id` chưa đủ để bảo đảm “0% rò rỉ”

Đây là điểm tôi muốn sửa mạnh nhất.

Router kiểu:

```
if source_id == school_group
    => school data
else
    => normal AI
```

**không đủ an toàn**.

Phải có **School Authorization Context**:

```
Zalo Event
   ↓
Identity Resolver
   ↓
School Principal / Tenant Resolver
   ↓
Parent ↔ Student relationship
   ↓
Authorization Policy
   ↓
Command Handler
   ↓
School Data
```

Một phụ huynh đã `/ketnoi HS10293` không đồng nghĩa họ được phép đọc mọi dữ liệu của HS10293.

Cần lưu và kiểm tra tối thiểu:

```
zalo_user_id
student_id
school_id
relationship = parent/guardian
status = ACTIVE
verified_at
verified_by / verification_method
```

Và mọi command như `/diemdanh`, `/hocphi`, `/bangdiem` phải chạy qua:

```
authorize(zaloUser, student, command, schoolTenant)
```

**Không để command handler tự query database theo `student_id`.**

Đây là security boundary quan trọng nhất của toàn hệ thống.

* * *

### 🔴 Blindspot #2 — `/ketnoi HS10293` không nên được coi là credential

Mã:

```
/ketnoi HS10293
```

nếu chỉ là mã học sinh có thể bị đoán hoặc sao chép.

Tôi khuyến nghị QR chứa **one-time enrollment token**, ví dụ:

```
/ketnoi <opaque-token>
```

Database:

```
enrollment_token_hash
student_id
expires_at
used_at
status
```

Token:

- random đủ entropy;
- expire;
- one-time;
- atomic consume;
- không chứa trực tiếp `student_id`;
- không thể dùng lại sau khi đã bind.

Nếu trường bắt buộc QR hiển thị `HS10293`, vẫn có thể giữ mã đó ở giao diện, nhưng **credential thực tế nên là opaque token**.

* * *

### 🔴 Blindspot #3 — Deeplink “1 chạm” phải được coi là UX assumption, không phải security/transport guarantee

Master Plan giả định:

```
zalo.me/...?...text=/ketnoi HS10293
```

→ Zalo mở chat → text được điền sẵn → phụ huynh bấm Gửi.

Điểm này cần **POC trên chính môi trường Zalo/OA đang dùng trước khi cam kết UX “1 chạm”**.

Tài liệu Zalo hiện tại có các cơ chế chính thức cho OA/chat và tương tác người dùng, nhưng capability cụ thể của deeplink cần được kiểm chứng trên OA/app thực tế. [Zalo For Developers+1](https://developers.zalo.me/docs/social/zalo-interactive-widget?utm_source=chatgpt.com)

Do đó Phase 1 acceptance test phải có:

```
Android
iOS
Zalo version hiện hành
User đã follow OA
User chưa follow OA
QR scanner
Camera
Deep link
```

**Nếu text prefill không được Zalo hỗ trợ ổn định**, fallback phải là:

```
QR → OA/chat → user bấm /ketnoi → nhập token
```

chứ không được để toàn bộ onboarding phụ thuộc vào một hành vi client chưa được contractually guaranteed.

* * *

# 3\. Webhook Router — cần bổ sung 6 lớp bảo vệ

`/api/zalo/webhook/route.ts` không nên làm:

```
receive
→ process DB
→ call alias
→ send response
```

trong cùng một request.

Nên là:

```
Zalo
 ↓
Webhook
 ↓
Authenticate signature
 ↓
Validate schema
 ↓
Replay/idempotency check
 ↓
Persist event
 ↓
ACK quickly
 ↓
Async processor
 ↓
Command Router
 ↓
Domain Service
 ↓
Gateway
```

### Bắt buộc có

**1\. Signature verification**

Không chỉ `x-bridge-token`.

Webhook inbound phải xác thực theo cơ chế chữ ký/event authentication mà Zalo cung cấp cho integration tương ứng. Zalo developer ecosystem hiện có tài liệu/support liên quan webhook signature, nên implementation phải đối chiếu contract hiện hành thay vì tự phát minh header. [Zalo For Developers](https://developers.zalo.me/community/detail/7d0e12e82eadc7f39ebc?utm_source=chatgpt.com)

**2\. Idempotency**

```
event_id UNIQUE
```

hoặc fingerprint đủ mạnh.

Nếu Zalo retry event:

```
same event
→ không bind lại
→ không gửi lại message
→ không đổi alias lần nữa
```

**3\. Replay protection**

Có timestamp/expiry nếu event contract hỗ trợ.

**4\. Schema validation**

Dùng schema validator ở boundary.

**5\. Fast ACK**

Webhook không được chờ:

```
Supabase
+ alias API
+ render PNG
+ Zalo send
```

rồi mới trả response.

**6\. Dead-letter/error state**

Event xử lý lỗi phải có trạng thái:

```
RECEIVED
PROCESSING
PROCESSED
FAILED
```

để retry có kiểm soát.

* * *

# 4\. `ZaloGatewayClient` — kiến trúc đúng nhưng Queue cần nâng cấp

Ý tưởng:

```
1.5s / message
```

là hợp lý như **baseline anti-flood policy**, nhưng không nên hard-code thành một `setTimeout()` đơn giản trong Next.js.

Sai:

```
for (...) {
   await send();
   await sleep(1500);
}
```

Đặc biệt nếu chạy trong serverless/container có lifecycle không ổn định.

Nên:

```
Domain Event
    ↓
Outbound Message Queue
    ↓
Worker
    ↓
Rate Limiter
    ↓
Zalo Gateway :3871
```

Với:

```
queue_key = destination / bot
delay = configurable
retry = exponential backoff
idempotency_key
max_attempts
dead_letter
```

### Quan trọng

**1.5 giây là policy, không phải magic number.**

Đưa vào config:

env

```
ZALO_SEND_MIN_INTERVAL_MS=1500
ZALO_SEND_MAX_RETRIES=...
```

để có thể thay đổi mà không sửa code.

* * *

# 5\. `x-bridge-token` — đúng hướng nhưng `"DEFAULT"` phải bị loại bỏ

Master Plan hiện ghi:

TypeScript

```
process.env.ZALO_BRIDGE_TOKEN || "DEFAULT"
```

Tôi **không phê duyệt fallback `"DEFAULT"` trong production**.

Nên:

TypeScript

```
const token = process.env.ZALO_BRIDGE_TOKEN;

if (!token) {
    throw new Error("ZALO_BRIDGE_TOKEN is not configured");
}
```

Và Gateway cũng phải reject:

```
missing token
wrong token
expired/invalid credential
```

HTTP boundary nên có:

```
401 Unauthorized
```

hoặc tương đương.

Ngoài ra:

- constant-time comparison nếu tự compare;
- không log token;
- không trả token trong error;
- secret nằm trong secret manager/environment;
- rotation được.

* * *

# 6\. Next.js ↔ Gateway :3871

Đây là điểm cần phân biệt rõ:

```
Browser
   X
   ↓
Gateway :3871
```

Không nên cho browser gọi trực tiếp gateway.

Đúng:

```
Browser
   ↓ HTTPS
Next.js
   ↓ private network
Gateway :3871
   ↓
Zalo
```

`zalo-gateway-client.ts` phải là **server-only module**.

Không được import nhầm vào Client Component.

Tôi khuyến nghị:

```
src/lib/server/zalo-gateway-client.ts
```

và nếu project hỗ trợ:

TypeScript

```
import 'server-only';
```

Gateway port `3871` cũng phải được network-policy/firewall giới hạn, không expose public nếu không cần.

* * *

# 7\. Alias API cũng cần cùng security boundary

Master Plan nói:

```
Webhook
→ POST /api/alias
```

Đừng để đây là một API nội bộ nhưng public mà không authentication.

Tối thiểu:

```
Next.js Webhook Processor
       ↓ authenticated internal request
POST /api/alias
       ↓
verify school authorization
       ↓
atomic update
```

Tốt hơn nữa: **không HTTP-hop nếu alias service nằm cùng application**.

Dùng domain service:

TypeScript

```
changeParentAlias(...)
```

và chỉ dùng HTTP khi thực sự có service boundary.

* * *

# 8\. Race condition quan trọng nhất: `/ketnoi`

Có thể xảy ra:

```
Event A: /ketnoi TOKEN123
Event B: /ketnoi TOKEN123
```

đến gần như đồng thời.

Nếu implementation là:

```
SELECT token
→ thấy unused
→ UPDATE used
```

thì có race.

Phải dùng atomic transaction:

SQL

```
UPDATE enrollment_tokens
SET used_at = now()
WHERE token_hash = $1
  AND used_at IS NULL
  AND expires_at > now()
RETURNING student_id;
```

Chỉ request lấy được row mới được quyền bind.

Tương tự, unique constraint nên bảo vệ quan hệ:

```
school_id + zalo_user_id + student_id
```

và các invariant quan trọng khác.

* * *

# 9\. Exception Alerting — logic nghiệp vụ tốt, nhưng có một race condition

Ví dụ:

```
08:00 absent
08:03 teacher marks present
```

Nếu worker alert chạy tại 08:02 trong khi attendance update chưa hoàn tất thì có thể gửi nhầm.

Do đó:

```
attendance state
      ↓
15-minute evaluation
      ↓
transactional snapshot
      ↓
alert decision
```

Cần định nghĩa rõ:

```
ABSENT_AFTER_GRACE_PERIOD
LATE
PRESENT
EXCUSED
```

thay vì chỉ dựa vào boolean `present`.

Và alert phải có:

```
alert_id
student_id
attendance_date
alert_type
```

unique/idempotent.

* * *

# 10\. Phases 1–5: đánh giá

| Phase | Đánh giá | Quyết định |
| --- | --- | --- |
| **1\. Onboarding + Gateway + Commands** | 🟢 Khả thi | **GO** |
| **2\. Attendance alerts** | 🟢 Khả thi | GO sau Phase 1 |
| **3\. TKB + Báo bài** | 🟢 Khả thi | GO |
| **4\. VietQR + Bank Card** | 🟡 Cần xác nhận payment contract | GO có điều kiện |
| **5\. Xin nghỉ + Group automation** | 🟡 Phụ thuộc quyền/API Zalo thực tế | GO có điều kiện |

Zalo hiện công bố OA là nền tảng tương tác hai chiều và có hệ API/nhóm/webhook; tuy nhiên các capability quản trị nhóm và thao tác đặc quyền phải được nghiệm thu trên đúng OA/app permission set, không nên xem các chức năng như “Deputy”, tự duyệt thành viên hay một mã lỗi cụ thể là guaranteed chỉ dựa trên kiến trúc nội bộ. [Zalo For Developers+1](https://developers.zalo.me/?utm_source=chatgpt.com)

* * *

# 11\. Phase 4 — đặc biệt phải tách “QR thanh toán” khỏi “Bank Card Widget”

Đây là một architectural boundary.

Không để:

```
/hocphi
→ generate QR
→ send bank card
→ assume payment success
```

Thanh toán phải có state machine:

```
INVOICE
 ↓
PAYMENT_INTENT
 ↓
QR_GENERATED
 ↓
PENDING
 ↓
PAID / EXPIRED / FAILED
```

**Không bao giờ coi việc phụ huynh quét/chuyển khoản là bằng chứng thanh toán thành công.**

Phải có reconciliation/webhook/payment verification từ payment provider.

* * *

# 12\. Phase 3 — Render ảnh on-the-fly

Ý tưởng rất tốt.

Nhưng tôi khuyến nghị render từ **pure deterministic renderer**:

```
Timetable DTO
      ↓
SVG renderer
      ↓
PNG Buffer
      ↓
Zalo Gateway
```

Không:

```
DB → HTML page → browser screenshot
```

Và không lưu file nếu không cần.

Điều này làm test rất sạch:

```
same DTO
→ same SVG
→ same visual contract
```

* * *

# 13\. `/baobai` và `/thoikhoabieu` phải snapshot dữ liệu

Đừng để command:

```
GET timetable
→ render
```

đọc nhiều bảng rời rạc mà không có snapshot consistency.

Nên tạo:

```
DailyTimetableSnapshot
DailyHomeworkSnapshot
```

hoặc transactionally consistent DTO.

Như vậy ảnh gửi phụ huynh lúc 18:00 không bị tình trạng:

```
Tiết 1 lấy version A
Tiết 2 lấy version B
```

sau khi giáo viên vừa chỉnh TKB.

* * *

# 14\. Verification Suite — 8 test hiện tại chưa đủ

8 test là **tốt**, nhưng tôi sẽ nâng thành các nhóm:

### Security

```
401 missing bridge token
401 invalid bridge token
invalid webhook signature
replay event
expired enrollment token
used enrollment token
cross-student access
cross-class access
cross-school access
```

### Concurrency

```
2 simultaneous /ketnoi
2 simultaneous attendance alerts
duplicate webhook
duplicate outbound command
```

### Reliability

```
Gateway unavailable
Gateway timeout
Zalo 429
Zalo 5xx
queue restart
worker crash
```

### Functional

```
all 9 commands
attendance
timetable
homework
payment
leave
group
```

### Performance

Đừng test yêu cầu:

> “Dữ liệu trả về tức thời <10ms”

như một SLA end-to-end.

`Zalo → Internet → Gateway → DB → Next.js → Zalo` **không thể cam kết <10 ms một cách kiến trúc**.

Nên tách:

```
command routing overhead < X ms
DB query p95 < Y ms
internal service p95 < Z ms
external Zalo delivery = external dependency
```

* * *

# 15\. Definition of Done cho Phase 1

Tôi đề nghị **không merge Phase 1** cho tới khi tất cả đạt:

```
[ ] ZALO_BRIDGE_TOKEN bắt buộc, không DEFAULT
[ ] Gateway chỉ accessible từ trusted network
[ ] server-only Gateway client
[ ] request timeout
[ ] retry policy
[ ] structured logging
[ ] correlation_id
[ ] webhook signature verification
[ ] webhook schema validation
[ ] event idempotency
[ ] replay protection
[ ] atomic /ketnoi token consumption
[ ] enrollment token expiry
[ ] parent ↔ student authorization
[ ] tenant/school isolation
[ ] duplicate alert protection
[ ] queue persistence
[ ] 1.5s configurable throttling
[ ] dead-letter/retry
[ ] alias API authentication
[ ] Deeplink Android test
[ ] Deeplink iOS test
[ ] all 9 slash commands
[ ] negative security tests
[ ] Gateway-down test
[ ] duplicate-webhook test
```

* * *

# 16\. Quyết định cuối cùng của Hội đồng Kiến trúc

### 🟢 OFFICIAL GO-AHEAD

**Tôi phê duyệt Master Plan V4.4 để bắt đầu lập trình Phase 1 ngay lập tức.**

Không cần chờ Phase 2–5 mới bắt đầu.

Nhưng tôi yêu cầu đội Dev coi 4 nguyên tắc sau là **non-negotiable architecture invariants**:

> **1\. Identity trước Data.**  
> Không một command nào được truy xuất dữ liệu học sinh nếu chưa qua authorization context.

> **2\. Webhook phải là Event Ingestion, không phải Business Logic Endpoint.**  
> Nhận → xác thực → persist → ACK → process async.

> **3\. Mọi outbound message phải idempotent và đi qua queue/rate limiter.**  
> `1.5s` là policy, không phải workaround.

> **4\. Không tin client/Zalo capability cho tới khi có contract test thực tế.**  
> Đặc biệt là Deeplink prefill, Group Deputy, member approval và các API đặc quyền.

Kiến trúc tổng thể nên chốt thành:

```
                    ┌─────────────────────┐
                    │       ZALO          │
                    └──────────┬──────────┘
                               │
                         Webhook/Event
                               │
                               ▼
                 ┌──────────────────────────┐
                 │ Next.js Webhook Boundary │
                 │ signature + schema       │
                 │ replay + idempotency     │
                 └────────────┬─────────────┘
                              │
                         Event Store
                              │
                              ▼
                    ┌─────────────────┐
                    │ Command Router  │
                    └────────┬────────┘
                             │
                    Authorization
                    Tenant + Parent
                    + Student Scope
                             │
                             ▼
                    ┌─────────────────┐
                    │ Domain Services │
                    └───────┬─────────┘
                            │
             ┌──────────────┼───────────────┐
             ▼              ▼               ▼
        Attendance       Timetable       Homework
             │              │               │
             └──────────────┼───────────────┘
                            │
                       Outbox / Queue
                            │
                       Rate Limiter
                       1500 ms policy
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Zalo Gateway :3871   │
                 │ x-bridge-token       │
                 └──────────┬───────────┘
                            │
                            ▼
                           ZALO
```

### Lời hiệu triệu

**Đội Dev App Điểm Danh: bắt đầu Phase 1.**

Không xây thêm tính năng ngoài scope. Không “shortcut” authentication. Không hard-code `"DEFAULT"`. Không xử lý business logic nặng trực tiếp trong webhook. Không coi `HS10293` là secret. Không gửi school data trước khi authorization thành công.

**Ưu tiên tuần tự:**

```
1. Gateway contract
2. Security/authentication boundary
3. Event/idempotency model
4. /ketnoi atomic binding
5. Authorization middleware
6. Slash-command router
7. Outbound queue + throttling
8. Integration tests
9. Deeplink real-device POC
10. Phase 1 acceptance
```

**Phán quyết cuối: `GO FOR PHASE 1`.**

Kiến trúc V4.4 đã đủ trưởng thành để code; các điểm trên là **hardening requirements trong quá trình Phase 1**, không phải lý do trì hoãn dự án. [Zalo For Developers+1](https://developers.zalo.me/?utm_source=chatgpt.com)