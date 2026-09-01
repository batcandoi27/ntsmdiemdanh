⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là **Master Plan ở cấp Enterprise Architecture**, tập trung vào ranh giới trách nhiệm, độ tin cậy, khả năng vận hành và đặc biệt là cô lập rủi ro **Zalo Session drop**. Phân tích này dựa trên toàn bộ thông tin tài nguyên được cung cấp trong task; tôi không coi đây là kết quả của một lần quét mới toàn bộ source tree/local workspace.

MASTER ARCHITECTURE PLAN

# MASTER ARCHITECTURE PLAN

## Tích hợp Zalo Bot Gateway (`app-zalobot`) vào WebApp Điểm Danh & Sổ Chủ Nhiệm (`app-diemdanh`)

### THCS Trần Bội Cơ

* * *

# 1\. Executive Architecture Decision

## Quyết định đề xuất

> **CHỌN PLAN A — Microservice Gateway Architecture qua HTTP/Webhook.**

`app-diemdanh` phải tiếp tục là **System of Record (SoR)** của nghiệp vụ nhà trường, trong khi `app-zalobot` trở thành **Communication & Automation Gateway** độc lập.

Mô hình mục tiêu:

```
                         ┌──────────────────────────────┐
                         │        ADMIN / TEACHER       │
                         │       app-diemdanh Web       │
                         └──────────────┬───────────────┘
                                        │
                              Server Actions / API
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         APP-DIEMDANH                                │
│                                                                     │
│  Attendance │ Homeroom │ Reports │ Portal │ Tuition │ RBAC         │
│                                                                     │
│                 PostgreSQL / Supabase                               │
│                  SYSTEM OF RECORD                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    Internal HTTP API / Webhook
                    + HMAC / API Key / Idempotency
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         APP-ZALOBOT                                 │
│                      Gateway :3871                                  │
│                                                                     │
│  ┌───────────────────┐       ┌──────────────────────────────────┐  │
│  │ ZERO-AI           │       │ AI-POWERED                       │  │
│  │ deterministic     │       │ Hermes/Gemini/OpenAI             │  │
│  │                   │       │                                  │  │
│  │ send 1-1          │       │ AI image                         │  │
│  │ send group        │       │ AI comments                      │  │
│  │ VietQR            │       │ document/file understanding      │  │
│  │ Word              │       └──────────────────────────────────┘  │
│  │ Excel             │                                             │
│  │ Poll              │                                             │
│  │ Reaction          │                                             │
│  └─────────┬─────────┘                                             │
│            │                                                        │
│      Session / Zalo Transport                                      │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
        Zalo Network
```

### Nguyên tắc cốt lõi

`app-diemdanh` **không được phụ thuộc trực tiếp vào trạng thái Zalo Session**.

Một giáo viên vẫn phải:

- điểm danh;
- lưu hồ sơ học sinh;
- lập biên bản;
- xem báo cáo;
- quản lý đơn nghỉ;
- truy cập Portal;

ngay cả khi Zalo Gateway đang:

- offline;
- mất session;
- restart;
- reconnect;
- lỗi AI;
- quá tải;
- bị Zalo throttling.

Đây là architectural invariant quan trọng nhất.

* * *

# 2\. Boundary giữa hai hệ thống

## 2.1. `app-diemdanh` — System of Record

Chịu trách nhiệm:

| Domain | Owner |
| --- | --- |
| Học sinh | `app-diemdanh` |
| Lớp | `app-diemdanh` |
| Giáo viên | `app-diemdanh` |
| Điểm danh | `app-diemdanh` |
| Vi phạm/nề nếp | `app-diemdanh` |
| Sổ chủ nhiệm | `app-diemdanh` |
| Đơn nghỉ phép | `app-diemdanh` |
| Học phí | `app-diemdanh` |
| RBAC | `app-diemdanh` |
| Feature Flags | `app-diemdanh` |
| Audit nghiệp vụ | `app-diemdanh` |

Không nên chuyển ownership các dữ liệu trên sang `app-zalobot`.

* * *

## 2.2. `app-zalobot` — Communication Gateway

Chịu trách nhiệm:

| Domain | Owner |
| --- | --- |
| Zalo Session | `app-zalobot` |
| Zalo transport | `app-zalobot` |
| Send 1-1 | `app-zalobot` |
| Send group | `app-zalobot` |
| Poll | `app-zalobot` |
| Reaction | `app-zalobot` |
| VietQR generation | Gateway capability |
| Word/Excel export | Gateway capability |
| File parsing | Gateway capability |
| AI generation | Gateway capability |
| Retry transport | `app-zalobot` |
| Session reconnect | `app-zalobot` |

