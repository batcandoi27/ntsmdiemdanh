⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là phản biện theo góc nhìn **Senior System Architect & AppSec Lead**. Nhìn chung, cả 6 nhận xét đều **đúng hướng**, nhưng một số đề xuất đang quá tuyệt đối hoặc chưa đủ để xử lý production-grade.

# Kết luận nhanh

| # | Nhận xét | Đánh giá | Kết luận |
| --- | --- | --- | --- |
| 1 | PDF N×2 trang / Duplex | **Đúng, cần điều chỉnh** | Không nên chỉ dùng `maxLength` và co font |
| 2 | Race condition JSONB | **Đúng, cần bổ sung** | Tách ownership dữ liệu + version locking, không nên phụ thuộc JSONB merge đơn thuần |
| 3 | Lifecycle custom fields | **Đúng** | Snapshot là rất cần thiết; cần thêm schema versioning |
| 4 | Batch PDF Serverless OOM/timeout | **Đúng một phần** | Client-side print không thay thế hoàn toàn server-side export |
| 5 | Chuẩn hóa BHYT/CCCD/địa chỉ | **Đúng hướng, cần điều chỉnh** | Regex BHYT đề xuất không nên hard-code nếu không xác minh quy tắc nghiệp vụ hiện hành |
| 6 | Multi-tenant RBAC/fallback school | **Hoàn toàn đúng, nhưng chưa đủ** | Phải enforce tenant isolation ở database/query layer, không chỉ app layer |

* * *

# 1\. Rủi ro vỡ layout PDF N × 2 trang và lệch Duplex

## Đánh giá: **Đúng, nhưng giải pháp cần điều chỉnh**

Đây là rủi ro thực tế. Nếu business rule yêu cầu mỗi hồ sơ luôn chiếm đúng **2 trang vật lý**, một trường text làm xuất hiện trang thứ 3 sẽ phá vỡ toàn bộ thứ tự in hai mặt.

Ví dụ:

- HS 1: trang 1–2
- HS 2: dự kiến trang 3–4
- HS 1 bị overflow thành trang 1–3
- Toàn bộ pairing sau đó có thể bị sai

### Điểm cần phản biện

Không nên xem `maxLength` là giải pháp chính. Cùng một số ký tự nhưng:

- Unicode có độ rộng khác nhau;
- tên dài/ngắn khác nhau;
- xuống dòng khác nhau;
- browser/PDF engine có pagination khác nhau.

**`maxLength` chỉ là business validation, không chứng minh được layout fit.**

Cũng không nên tự động giảm font vô hạn. Việc đó có thể tạo PDF khó đọc và không phù hợp biểu mẫu hành chính.

## Kiến trúc đề xuất

### Layer 1 — Input policy

Mỗi trường có metadata riêng:

TypeScript

```
type FieldDefinition = {
  key: string;
  maxLength?: number;
  maxLines?: number;
  overflowPolicy?: "reject" | "truncate" | "continuation";
};
```

Dùng:

- UI validation;
- Zod/server validation;
- database constraint khi phù hợp.

### Layer 2 — Print-safe CSS

CSS

```
@media print {
  .profile-sheet {
    break-after: page;
    page-break-after: always;
  }

  .profile-record {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
```

Nếu mỗi hồ sơ bắt buộc 2 trang:

CSS

```
.profile-page {
  height: 297mm;
  overflow: hidden;
}

.profile-page.page-2 {
  break-after: page;
}
```

Tuy nhiên, `overflow: hidden` **không được dùng âm thầm làm mất dữ liệu**. Nó chỉ phù hợp khi preflight đã xác nhận không overflow.

### Layer 3 — PDF/layout preflight

Trước khi cho phép export:

```
Render → Measure → Validate page count → Export
```

Business invariant:

```
expectedPages = selectedProfiles.length * 2
actualPages === expectedPages
```

Nếu sai:

```
BLOCK EXPORT
```

và hiển thị chính xác hồ sơ nào gây lỗi.

