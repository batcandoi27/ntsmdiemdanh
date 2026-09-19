# BÁO CÁO THẨM ĐỊNH BẢO MẬT ĐỘC LẬP TỪ CHATGPT WEB (LUNA - PORT 17841)

**Mã Task:** TASK-AUTO-QA-APPSEC-001
**Thời gian:** 2026-09-19_203200
**Bridge Endpoint:** http://127.0.0.1:17841
**Model:** chatgpt-web/luna

---

> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.# Thẩm định AppSec độc lập — `app-diemdanh`

## Kết luận điều hành

Dựa trên **bằng chứng rà quét do Antigravity cung cấp**, tôi đánh giá các phát hiện **SEC-01 → SEC-09 là hợp lý về mặt kiến trúc và logic**, với **SEC-01, SEC-02, SEC-03 thực sự thuộc nhóm lỗ hổng phải khóa trước khi coi hệ thống đủ điều kiện production**.

Điểm quan trọng nhất: **RLS đang tốt không cứu được các endpoint/server action dùng `supabaseAdmin` nếu chính application layer không xác thực người gọi**. Supabase xác nhận secret/service-role có quyền vượt RLS và phải chỉ được sử dụng trên backend sau khi application tự thực hiện authorization. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

Tôi sẽ không coi đây là lỗi "cấu hình nhỏ". Đây là một **authorization boundary failure**.

* * *

# 1\. Lớp 1 — Severity & Exploitability

## SEC-01 — `/api/admin/backup-zip`

**Severity: CRITICAL — xác nhận.**

Đây là phát hiện nguy hiểm nhất về mặt **data confidentiality**.

Theo mô tả, route:

```
GET /api/admin/backup-zip
        ↓
supabaseAdmin
        ↓
SELECT *
        ↓
14 bảng nhạy cảm
```

nhưng không có:

```
Authentication
+
Authorization
+
canExportData
```

Điều này đặc biệt nghiêm trọng vì `supabaseAdmin` không còn được bảo vệ bởi RLS theo cách client thông thường. Supabase mô tả service/secret key là cơ chế elevated access và bypass RLS. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

### Khả năng khai thác

Nếu mô tả của Antigravity chính xác, attacker không cần:

- đánh cắp tài khoản admin;
- bypass RLS;
- đoán UUID;
- khai thác SQL injection;
- biết cấu trúc database đầy đủ.

Chỉ cần gọi endpoint trực tiếp.

Ví dụ về **kiểu kiểm thử** mà pentester có thể thực hiện:

Bash

```
curl -i https://<domain>/api/admin/backup-zip
```

Nếu server trả về HTTP `200` và archive chứa dữ liệu, đây là **unauthenticated bulk data exposure**.

### Tác động

Đặc biệt đáng lo vì danh sách được mô tả gồm:

- học sinh;
- điểm danh;
- quan hệ phụ huynh/Zalo;
- message logs;
- dữ liệu quản trị.

Đây không còn là IDOR đơn lẻ mà là **mass data exposure**.

OWASP yêu cầu authorization phải được kiểm tra ở server cho từng chức năng/object; việc một endpoint có ID hay URL "admin" không tạo ra quyền truy cập. [OWASP Cheat Sheet Series+1](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html?utm_source=chatgpt.com)

### Patch bắt buộc

Tôi khuyến nghị không chỉ kiểm tra:

TypeScript

```
role === 'admin'
```

mà kiểm tra **permission cụ thể**:

```
authenticated
        ↓
active account
        ↓
role/permission
        ↓
canExportData === true
        ↓
perform export
```

Tốt hơn nữa:

TypeScript

```
requirePermission(user, "data.export")
```

thay vì rải:

TypeScript

```
if (profile.role !== "admin")
```

khắp codebase.

* * *

# 2\. SEC-02 — `admin-users.ts`

**Severity: CRITICAL — xác nhận.**

Hai action:

```
deleteUserAccount(targetUid)
adminCreateUser(input)
```

đều là **high-impact administrative primitives**.

Nếu thực sự không có server-side authentication/authorization thì attacker có thể trực tiếp gọi server action mà không cần UI.

Điểm này cực kỳ quan trọng:

> Ẩn nút "Delete User" hoặc "Create Admin" trên React UI hoàn toàn không phải security control.

OWASP nhấn mạnh access control phải được thực thi phía server; client-side checks chỉ có giá trị UX. [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html?utm_source=chatgpt.com)

### `adminCreateUser()` còn nguy hiểm hơn

Theo dữ kiện:

```
input.role = "admin"
input.is_active = true
```

có thể đi vào:

```
supabaseAdmin.auth.admin.createUser()
+
profiles.insert()
```

Đây là **vertical privilege escalation → administrative account creation**.

Một khi attacker tạo được admin account, phạm vi sự cố chuyển từ:

```
unauthorized action
```

sang:

```
persistent privileged compromise
```

Do đó tôi sẽ xếp SEC-02 vào nhóm:

**P0 — patch immediately.**

* * *

# 3\. SEC-03 — `settings.ts`

**Severity: CRITICAL — xác nhận.**

Có hai vấn đề riêng.

### A. `clearAttendance()`

Nếu action thực sự:

```
client
  ↓
clearAttendance()
  ↓
delete/clear attendance
```

mà không xác thực session thì đây là **unauthenticated destructive operation**.

Tác động có thể là:

```
Confidentiality: thấp hơn SEC-01
Integrity: cực cao
Availability/data loss: cực cao
```

### B. `updaterRole` từ client

Đây là anti-pattern rất rõ:

TypeScript

```
saveRoleCodes(roleCodes, updaterRole)
```

rồi:

TypeScript

```
if (updaterRole !== "admin")
```

Không được coi:

```
updaterRole = "admin"
```

là bằng chứng người gọi là admin.

Attacker hoàn toàn có thể thay:

JSON

```
{
  "updaterRole": "admin"
}
```

OWASP đặc biệt khuyến nghị authorization phải được quyết định server-side và không được để client thao túng tham số làm thay đổi kết quả authorization. [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html?utm_source=chatgpt.com)

### Kiến trúc đúng

```
Client:
    roleCodes
        ↓
Server Action
        ↓
getCurrentUser()
        ↓
getAppUser(user.id)
        ↓
permission check
        ↓
saveRoleCodes()
```

Không có:

```
client → updaterRole → authorization decision
```

* * *

# 4\. So sánh ba CRITICAL

| Finding | Loại | Confidentiality | Integrity | Privilege Escalation | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Mass data exposure | **Rất cao** | Trung bình | Có thể | **P0** |
| SEC-02 | Admin function exposure | Cao | **Rất cao** | **Rất cao** | **P0** |
| SEC-03 | Destructive/action authorization | Trung bình | **Rất cao** | Cao | **P0** |

Không nên cố xác định "lỗ nào nguy hiểm nhất" theo một điểm số duy nhất. Chúng tạo thành **ba đường tấn công khác nhau**:

```
SEC-01 → DATA EXFILTRATION

SEC-02 → ACCOUNT / PRIVILEGE TAKEOVER

SEC-03 → DATA MANIPULATION / DESTRUCTION
```

* * *

# 5\. Lớp 2 — Fail-Open / GS-10

Đây là nhóm lỗi tôi đặc biệt đồng ý với Antigravity.

## SEC-05

Pattern:

TypeScript

```
if (token && token !== masterKey && token !== ADMIN_KEY) {
    return 401;
}
```

logic thực tế là:

```
token = undefined / ""
        ↓
token && ...
        ↓
false
        ↓
không return 401
        ↓
request tiếp tục
```

Đây chính là **fail-open authentication**.

Logic bắt buộc phải có dạng:

TypeScript

```
if (
  !token ||
  (token !== masterKey && token !== process.env.ADMIN_KEY)
) {
  return unauthorized();
}
```

hay tốt hơn là một helper trung tâm:

TypeScript

```
const auth = await authenticateAdminRequest(req);

if (!auth.ok) {
    return auth.response;
}
```

* * *

# 6\. SEC-06 — Zalo webhook

Pattern:

TypeScript

```
if (token && token !== expectedToken)
```

có cùng lỗi.

Webhook endpoint về bản chất là **public network entry point**.

Phải giả định:

```
Internet → attacker → POST /api/zalo/webhook
```

chứ không giả định:

```
Zalo → trusted request
```

### Quy tắc

Nếu webhook sử dụng shared secret:

```
missing token → 401
wrong token   → 401
correct token → process
```

Không tồn tại trạng thái:

```
missing token → continue
```

Nếu provider hỗ trợ signature/HMAC thì HMAC còn phù hợp hơn shared bearer token.

* * *

# 7\. SEC-07 — Payment webhook

Đây là lỗi **configuration fail-open**:

TypeScript

```
if (expectedSecret) {
    verify(...)
}
```

Nếu environment variable không tồn tại:

```
expectedSecret = undefined
        ↓
if(undefined) = false
        ↓
verification skipped
```

Đây là pattern phải loại bỏ hoàn toàn trong production.

Nên là:

TypeScript

```
if (process.env.NODE_ENV === "production" &&
    !process.env.PAYMENT_WEBHOOK_SECRET) {
    throw new Error("PAYMENT_WEBHOOK_SECRET is not configured");
}
```

và request:

```
missing signature → 401
invalid signature  → 401
valid signature    → process
```

**Thiếu secret phải làm hệ thống chết an toàn, không phải chạy tiếp.**

* * *

# 8\. SEC-08 — Self-elevation

```
requestedRole = "principal"
        ↓
is_active = true
```

là một authorization design flaw.

Đối với hệ thống trường học, tôi khuyến nghị registration state machine:

```
REGISTERED
    ↓
PENDING_APPROVAL
    ↓
ADMIN_APPROVED
    ↓
ACTIVE
```

Role assignment phải nằm trong administrative workflow.

Đăng ký mới chỉ nên được phép chọn/nhận role có privilege thấp nhất phù hợp.

OWASP cũng khuyến nghị account mới phải có **minimal or no access by default**. [OWASP Developer Guide](https://devguide.owasp.org/en/04-design/02-web-app-checklist/07-access-controls/?utm_source=chatgpt.com)

* * *

# 9\. SEC-09 — Hardcoded secrets

**Severity: MEDIUM theo scan, nhưng remediation priority thực tế cao hơn MEDIUM nếu các giá trị này còn hoạt động.**

Đặc biệt:

```
TBC_MASTER_WEBHOOK_SECRET_2026
sk-zalokeybatcandoi
```

Nếu đây là secret thật và đã từng được deploy:

> **Không chỉ xóa khỏi source code. Phải rotate/revoke secret.**

Quy trình:

```
1. Identify secret
2. Revoke old secret
3. Generate new secret
4. Put in secret manager / env
5. Update deployment
6. Search Git history
7. Search logs/build artifacts
8. Verify old secret no longer works
```

Supabase cũng khuyến cáo secret/service-role credentials chỉ tồn tại trong trusted server environment và không được đưa vào frontend/source control. [Supabase+1](https://supabase.com/docs/guides/database/secure-data?utm_source=chatgpt.com)

* * *

# 10\. Lớp 3 — Những điểm phòng thủ đang làm đúng

Đây là phần rất đáng ghi nhận.

## 10.1 RLS — điểm mạnh thực sự

Kết quả:

```
anon write test
0 rows modified
PASS
```

là một tín hiệu tốt.

Supabase khuyến nghị kết hợp:

```
Authentication
+
Authorization
+
RLS
+
least privilege
```

chứ không dùng RLS đơn độc. [Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

Kiến trúc hiện tại có một nền tảng tốt:

```
Browser
   ↓
Anon/Authenticated client
   ↓
RLS
   ↓
PostgreSQL
```

Nhưng cần phân biệt:

```
RLS protects direct database access
```

với:

```
application authorization protects privileged server operations
```

Đây là hai lớp khác nhau.

* * *

# 11\. Client/Server boundary

Finding:

```
supabase-admin.ts
guard typeof window === undefined
```

là một **best practice quan trọng**.

Việc không bundle service-role key vào browser là chính xác.

Supabase hiện cũng xác nhận secret/service-role key phải chỉ được dùng trong môi trường server/trusted backend. [Supabase+1](https://supabase.com/docs/guides/database/secure-data?utm_source=chatgpt.com)

Đồng thời:

```
supabase-adapter.ts
    ↓
anon client
    ↓
RLS
```

giúp giảm đáng kể nguy cơ accidental privilege leakage.

* * *

# 12\. Read-Only Impersonation

Thiết kế:

```
View-As Mode
    ↓
sessionStorage theo tab
    ↓
canEditAttendance = false
editWindowMinutes = 0
```

là một ý tưởng defense-in-depth tốt.

Đặc biệt việc ép:

```
READ ONLY
```

thay vì chỉ đổi UI là đúng hướng.

Tuy nhiên có một nguyên tắc tuyệt đối:

> **View-As phải được coi là UX/simulation control, không phải authorization boundary.**

Nếu API phía server vẫn cho phép mutation thì attacker không cần đi qua View-As UI.

Vì vậy test bắt buộc phải là:

```
View-As Principal
   ↓
POST mutation API trực tiếp
   ↓
MUST = 403
```

* * *

# 13\. Lớp 4 — Remediation Roadmap

## P0 — Khóa ngay

### 1\. `backup-zip`

```
authenticate
+
authorize canExportData
+
audit log
```

### 2\. `admin-users`

Bảo vệ:

```
adminCreateUser
deleteUserAccount
```

### 3\. `settings`

Bảo vệ:

```
clearAttendance
saveRoleCodes
```

và **xóa hoàn toàn `updaterRole` khỏi authorization logic**.

* * *

# 14\. P1 — Đóng toàn bộ Fail-Open

Search toàn codebase các pattern:

```
if (token &&
if (secret &&
if (expectedSecret &&
if (authorization &&
if (role &&
```

và đặc biệt:

```
token && token !== ...
```

Mục tiêu:

```
missing credential
        ↓
DENY
```

không phải:

```
missing credential
        ↓
SKIP CHECK
```

OWASP khuyến nghị automated authorization regression testing vì access-control thường bị phá vỡ khi hệ thống tiếp tục phát triển. [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Regression_Testing_Cheat_Sheet.html?utm_source=chatgpt.com)

* * *

# 15\. P1 — Tạo Authorization Kernel duy nhất

Tôi khuyến nghị kiến trúc:

```
src/lib/security/
    auth.ts
    authorization.ts
    permissions.ts
    audit.ts
    webhook-auth.ts
```

Ví dụ conceptual API:

TypeScript

```
requireAuthenticatedUser()

requireActiveUser()

requireRole("admin")

requirePermission("attendance.clear")

requirePermission("data.export")

requireWebhookSignature()

requireProductionSecret()
```

Sau đó mọi:

```
API Route
Server Action
Webhook
Admin operation
Export
Destructive operation
```

đều đi qua lớp này.

Mục tiêu là **không còn mỗi developer tự viết một biến thể authorization riêng**.

* * *

# 16\. P2 — Security headers

SEC-10 hợp lý ở mức hardening.

Có thể bổ sung tối thiểu:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY / SAMEORIGIN
Referrer-Policy
Permissions-Policy
Content-Security-Policy
```

và kiểm soát source maps production.

Tuy nhiên:

> **Không được để SEC-10 làm phân tán nguồn lực khỏi SEC-01 → SEC-08.**

Security headers không thể bù cho missing authorization.

* * *

# 17\. SEC-04 — `/api/analyze`

**HIGH — hợp lý.**

Endpoint đọc:

```
local Excel
    ↓
XLSX parser
    ↓
JSON preview
```

Nếu endpoint production-accessible thì đây là:

```
debug/data disclosure endpoint
```

Tối thiểu:

TypeScript

```
if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
    );
}
```

Nhưng tốt hơn:

**không deploy endpoint này vào production build/route surface nếu nó chỉ phục vụ development.**

* * *

# 18\. Một bước tôi đặc biệt khuyến nghị: Authorization Regression Suite

Sau khi sửa, **không nên chỉ chạy TypeScript/lint/RLS test**.

Phải có ma trận:

| Actor | Read | Write | Delete | Export | Admin |
| --- | --- | --- | --- | --- | --- |
| Anonymous | DENY | DENY | DENY | DENY | DENY |
| Teacher | ALLOW theo scope | ALLOW theo scope | DENY | DENY/Scope | DENY |
| Principal | ALLOW | theo permission | theo permission | theo permission | DENY/Scope |
| Admin | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| View-As | ALLOW read | **DENY** | **DENY** | policy | **DENY** |

Sau đó test **trực tiếp HTTP/API**, không chỉ qua UI.

OWASP đặc biệt đề xuất kiểm thử horizontal và vertical privilege escalation bằng nhiều user/role độc lập. [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Regression_Testing_Cheat_Sheet.html?utm_source=chatgpt.com)

* * *

# 19\. Các test bắt buộc sau khi patch

Tôi sẽ yêu cầu Antigravity chứng minh ít nhất:

### Test A — Anonymous

```
GET /api/admin/backup-zip
POST adminCreateUser
POST deleteUserAccount
POST clearAttendance
POST saveRoleCodes
GET /api/admin/classes-list
POST /api/zalo/webhook
POST /api/webhook/payment
```

**Expected: 401/403 trên tất cả endpoint nhạy cảm.**

### Test B — Authenticated Teacher

Thử:

```
export
delete user
create admin
clear attendance
modify role codes
```

**Expected: 403.**

### Test C — Parameter tampering

JSON

```
{
  "updaterRole": "admin"
}
```

với session teacher.

**Expected: 403.**

### Test D — Role tampering

JSON

```
{
  "requestedRole": "admin"
}
```

hoặc:

JSON

```
{
  "requestedRole": "principal"
}
```

trong registration.

**Expected: không thể tự activate privileged account.**

### Test E — Missing secret

Xóa tạm:

```
PAYMENT_WEBHOOK_SECRET
```

production-like environment.

**Expected: application từ chối startup hoặc webhook request, không process payment.**

### Test F — Missing token

```
Authorization: <omitted>
```

**Expected: 401.**

Đây chính là test phát hiện các lỗi `if (token && ...)`.

* * *

# 20\. Một vấn đề còn thiếu trong báo cáo hiện tại

Tôi sẽ yêu cầu scan vòng 2 tập trung vào **server-side mutation surface**.

Không chỉ tìm:

```
/api/admin/*
```

mà phải enumerate:

```
app/api/**/route.ts
app/actions/**/*.ts
server actions
RPC/functions
webhooks
cron endpoints
export endpoints
backup endpoints
file download endpoints
admin utilities
```

Sau đó tạo bảng:

```
ENTRYPOINT
AUTHENTICATION
AUTHORIZATION
RESOURCE SCOPE
MUTATION
SERVICE_ROLE
RATE LIMIT
AUDIT LOG
FAIL-CLOSED
```

Đây sẽ là **Security Control Inventory** của ứng dụng.

* * *

# 21\. Security Verdict

### Trạng thái hiện tại

**AUDIT\_FINDINGS\_CONFIRMED**

với ý nghĩa:

- các CRITICAL được mô tả có cơ sở kỹ thuật rõ ràng;
- fail-open patterns là lỗi logic xác thực thực sự;
- kiến trúc RLS/client-server có nhiều điểm phòng thủ tốt;
- nhưng privileged server operations hiện có những authorization gap không thể chấp nhận trong production.

Tôi **không khuyến nghị coi phiên bản hiện tại là security-approved production release** cho đến khi P0 được đóng và có regression evidence.

Sau khi:

```
P0 fixed
   ↓
P1 fail-open sweep
   ↓
P2 hardening
   ↓
authorization regression suite
   ↓
unauthenticated + low-privilege penetration tests
   ↓
audit logs verified
```

thì có thể tiến hành một vòng **security re-audit** để xác nhận trạng thái mới.

* * *

# 22\. Kiến trúc dài hạn tôi khuyến nghị

Đối với hệ thống dữ liệu trường học, nên chuyển dần từ:

```
Role-based authorization
```

sang:

```
Identity
   ↓
Account status
   ↓
Role
   ↓
Permission
   ↓
Resource scope
   ↓
Action
```

Ví dụ:

```
teacher
  └── attendance.write
       └── class_scope = assigned_classes
```

thay vì:

```
if role === "teacher"
    allow everything attendance-related
```

Và các thao tác đặc biệt:

```
EXPORT_STUDENT_DATA
DELETE_ATTENDANCE
CREATE_ADMIN
DELETE_USER
MODIFY_ROLE
PAYMENT_RECONCILIATION
```

nên trở thành **explicit permissions**, có:

```
authorization
+
audit trail
+
actor
+
timestamp
+
target
+
before/after
+
request correlation ID
```

Đặc biệt với dữ liệu học sinh, **auditability** nên được coi là một security control chứ không chỉ là tính năng quản trị.

* * *

## Tóm tắt cuối cùng

```
                    CURRENT
                       │
          ┌────────────┴────────────┐
          │                         │
       DEFENSES                  GAPS
          │                         │
       RLS PASS                 SEC-01 CRITICAL
       No client secret         SEC-02 CRITICAL
       Adapter isolation        SEC-03 CRITICAL
       API rate limit           SEC-05 HIGH
       Read-only View-As        SEC-06 HIGH
                                SEC-07 HIGH
                                SEC-08 MEDIUM
                                SEC-09 MEDIUM
                                SEC-10 HARDENING
          │                         │
          └────────────┬────────────┘
                       ↓
                 PATCH P0/P1
                       ↓
            AUTHORIZATION REGRESSION
                       ↓
                RE-AUDIT
                       ↓
             PRODUCTION APPROVAL
```

**Điểm mấu chốt:** RLS của hệ thống là một nền tảng tốt, nhưng `supabaseAdmin`/service-role tạo ra một **trusted server boundary**. Mỗi route/action vượt qua boundary đó phải tự xác thực và authorization trước khi thao tác dữ liệu. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

**END OF HANDOFF**