`app-diemdanh` chỉ yêu cầu **business intent**, không điều khiển chi tiết session.

Ví dụ:

```
{
  "event": "attendance.absence.notification",
  "idempotencyKey": "attendance:2026-09-02:student:123",
  "recipient": {
    "type": "parent",
    "studentId": "123"
  },
  "message": {
    "template": "ABSENT_TODAY",
    "variables": {
      "studentName": "Nguyen Van A",
      "className": "8A1"
    }
  }
}
```

Gateway quyết định cách thực thi Zalo.

* * *

# 3\. Use Case Intersection Analysis

## UC-01 — Thông báo điểm danh

### Flow

```
Teacher
  │
  ▼
Attendance
  │
  ├── Save attendance
  │
  └── Create notification job
            │
            ▼
       Zalo Gateway
            │
            ▼
        Parent Zalo
```

**Khuyến nghị:** lưu attendance trước, gửi notification sau.

Không:

```
send Zalo → nếu thành công → mới save attendance
```

Mà:

```
save business transaction
        ↓
enqueue communication intent
        ↓
send Zalo asynchronously
```

* * *

# 4\. Use Case Matrix

| Use Case | DiemDanh | ZaloBot | Integration |
| --- | --- | --- | --- |
| Điểm danh học sinh | Primary | \- | Event |
| Báo phụ huynh vắng | Primary | Primary transport | HTTP |
| Báo đi trễ | Primary | Primary transport | HTTP |
| Báo vi phạm | Primary | Primary transport | HTTP |
| Gửi tin 1-1 | Requester | Executor | API |
| Gửi nhóm lớp | Requester | Executor | API |
| Gửi hàng loạt | Requester | Executor | Queue/API |
| Modal soạn Zalo | UI | Gateway | API |
| Báo cáo chuyên cần | Primary | \- | Optional export |
| Xuất Excel | Requester | Executor | API |
| Xuất Word | Requester | Executor | API |
| VietQR học phí | Business owner | Generator/transport | API |
| Poll nhóm | Requester | Executor | API |
| Reaction | Requester | Executor | API |
| Đơn nghỉ PDF/Docx | Business owner | Parser/AI capability | API |
| AI nhận xét HS | Business owner | AI executor | API |
| AI ảnh khen thưởng | Business owner | AI executor | API |
| Audit nghiệp vụ | Primary | Transport audit | Correlation ID |
| Zalo session | \- | Primary | Gateway only |

* * *

# 5\. Integration Contract

Không nên expose một API kiểu:

```
POST /send-anything
```

với payload tùy ý.

Nên thiết kế **domain-oriented command API**.

Ví dụ:

```
POST /internal/v1/messages/send
POST /internal/v1/messages/batch
POST /internal/v1/groups/{groupId}/poll
POST /internal/v1/messages/{messageId}/reaction
POST /internal/v1/documents/parse
POST /internal/v1/exports/word
POST /internal/v1/exports/excel
POST /internal/v1/qr/generate
POST /internal/v1/ai/student-comment
```

Có thể thêm một lớp generic command bus bên dưới nhưng contract bên ngoài phải có semantics rõ ràng.

* * *

# 6\. Reliability Model

## 6.1. Không dùng synchronous Zalo call cho transaction nghiệp vụ

Ví dụ nguy hiểm:

```
Server Action
   ↓
Save attendance
   ↓
await Zalo.send()
   ↓
return success
```

Nếu Zalo treo 20 giây:

- Server Action bị giữ;
- UX chậm;
- timeout;
- retry từ client;
- có thể tạo duplicate;
- business transaction bị coupling với external session.

### Mô hình đúng

```
Server Action
   │
   ├── Commit attendance
   │
   └── Create notification intent
              │
              ▼
          Queue / Outbox
              │
              ▼
        Zalo Gateway
              │
       ┌──────┴──────┐
       │             │
    success        failure
       │             │
       ▼             ▼
   delivered      retry/DLQ
```

* * *

# 7\. Outbox Pattern — thành phần nên có trong Plan A

Đây là lớp rất đáng đầu tư nếu hệ thống đã có Supabase/PostgreSQL.

Ví dụ:

```
communication_outbox
--------------------
id
idempotency_key
event_type
aggregate_type
aggregate_id
recipient_type
recipient_id
payload
status
attempt_count
next_attempt_at
created_at
sent_at
last_error
correlation_id
```

Trạng thái:

```
PENDING
   ↓
PROCESSING
   ↓
SENT

PROCESSING
   ↓
RETRY_WAIT
   ↓
PROCESSING

RETRY_WAIT
   ↓
DEAD_LETTER
```

Điều này biến việc gửi Zalo từ:

> "API call"

thành:

> "durable business-side communication intent".

* * *

# 8\. Idempotency

Đây là requirement bắt buộc.

Ví dụ giáo viên click:

```
"Gửi thông báo"
```

3 lần.

Không được gửi:

```
3 × "Em A hôm nay nghỉ học"
```

nếu business intent chỉ có một.

Mỗi command cần:

```
idempotencyKey
```

Ví dụ:

```
attendance:20260902:class-8A1:student-123:absence
```

Gateway cũng phải lưu/kiểm tra idempotency ở mức transport.

* * *

# 9\. Webhook / Callback

Gateway nên trả về:

```
{
  "requestId": "req_xxx",
  "status": "accepted"
}
```

Sau đó callback:

```
ZaloBot
   │
   └── POST /webhooks/zalo/status
                   │
                   ▼
             app-diemdanh
```

Payload:

```
{
  "requestId": "req_xxx",
  "idempotencyKey": "attendance:...",
  "status": "DELIVERED",
  "providerMessageId": "zalo_xxx",
  "timestamp": "2026-09-02T..."
}
```

Các trạng thái nên phân biệt:

```
ACCEPTED
QUEUED
PROCESSING
DELIVERED
FAILED
RETRYING
DEAD_LETTER
```

**Không nên dùng boolean** `**success=true/false**` **cho toàn bộ lifecycle.**

* * *

# 10\. Security Architecture

## 10.1. Không expose Gateway công khai nếu không cần

Ưu tiên:

```
Internet
   │
   ▼
app-diemdanh
   │
 private network / authenticated HTTP
   │
   ▼
app-zalobot:3871
```

Nếu bắt buộc public:

- TLS;
- API key hoặc signed request;
- HMAC;
- IP restriction nếu hạ tầng cho phép;
- request timestamp;
- nonce;
- replay protection;
- rate limit.

* * *

## 10.2. Không truyền secret Zalo vào frontend

Không:

```
Browser
   ↓
Zalo API Key
```

Đúng:

```
Browser
   ↓
Next.js Server Action
   ↓
Authenticated Gateway
   ↓
Zalo
```

* * *

# 11\. 5 INVARIANTS — Nguyên tắc bất biến

## INVARIANT #1 — Zalo không được là Single Point of Failure của nghiệp vụ

> **Zalo down ≠ app-diemdanh down.**

Điểm danh, sổ chủ nhiệm, hồ sơ học sinh và báo cáo vẫn hoạt động.

* * *

## INVARIANT #2 — Database nghiệp vụ thuộc về `app-diemdanh`

`app-zalobot` không trở thành source of truth cho:

- học sinh;
- lớp;
- điểm danh;
- học phí;
- hồ sơ;
- RBAC.

Gateway chỉ giữ metadata cần thiết cho transport.

* * *

## INVARIANT #3 — Mọi command có side effect phải idempotent

Đặc biệt:

- gửi tin;
- batch send;
- poll;
- reaction;
- webhook processing;
- retry.

Một request retry không được biến thành một business action mới.

* * *

## INVARIANT #4 — AI không được tự ý thay đổi dữ liệu nghiệp vụ

AI có thể:

```
suggest
generate
classify
extract
summarize
```

Nhưng không mặc định được phép:

```
change attendance
approve leave
change tuition
modify student record
```

Nếu AI sinh nhận xét:

```
AI suggestion
      ↓
Teacher review
      ↓
Commit
```

* * *

## INVARIANT #5 — Session Zalo là ephemeral state

Không được thiết kế hệ thống với assumption:

```
Zalo session always exists
```

Phải luôn hỗ trợ:

```
CONNECTED
DISCONNECTED
RECONNECTING
AUTH_REQUIRED
DEGRADED
UNKNOWN
```

Session drop phải là một **normal operational condition**, không phải catastrophic application failure.

* * *

# 12\. PLAN A — Microservice Gateway Architecture

## Kiến trúc

```
                 app-diemdanh
                       │
              authenticated HTTP
                       │
                       ▼
                app-zalobot :3871
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
    Zero-AI          AI Layer       File/Export
        │              │               │
        └──────────────┼───────────────┘
                       │
                       ▼
                 Zalo Session
```

## Ưu điểm

### 1\. Isolation

Gateway crash không làm crash Next.js.

### 2\. Independent deployment

Có thể restart:

```
app-zalobot
```

mà không deploy:

```
app-diemdanh
```

### 3\. Session isolation

Zalo session lifecycle nằm riêng.

### 4\. Scale độc lập

Có thể scale web:

```
Next.js × N
```

và Gateway:

```
Zalo Gateway × M
```

theo nhu cầu.

### 5\. AI isolation

LLM timeout/rate limit không làm ảnh hưởng transaction web.

### 6\. Observability tốt

Có thể theo dõi riêng:

```
gateway_uptime
session_status
send_success_rate
retry_rate
AI_latency
queue_depth
```

* * *

# 13\. PLAN A — Nhược điểm

- Phải thiết kế API contract.
- Có network failure.
- Cần authentication.
- Cần retry/idempotency.
- Cần monitoring.
- Cần deployment thêm một service.
- Debug cross-service phức tạp hơn monolith.
- Cần correlation ID.

Tuy nhiên, đây là **complexity có chủ đích** để đổi lấy reliability.

* * *

# 14\. PLAN B — Monorepo In-Process Embedding

Mô hình:

```
┌────────────────────────────────────────────┐
│             app-diemdanh                  │
│                                            │
│ Next.js                                    │
│   │                                        │
│   ├── attendance                           │
│   ├── homeroom                             │
│   ├── portal                               │
│   └── Zalo SDK / Bot Runtime               │
│                  │                         │
│                  ▼                         │
│             Zalo Session                   │
└────────────────────────────────────────────┘
```

Có thể giữ chung monorepo:

```
apps/
  diemdanh/
  zalobot/
packages/
  shared/
  contracts/
```

nhưng runtime vẫn có thể khác. **Monorepo không đồng nghĩa in-process.**

Nếu hiểu Plan B đúng nghĩa là đưa runtime Zalo vào cùng process Next.js thì rủi ro cao hơn đáng kể.

* * *

# 15\. PLAN B — Ưu điểm

- Ít network boundary.
- Code sharing dễ.
- TypeScript types dùng chung.
- Development ban đầu nhanh.
- Một deployment.
- Debug local đơn giản.
- Không cần internal HTTP.

Đặc biệt phù hợp cho:

- prototype;
- PoC;
- MVP;
- môi trường development.

* * *

# 16\. PLAN B — Nhược điểm kiến trúc

## 1\. Failure coupling

```
Zalo SDK crash
      ↓
Next.js process crash
      ↓
WebApp unavailable
```

Đây là vấn đề lớn nhất.

## 2\. Resource contention

Zalo bot có thể:

- reconnect;
- process file;
- generate document;
- call LLM;
- tạo ảnh;
- xử lý batch.

Các tác vụ này tranh CPU/RAM/event loop với WebApp.

## 3\. Session lifecycle

Session state thường có lifecycle rất khác web request lifecycle.

## 4\. Deployment coupling

Thay đổi Zalo:

```
deploy whole WebApp
```

## 5\. Scaling ambiguity

Nếu scale Next.js lên 3 instances:

```
Instance A → Zalo Session
Instance B → Zalo Session
Instance C → Zalo Session
```

rất dễ phát sinh:

- duplicate session;
- session ownership conflict;
- duplicate messages;
- race conditions.

## 6\. AI blast radius

LLM/file processing có thể gây memory pressure cho toàn application.

* * *

# 17\. PLAN A vs PLAN B — Ma trận

| Tiêu chí | Plan A: Gateway | Plan B: In-Process |
| --- | --- | --- |
| Kiến trúc | ★★★★★ | ★★★ |
| Isolation | ★★★★★ | ★★ |
| Development ban đầu | ★★★ | ★★★★★ |
| Deployment đơn giản | ★★★ | ★★★★★ |
| Reliability | ★★★★★ | ★★ |
| Session isolation | ★★★★★ | ★★ |
| Zalo session drop | ★★★★★ | ★★ |
| Scale độc lập | ★★★★★ | ★ |
| AI isolation | ★★★★★ | ★★ |
| Observability | ★★★★★ | ★★★ |
| Fault containment | ★★★★★ | ★ |
| Network complexity | ★★★ | ★★★★★ |
| Operational complexity | ★★★★ | ★★ |
| Long-term maintainability | ★★★★★ | ★★★ |
| Enterprise suitability | ★★★★★ | ★★ |
| MVP suitability | ★★★★ | ★★★★★ |

### Kết luận

```
Short-term coding simplicity:
PLAN B > PLAN A

Long-term system reliability:
PLAN A >>> PLAN B
```

Đối với hệ thống trường học có dữ liệu nghiệp vụ quan trọng:

> **Reliability và fault isolation phải thắng convenience.**