## Quyết định đưa vào Master Plan

**Priority: P0**

-  Define PDF layout contract: `2 pages/profile`.
-  Add per-field `maxLength/maxLines`.
-  Validate tại UI + API.
-  Add print-specific CSS.
-  Add preflight page-count/layout validation.
-  Export phải fail/block nếu page count sai.
-  Integration test với Unicode, text dài, xuống dòng và dữ liệu cực đại.

* * *

# 2\. Race condition khi ghi đè JSONB

## Đánh giá: **Đúng, và là một trong các rủi ro nghiêm trọng nhất**

Kịch bản:

```
T0 Parent GET profile version 5
T1 Teacher GET profile version 5

T2 Parent sửa profile_data
T3 Parent UPDATE → version 6

T4 Teacher duyệt dựa trên dữ liệu cũ
T5 Teacher UPDATE full row
```

Nếu teacher gửi lại object cũ, thay đổi của phụ huynh có thể bị mất.

## Phản biện đề xuất hiện tại

Đề xuất:

> JSONB merge + optimistic locking

là đúng hướng nhưng **không đủ nếu không xác định ownership của từng field**.

`jsonb || jsonb` không giải quyết semantic conflict. Nó chỉ merge object; hai bên cùng sửa một key vẫn có thể mất dữ liệu.

## Thiết kế khuyến nghị

### Tách dữ liệu theo ownership

Ví dụ:

```
student_profiles
├── id
├── school_id
├── student_id
├── profile_data
├── profile_version
├── submitted_at
└── updated_at

profile_review
├── profile_id
├── status
├── teacher_notes
├── reviewed_by
├── reviewed_at
└── review_version
```

Nếu đơn giản hơn, vẫn có thể cùng table nhưng không đặt operational state vào JSONB:

```
id
school_id
student_id
profile_data JSONB
status
teacher_notes
is_locked
version
updated_at
```

### Optimistic locking bắt buộc

SQL

```
UPDATE student_profiles
SET
  profile_data = :new_data,
  version = version + 1,
  updated_at = NOW()
WHERE
  id = :id
  AND school_id = :school_id
  AND version = :expected_version;
```

Nếu affected rows = 0:

```
409 Conflict
PROFILE_VERSION_CONFLICT
```

Client phải reload hoặc cung cấp conflict-resolution flow.

### State transition phải atomic

Teacher approval không nên là generic JSON update:

SQL

```
UPDATE student_profiles
SET
  status = 'APPROVED',
  reviewed_at = NOW(),
  reviewed_by = :teacher_id,
  version = version + 1
WHERE
  id = :id
  AND school_id = :school_id
  AND version = :expected_version
  AND status = 'SUBMITTED';
```

Điều này tránh transition bất hợp lệ.

## Quyết định Master Plan

**Priority: P0**

-  Tách `profile_data` khỏi review/workflow fields.
-  Add integer `version NOT NULL DEFAULT 1`.
-  All mutation APIs require expected version.
-  Return `409 Conflict` on stale write.
-  Conditional state transitions.
-  Audit log cho submit/review/approve/reject.
-  Không dùng JSONB merge như cơ chế chống race condition chính.

* * *

# 3\. Vòng đời Custom Fields của GVCN

## Đánh giá: **Đúng**

Snapshot tại thời điểm submit là kiến trúc phù hợp để bảo toàn lịch sử.

Nếu definition hiện tại là:

JSON

```
{
  "field_key": "parent_income",
  "field_label": "Thu nhập bình quân",
  "is_active": true
}
```

Sau đó GVCN đổi thành:

JSON

```
{
  "field_key": "parent_income",
  "field_label": "Mức thu nhập gia đình",
  "is_active": true
}
```

Nếu PDF lịch sử chỉ join definition hiện tại, bản PDF cũ có thể hiển thị nhãn mới — sai về mặt lịch sử.

## Cần bổ sung: Schema Versioning

Không chỉ lưu:

JSON

```
{
  "field_key": "x",
  "field_label": "X",
  "value": "..."
}
```