* * *

# 18\. Đánh giá riêng rủi ro Zalo Session Drop

| Tình huống | Plan A | Plan B |
| --- | --- | --- |
| Session mất kết nối | Gateway reconnect | WebApp process bị ảnh hưởng |
| Re-authentication | Gateway handles | App phải handle |
| Gateway restart | WebApp vẫn chạy | WebApp restart |
| Zalo SDK memory leak | Isolated | Có thể ảnh hưởng WebApp |
| Batch send spike | Queue/Gateway | Web request resources |
| AI timeout | Isolated | Shared runtime |
| Zalo throttling | Gateway backoff | App bị kéo theo |
| Session corruption | Gateway restart | Có thể restart WebApp |
| Multi-instance | Có session owner | Rất phức tạp |

### Thiết kế cần đạt

```
ZALO_SESSION_DOWN
       ↓
Communication status = DEGRADED
       ↓
Queue remains durable
       ↓
Business application remains HEALTHY
       ↓
Session recovered
       ↓
Queue resumes
```

Đây là behavior cần kiểm thử thực nghiệm, không chỉ kiểm tra bằng code review.

* * *

# 19\. Zero-AI vs AI-Powered

Đặc tính này của Gateway nên được giữ nguyên và đưa vào architecture boundary.

## Zero-AI

Dùng cho:

- gửi thông báo điểm danh;
- gửi template;
- VietQR;
- Word;
- Excel;
- Poll;
- Reaction;
- các command deterministic.

Ưu tiên:

```
fast
cheap
predictable
auditable
```

## AI-Powered

Dùng cho:

- viết nhận xét học sinh;
- tạo ảnh khen thưởng;
- hiểu file đơn xin phép;
- semantic extraction;
- các tác vụ ngôn ngữ.

AI phải có:

```
timeout
fallback
cost control
audit
human review
```

* * *

# 20\. Không để AI nằm trên critical path

Ví dụ:

```
Teacher saves attendance
        │
        ▼
      COMMIT
        │
        ▼
   Notification
```

Không:

```
Attendance
   ↓
AI generates message
   ↓
AI timeout
   ↓
Attendance transaction timeout
```

Nếu cần AI:

```
Attendance committed
        ↓
AI job
        ↓
suggestion
        ↓
teacher/system approval
```

* * *

# 21\. Observability

Mỗi request xuyên qua hai hệ thống cần một:

```
correlationId
```

Ví dụ:

```
attendanceId
requestId
messageId
providerMessageId
correlationId
```

Có thể trace:

```
Teacher action
 ↓
Server Action
 ↓
DB transaction
 ↓
Outbox
 ↓
Gateway
 ↓
Zalo
 ↓
Delivery callback
```

## Metrics bắt buộc

### WebApp

```
outbox_pending_count
outbox_failed_count
notification_enqueue_latency
```

### Gateway

```
gateway_up
zalo_session_status
messages_sent_total
messages_failed_total
messages_retried_total
message_latency
queue_depth
```

### AI

```
ai_requests
ai_failures
ai_latency
ai_tokens/cost
```

* * *

# 22\. Health Check phải tách 2 loại

Không nên:

```
GET /health
→ kiểm tra Zalo
→ Zalo down
→ application unhealthy
```

Nên có:

```
/health/live
```

\= process còn sống.

và:

```
/health/ready
```

\= service có thể nhận work.

Thêm:

```
/zalo/status
```

\= trạng thái session.

Ví dụ:

```
{
  "application": "healthy",
  "zalo": "disconnected",
  "mode": "degraded",
  "queue": "healthy"
}
```

Gateway process vẫn healthy dù Zalo session disconnected.

* * *

# 23\. Retry Strategy

Không retry vô hạn.

Ví dụ:

```
Attempt 1 → immediate
Attempt 2 → 5s
Attempt 3 → 30s
Attempt 4 → 2m
Attempt 5 → 10m
          ↓
      DEAD LETTER
```

Phải phân biệt:

### Retryable

- network timeout;
- temporary session disconnect;
- transient provider error;
- temporary AI failure.

### Non-retryable

- invalid recipient;
- malformed payload;
- unauthorized request;
- invalid business contract.

* * *

# 24\. Dead Letter Queue

Các message thất bại lâu dài phải vào:

```
DEAD_LETTER
```

Admin có thể:

```
Inspect
Retry
Cancel
```

Không được âm thầm drop message.

* * *

# 25\. Batch Messaging

Đây là khu vực rủi ro cao.

Không nên:

```
for (...) {
  await send()
}
```