Nên có:

JSON

```
{
  "field_key": "parent_income",
  "field_label_snapshot": "Thu nhập bình quân",
  "definition_version": 3,
  "value": "15000000",
  "submitted_at": "..."
}
```

### Soft delete

Không hard delete definition đang được dữ liệu lịch sử tham chiếu:

```
is_active = false
deleted_at = ...
deleted_by = ...
```

Có thể bổ sung lifecycle:

```
ACTIVE
ARCHIVED
RETIRED
```

## Trường hợp HS chuyển lớp

Cần quyết định rõ ownership:

- Field thuộc toàn trường?
- Field thuộc lớp?
- Field thuộc giáo viên?
- Field thuộc academic year/class assignment?

Không nên chỉ gắn field definition với `teacher_id`, vì GVCN thay đổi thì ownership dữ liệu sẽ khó xác định.

Khuyến nghị:

```
custom_field_definitions
├── school_id
├── scope_type
├── scope_id
├── academic_year_id
├── field_key
├── label
├── version
└── is_active
```

`scope_type` có thể là:

```
SCHOOL | CLASS
```

## Quyết định Master Plan

**Priority: P1**

-  Soft delete, không hard delete definition đã từng được dùng.
-  Immutable `field_key`.
-  Add definition version.
-  Snapshot label + key + version + value khi submit.
-  Historical PDF đọc snapshot, không đọc live definition.
-  Explicit scope: school/class/academic year.
-  Test HS chuyển lớp và GVCN thay đổi.

* * *

# 4\. Batch PDF Serverless: OOM và Timeout

## Đánh giá: **Đúng về rủi ro, nhưng đề xuất client-side là quá tuyệt đối**

Headless Chromium/Puppeteer/Playwright trên serverless khi render hàng chục đến hàng trăm trang có thể gặp:

- memory pressure;
- cold start;
- execution timeout;
- concurrent invocation pressure;
- giới hạn temporary storage;
- chi phí cao.

## Nhưng client-side print không phải universal replacement

Client-side:

TypeScript

```
window.print();
```

phù hợp khi:

- người dùng đã đăng nhập;
- dữ liệu đã tải về browser;
- cần in trực tiếp;
- batch vừa phải;
- không cần server-generated artifact.

Nhưng không phù hợp nếu cần:

- tạo PDF chính thức lưu trữ;
- background job;
- retry;
- gửi email;
- audit/export reproducibility;
- hàng nghìn hồ sơ.

## Kiến trúc khuyến nghị: Hybrid

### Mode A — Interactive Print

```
Browser
→ Fetch authorized data
→ Render HTML
→ Preflight
→ window.print()
```

Ưu điểm: gần như không tốn RAM render PDF phía server.

### Mode B — Async Server Export

```
Request Export
    ↓
Create Export Job
    ↓
Queue
    ↓
Worker
    ↓
Chunk N profiles
    ↓
Render chunk
    ↓
Validate
    ↓
Store artifact
    ↓
Merge / manifest
```

Quan trọng: **không render toàn bộ 86 trang trong một invocation nếu không có benchmark chứng minh an toàn**.

## Chunk theo đơn vị business

Vì 1 hồ sơ = 2 trang:

```
chunk = 5–20 profiles
```

Giá trị chính xác phải benchmark theo:

- runtime;
- memory;
- template complexity;
- ảnh/chữ ký;
- concurrent load.

## Quyết định Master Plan

**Priority: P0/P1**

-  Default interactive batch print cho use case in tức thì.
-  Server-side export phải asynchronous.
-  Add `export_jobs`.
-  Chunking theo số profile.
-  Per-chunk timeout/retry.
-  Idempotency key.
-  Benchmark memory/time trước khi chốt chunk size.
-  Monitor OOM, timeout, queue latency.

* * *

# 5\. Chuẩn hóa BHYT, CCCD và địa chỉ

## Đánh giá: **Đúng hướng nhưng cần tách "format validation" khỏi "domain truth"**

### CCCD

Regex:

regex

```
^[0-9]{12}$
```

là validation format cơ bản hợp lý nếu hệ thống chỉ chấp nhận số định danh cá nhân 12 chữ số.

Tuy nhiên, regex chỉ xác nhận:

> Có đúng 12 chữ số.

Nó không xác nhận:

> Đây là một CCCD hợp lệ, đang tồn tại hoặc thuộc đúng người đó.

Không nên hứa hẹn mức validation mạnh hơn khả năng thực tế.

### BHYT

Đề xuất:

regex

```
^[A-Z]{2}[0-9]{13}$
```

**cần điều chỉnh trước khi đưa vào production**.

Không nên hard-code regex từ peer review mà không có nguồn quy tắc nghiệp vụ/chính thức đã được xác nhận. Mã BHYT có thể có quy tắc cấu trúc đặc thù, và quy định nghiệp vụ có thể thay đổi.

Thiết kế tốt hơn:

TypeScript

```
normalizeBHYT(input)
validateBHYTFormat(input)
```

và regex/config phải được centralized:

```
domain validation policy
```

không copy-paste vào UI và API.

### Địa chỉ

Đồng ý mạnh với:

```
province_code
district_code
ward_code
street_address
```

Nhưng cần lưu ý dữ liệu địa giới hành chính thay đổi theo thời gian. Không nên chỉ lưu code nếu cần historical rendering.

Khuyến nghị:

```
province_code
province_name_snapshot
district_code
district_name_snapshot
ward_code
ward_name_snapshot
street_address
```

Hoặc resolve từ master data tại submit/export và snapshot nếu tài liệu phải giữ nguyên lịch sử.

## Security/privacy

CCCD và BHYT là dữ liệu nhạy cảm. Master Plan cần bổ sung:

- masking trên UI;
- RBAC;
- audit access;
- không ghi số đầy đủ vào logs;
- không đưa PII vào error tracking;
- encryption/managed encryption theo khả năng nền tảng;
- retention policy.

## Quyết định Master Plan

**Priority: P0**

-  Normalize trước validation.
-  CCCD format validator.
-  BHYT validator dựa trên business/source-of-truth đã xác nhận.
-  Centralized domain validators.
-  Address reference/master data.
-  Structured address + snapshot strategy.
-  PII masking và log redaction.
-  Access audit cho dữ liệu định danh.

* * *

# 6\. Multi-tenant, RBAC và fallback tên trường

## Đánh giá: **Hoàn toàn đúng, nhưng đây phải là Security Architecture, không chỉ là feature**

Đây là rủi ro AppSec nghiêm trọng nhất trong cả 6 mục.

Chỉ thêm:

```
school_id + index
```

là **không đủ**.

Nếu API query như:

SQL

```
SELECT * FROM student_profiles
WHERE id = :id;
```

thì attacker có thể thử ID thuộc tenant khác.

Mọi data access phải có tenant scope:

SQL

```
WHERE id = :id
  AND school_id = :current_school_id
```

## Tenant context phải server-derived

Không tin:

JSON

```
{
  "school_id": "school-attacker-selected"
}
```

từ client.

Tenant context phải derive từ:

```
Authenticated User
→ Membership / Session
→ Authorized School Context
```

## RBAC theo lớp

Không nên chỉ check:

```
role = TEACHER
```

Phải có authorization relation:

```
teacher
  ↓ assigned_to
class
  ↓ contains
student
  ↓ owns
profile
```

Ví dụ approval:

```
Can user U approve profile P?

U authenticated?
AND U belongs to school S?
AND P belongs to school S?
AND U assigned to P.student.current_class?
AND role permits APPROVE?
```

## Database protection

Nếu stack hỗ trợ, nên áp dụng database-level isolation như Row-Level Security.

App-layer RBAC rất dễ bị bỏ sót ở một endpoint mới.

## Fallback tên trường

Đồng ý:

```
Missing school configuration
→ BLOCK official export
```

Không:

```
Missing school configuration
→ silently use "Trường ..."
```