với hàng trăm/hàng nghìn học sinh.

Nên:

```
Business command
      ↓
Batch job
      ↓
Rate-limited worker
      ↓
Zalo transport
```

Có:

- concurrency limit;
- rate limit;
- retry;
- progress;
- cancellation;
- audit.

* * *

# 26\. RBAC

Không để Gateway tự quyết định:

> "Ai được gửi tin cho ai?"

Quyền phải bắt đầu từ `app-diemdanh`.

Ví dụ:

```
BGH
  → toàn trường

GVCN
  → lớp chủ nhiệm

GV bộ môn
  → học sinh/lớp được phân công
```

Gateway nhận request đã được authorization.

Có thể defense-in-depth bằng cách Gateway kiểm tra:

```
service identity
```

nhưng business authorization chính vẫn thuộc WebApp.

* * *

# 27\. Data Privacy

Gateway không nên nhận toàn bộ hồ sơ học sinh nếu chỉ cần gửi:

```
studentName
className
attendanceStatus
```

Áp dụng:

> **Minimum Necessary Data**

Ví dụ không gửi:

```
SYLL full payload
```

chỉ để generate:

```
"Em A hôm nay vắng."
```

Đối với AI:

- minimize PII;
- log payload đã redacted;
- không log raw document nếu không cần;
- kiểm soát retention.

* * *

# 28\. API Versioning

Ngay từ đầu dùng:

```
/internal/v1/
```

Không để contract:

```
POST /send
```

trở thành legacy trap.

Khi thay đổi:

```
/internal/v2/
```

có thể coexist.

* * *

# 29\. Phân chia repository

Khuyến nghị:

```
app-diemdanh/
  app/
  components/
  lib/
  actions/
  modules/
    attendance/
    homeroom/
    portal/
    communication/
  infrastructure/
    outbox/
    zalo-client/
```

và Gateway độc lập:

```
app-zalobot/
  src/
    api/
    application/
    domain/
    adapters/
      zalo/
      ai/
      documents/
      qr/
    workers/
    infrastructure/
    observability/
```

Nếu hai project cần shared contract:

```
packages/
  integration-contracts/
```

nhưng **không share implementation của Zalo runtime vào WebApp**.

* * *

# 30\. Phương án triển khai khuyến nghị

## Phase 1 — Contract & Isolation

### Mục tiêu

Chưa cần đưa toàn bộ use case vào production.

Xây:

```
app-diemdanh
    ↓
authenticated HTTP
    ↓
app-zalobot
    ↓
Zalo
```

### Deliverables

- API contract v1;
- authentication;
- correlation ID;
- idempotency;
- health endpoint;
- Zalo status endpoint;
- basic send 1-1;
- structured logging.

### Test kiểm định

**Test P1-A: Gateway unavailable**

```
Stop app-zalobot
→ app-diemdanh vẫn login
→ attendance vẫn save
→ reports vẫn mở
```

Pass condition:

> Không có transaction nghiệp vụ nào fail chỉ vì Gateway down.

* * *

# 31\. Phase 2 — Durable Communication

### Mục tiêu

Đưa Outbox + Retry vào production path.

```
Attendance
 ↓
DB transaction
 ↓
Outbox
 ↓
Gateway
 ↓
Zalo
```

### Deliverables

- `communication_outbox`;
- worker;
- idempotency;
- retry;
- DLQ;
- delivery status;
- webhook callback.

### Test kiểm định

**Test P2-A: Kill Gateway giữa transaction**

```
Save attendance
↓
Kill Gateway
↓
Restart Gateway
```

Kỳ vọng:

```
Attendance = exactly 1
Notification intent = exactly 1
```

Không duplicate business transaction.

* * *

# 32\. Phase 3 — Business Use Cases

Triển khai theo thứ tự rủi ro thấp → cao.

### 3.1

- thông báo điểm danh;
- đi trễ;
- vi phạm.

### 3.2

- group messaging;
- batch messaging.

### 3.3

- VietQR;
- Word;
- Excel;
- Poll;
- Reaction.

### 3.4

- parse đơn nghỉ PDF/Docx.

### 3.5

- AI comments;
- AI image.

* * *

# 33\. Phase 3 Test Matrix

| Test | Expected |
| --- | --- |
| Zalo connected | Message delivered |
| Zalo disconnected | Queue retained |
| Gateway restart | Jobs resume |
| Duplicate request | No duplicate side effect |
| Provider timeout | Retry |
| Invalid recipient | DLQ/non-retryable |
| 100-message batch | Rate limited |
| AI timeout | Business app remains available |
| AI unavailable | Graceful fallback |
| WebApp restart | Outbox survives |

* * *

# 34\. Phase 4 — Production Hardening

### Reliability

- graceful shutdown;
- worker recovery;
- backpressure;
- circuit breaker;
- rate limit.

### Security

- secret rotation;
- HMAC;
- RBAC defense-in-depth;
- audit logs.

### Operations

- dashboard;
- alerts;
- SLO;
- incident runbook.

### Disaster Recovery

Kiểm tra:

```
Gateway machine dies
Session lost
DB survives
Outbox survives
Gateway redeployed
Session re-authenticated
Queue resumes
```

* * *

# 35\. Production Acceptance Test — Zalo Session Drop

Đây là test quan trọng nhất.

## Scenario

```
T0: Gateway CONNECTED
T1: 20 notifications queued
T2: Zalo session forcibly disconnected
T3: 10 more notifications created
T4: Gateway continues running
T5: Session reconnects
T6: Queue drains
```

### Expected

Trong thời gian disconnect:

```
WebApp = HEALTHY
Database = HEALTHY
Attendance = WORKING
Reports = WORKING
Outbox = DURABLE
Zalo = DEGRADED
```

Sau reconnect:

```
Queue resumes
No duplicate
No silent loss
```

* * *

# 36\. Chaos Test Suite

Nên có ít nhất các scenario:

```
C1 — Kill Gateway
C2 — Kill Zalo session
C3 — Network timeout
C4 — Gateway restart during send
C5 — Duplicate HTTP request
C6 — Duplicate webhook
C7 — AI timeout
C8 — AI provider unavailable
C9 — Large batch
C10 — Invalid recipient
C11 — DB temporarily unavailable
C12 — Process memory pressure
```

Acceptance criterion:

> Không scenario nào được làm mất hoặc corrupt dữ liệu nghiệp vụ trong `app-diemdanh`.

* * *

# 37\. SLO đề xuất

Các con số này nên được hiệu chỉnh sau baseline production, nhưng có thể dùng làm initial target.

## Core WebApp

```
Availability target: ≥ 99.9%
```

## Communication

Không đặt SLO kiểu:

```
"Zalo phải luôn available"
```

mà:

```
99.x% communication intents are eventually resolved
within defined delivery window
```

Tách:

```
Business availability
```

khỏi:

```
External messaging availability
```

* * *

# 38\. Operational State Machine

Gateway nên có state machine rõ ràng:

```
STARTING
   ↓
CONNECTING
   ↓
CONNECTED
   │
   ├───────────────┐
   ▼               │
DISCONNECTED       │
   │               │
   ▼               │
RECONNECTING ──────┘
   │
   ▼
AUTH_REQUIRED
```

Không để các module khác tự suy đoán trạng thái từ exception.

* * *

# 39\. Circuit Breaker

Khi Zalo liên tục fail:

```
CONNECTED
   ↓
many failures
   ↓
CIRCUIT OPEN
   ↓
stop hammering Zalo
   ↓
cooldown
   ↓
HALF OPEN
   ↓
test
   ↓
CONNECTED
```

Mục tiêu:

> Không biến một provider/session failure thành retry storm.

* * *

# 40\. Anti-Patterns phải cấm

### ❌ Anti-pattern 1

```
Attendance save
→ await Zalo
→ commit
```

### ❌ Anti-pattern 2

```
Zalo session stored inside Next.js request state
```

### ❌ Anti-pattern 3

```
Every Next.js instance owns a Zalo session
```

### ❌ Anti-pattern 4

```
AI call inside critical attendance transaction
```

### ❌ Anti-pattern 5

```
Retry forever
```

### ❌ Anti-pattern 6

```
No idempotency key
```

### ❌ Anti-pattern 7

```
Gateway directly mutates school database arbitrarily
```

### ❌ Anti-pattern 8

```
Browser → Zalo credentials
```

* * *

# 41\. Quyết định về Monorepo

Một điểm quan trọng:

> **Plan A không cấm Monorepo.**

Có thể có:

```
Monorepo
├── apps/
│   ├── app-diemdanh
│   └── app-zalobot
│
└── packages/
    ├── contracts
    ├── types
    └── utilities
```

nhưng runtime vẫn:

```
Process A = Next.js
Process B = Zalo Gateway
```

Đây là phương án rất tốt vì kết hợp:

- shared TypeScript contracts;
- shared CI/CD;
- shared lint/test;
- independent runtime;
- independent failure domain.

Do đó, có thể lấy phần tốt nhất của "Monorepo" mà **không chấp nhận rủi ro In-Process Embedding**.