Vì đây là tài liệu hành chính. Silent fallback tạo ra lỗi khó phát hiện.

Nên trả:

```
SCHOOL_CONFIGURATION_INCOMPLETE
```

và chỉ định trường cấu hình còn thiếu.

## Quyết định Master Plan

**Priority: P0 — Security Gate**

-  `school_id NOT NULL` trên mọi tenant-owned entity.
-  Composite indexes theo tenant/query pattern.
-  Every repository/query tenant-scoped.
-  Server-derived tenant context.
-  Object-level authorization cho student/profile/export.
-  RBAC + class assignment checks.
-  Database RLS nếu platform hỗ trợ.
-  Negative authorization tests.
-  No silent fallback for official school identity.
-  Block export khi cấu hình trường thiếu.
-  Audit log export/download/approval.

* * *

# Master Implementation Plan — bản tích hợp đề xuất

## Phase 0 — Architecture & Security Invariants

**P0, phải hoàn thành trước feature expansion**

### A. Data ownership

Xác định:

```
Profile data:
- parent/student owns editable content

Workflow data:
- system/teacher owns review state

School data:
- school admin owns organization configuration

Custom field definition:
- scoped administrative owner owns schema

Historical submission:
- immutable snapshot
```

### B. Invariants

Bắt buộc document và test:

```
INV-01 Every tenant-owned row has school_id.
INV-02 No cross-school object access.
INV-03 Parent cannot modify locked/approved data.
INV-04 Teacher approval uses authorized class scope.
INV-05 Stale write must not silently overwrite.
INV-06 Historical submission survives definition changes.
INV-07 Official PDF export requires valid school configuration.
INV-08 One profile renders exactly 2 pages when using duplex template.
INV-09 Export cannot silently omit overflowed content.
INV-10 PII must not appear in application logs/errors.
```

* * *

## Phase 1 — Database Migration

### 1\. Profile

```
student_profiles
- id
- school_id NOT NULL
- student_id
- profile_data JSONB
- status
- is_locked
- version INTEGER NOT NULL DEFAULT 1
- submitted_at
- updated_at
```

### 2\. Review

Có thể tách:

```
profile_reviews
- id
- school_id
- profile_id
- teacher_id
- status
- teacher_notes
- version
- reviewed_at
```

### 3\. Custom fields

```
custom_field_definitions
- id
- school_id
- scope_type
- scope_id
- academic_year_id
- field_key
- field_label
- version
- is_active
- created_at
- retired_at
```

### 4\. Snapshot

```
profile_custom_field_snapshots
- profile_id
- field_key
- field_label_snapshot
- definition_version
- value
```

### 5\. Export jobs

```
export_jobs
- id
- school_id
- requested_by
- status
- total_profiles
- processed_profiles
- artifact_location
- error_code
- created_at
- completed_at
```

* * *

## Phase 2 — Validation Layer

### Shared domain validation

```
normalize()
    ↓
schema validation
    ↓
business validation
    ↓
authorization validation
```

Áp dụng cả:

```
UI
API
Background Worker
```

Không để UI là nơi duy nhất validate.

### PII

Implement:

```
maskCCCD()
maskBHYT()
redactSensitiveFields()
```

Logging middleware phải tự động redact.

* * *

## Phase 3 — Concurrency & Workflow

### API contract

Mutation request:

JSON

```
{
  "version": 12,
  "data": {}
}
```

Server:

```
version match?
├── Yes → atomic update → version + 1
└── No → 409 VERSION_CONFLICT
```

### State machine

Ví dụ:

```
DRAFT
  ↓ submit
SUBMITTED
  ├── approve → APPROVED → LOCKED
  └── reject  → REJECTED → editable
```

Không cho arbitrary status update.

* * *

## Phase 4 — Custom Field Lifecycle

Flow submit:

```
Load active definitions
↓
Validate submitted values
↓
Create immutable snapshot
↓
Persist profile submission
↓
Advance status
```

Historical rendering:

```
PDF
↓
Read snapshot
NOT live definitions
```

* * *

## Phase 5 — PDF Reliability

### Preflight contract

```
selected profiles = N
expected pages = N × 2
```

Pipeline:

```
Validate Data
↓
Validate School Configuration
↓
Validate Field Length/Lines
↓
Render Print Layout
↓
Preflight Page Count/Layout
↓
Pass? ── No → show blocking diagnostics
  ↓ Yes
Print / Export
```

### Diagnostics

Ví dụ:

```
PROFILE_PDF_OVERFLOW
student_id: ...
field: father_occupation
expected: 2 pages
actual: 3 pages
```

Không trả generic:

```
PDF generation failed
```

* * *

## Phase 6 — Export Strategy

### Interactive

```
Batch <= configured threshold
→ Client render
→ Preflight
→ window.print()
```

### Background

```
Large batch / official artifact
→ export job
→ queue
→ chunk worker
→ retry
→ store result
```

Không hard-code ngưỡng trước benchmark.

* * *

## Phase 7 — Multi-Tenant AppSec Gate

Mỗi endpoint cần matrix:

| Action | Parent | Teacher | School Admin |
| --- | --- | --- | --- |
| Read own profile | Yes | Assigned class | Yes |
| Edit draft | Yes | Policy-dependent | Yes |
| Approve | No | Assigned class | Policy |
| Configure fields | No | Scoped policy | Yes |
| Batch export | No/limited | Assigned class | Yes |

Và test bắt buộc:

```
Parent A → Parent B profile = DENY
Teacher Class A → Class B profile = DENY
School A admin → School B data = DENY
Manipulated school_id request = DENY
Unassigned teacher approval = DENY
```

* * *

# Thứ tự ưu tiên thực thi cuối cùng

## P0 — Không được go-live nếu thiếu

1. Multi-tenant isolation và object-level authorization.
2. `school_id` tenant scope.
3. Optimistic locking.
4. Tách workflow fields khỏi JSONB profile ownership.
5. CCCD/BHYT/PII validation và log redaction.
6. Chặn silent fallback cấu hình trường.
7. PDF overflow/preflight.
8. Serverless export architecture không render unbounded batch trong một request.

## P1 — Nên hoàn thành trước production ổn định

9. Custom-field soft delete.
10. Snapshot immutable.
11. Definition versioning.
12. Async export queue/chunking.
13. Export monitoring/retry/idempotency.
14. Address master-data integration.
15. Historical address/display snapshot.

## P2 — Hardening

16. Database RLS nếu phù hợp.
17. Advanced conflict-resolution UI.
18. PDF golden/snapshot regression testing.
19. Load/chaos testing batch export.
20. Automated authorization regression suite.
21. Audit dashboard và anomaly monitoring.

# Kết luận kiến trúc

Peer Reviewer **đã phát hiện đúng 6 nhóm rủi ro quan trọng**, đặc biệt là:

- tenant isolation;
- concurrent updates;
- PDF layout invariants;
- batch rendering scalability.

Tuy nhiên, tôi **không khuyến nghị đưa nguyên văn các giải pháp vào implementation**. Ba điểm cần sửa quan trọng nhất là:

1. **`maxLength` không thể thay thế PDF preflight thực tế**.
2. **JSONB merge không thể thay thế concurrency control và field ownership**.
3. **Client-side printing không thể thay thế hoàn toàn server-side asynchronous export**.
4. **Regex BHYT cần được xác nhận theo source-of-truth nghiệp vụ trước khi hard-code**.
5. **`school_id` + index không đủ; authorization phải được enforce xuyên suốt query/object/database boundary**.

Với Master Implementation Plan đã cập nhật ở trên, 6 nhận xét nên được chuyển từ trạng thái **“peer review recommendations”** thành các **architecture invariants và release gates có thể kiểm thử được**. Đây là cách biến chúng từ checklist thiết kế thành các ràng buộc kỹ thuật thực sự ngăn lỗi và lỗ hổng khi triển khai.