* * *

# 42\. Target Architecture cuối cùng

```
                        USERS
                          │
                          ▼
                ┌───────────────────┐
                │   app-diemdanh    │
                │    Next.js        │
                └─────────┬─────────┘
                          │
                    Server Actions
                          │
                          ▼
                ┌───────────────────┐
                │ PostgreSQL        │
                │ Supabase          │
                │                   │
                │ System of Record  │
                └─────────┬─────────┘
                          │
                    Transactional
                       Outbox
                          │
                          ▼
                ┌───────────────────┐
                │ Communication     │
                │ Worker/Dispatcher  │
                └─────────┬─────────┘
                          │
                    Authenticated
                         HTTP
                          │
                          ▼
                ┌───────────────────┐
                │  app-zalobot      │
                │      :3871        │
                ├───────────────────┤
                │ API               │
                │ Queue/Worker      │
                │ Zero-AI           │
                │ AI Layer          │
                │ File Processor    │
                │ QR/Export         │
                │ Session Manager   │
                │ Observability     │
                └─────────┬─────────┘
                          │
                          ▼
                    Zalo Session
                          │
                          ▼
                         Zalo
```

* * *

# 43\. Final Architecture Score

| Dimension | Plan A | Plan B |
| --- | --- | --- |
| Enterprise architecture | 9.5/10 | 6/10 |
| Reliability | 9.5/10 | 5/10 |
| Fault isolation | 10/10 | 3/10 |
| Scalability | 9/10 | 4/10 |
| Maintainability | 9/10 | 6/10 |
| Initial implementation speed | 7/10 | 10/10 |
| Operational simplicity | 7/10 | 9/10 |
| Zalo session safety | 9.5/10 | 4/10 |
| AI workload isolation | 9.5/10 | 4/10 |
| Long-term recommendation | **YES** | **NO** |

* * *

# 44\. Master Roadmap

```
PHASE 1
Contract + Security + Basic Gateway
          │
          ▼
PHASE 2
Outbox + Idempotency + Retry + Webhook
          │
          ▼
PHASE 3
Business Use Cases + AI
          │
          ▼
PHASE 4
Chaos Testing + Observability + Production Hardening
```

### Go/No-Go gates

**Phase 1 → Phase 2**

- API contract stable;
- authentication works;
- session status observable;
- WebApp survives Gateway outage.

**Phase 2 → Phase 3**

- no duplicate messages under retry;
- outbox durable;
- DLQ operational;
- restart recovery verified.

**Phase 3 → Phase 4**

- all major use cases mapped;
- AI isolated;
- batch throttling verified;
- failure paths tested.

**Phase 4 → Production**

- chaos suite passes;
- security review passes;
- monitoring/alerting active;
- runbook available;
- rollback tested.

* * *

# 45\. Final Recommendation

## 🟢 MASTER PLAN A — APPROVED

Kiến trúc chính thức nên là:

> `**app-diemdanh**` **= Business System of Record**  
> `**app-zalobot**` **= Independent Communication/Automation Gateway**  
> **HTTP/Webhook + Outbox + Idempotency + Retry + DLQ**  
> **Zalo Session isolated from WebApp runtime**

Nếu muốn tối ưu developer experience, có thể đặt hai ứng dụng trong **cùng một monorepo**, nhưng tuyệt đối giữ **hai runtime/process và hai failure domains**.

### Tư duy kiến trúc quan trọng nhất

Không xây:

```
WebApp có thêm Zalo
```

Mà xây:

```
School Management Platform
        +
Communication Gateway
```

Hai hệ thống có thể phối hợp chặt chẽ nhưng **không được phụ thuộc sống còn vào nhau**.

Đặc biệt:

```
Zalo Session Drop
       ≠
School System Down
```

và:

```
AI Failure
       ≠
Attendance Failure
```

và:

```
Gateway Restart
       ≠
Loss of Business Data
```

Nếu giữ được ba nguyên tắc này cùng với 5 invariants ở trên, kiến trúc sẽ có nền tảng đủ tốt để mở rộng từ các thông báo điểm danh hiện tại sang toàn bộ communication platform của nhà trường mà không biến Zalo thành một điểm lỗi trung tâm.

Nếu cần triển khai tiếp, bước kỹ thuật hợp lý nhất là chuyển Master Plan này thành **`INTEGRATION_ARCHITECTURE.md` + OpenAPI contract v1 + PostgreSQL Outbox schema + sequence diagrams + test/acceptance checklist** để đội dev có thể bắt đầu Phase 1 mà không phải tự diễn giải lại kiến trúc.