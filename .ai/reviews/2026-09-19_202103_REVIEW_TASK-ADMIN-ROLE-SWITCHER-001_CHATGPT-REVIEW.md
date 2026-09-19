---
task_id: "TASK-ADMIN-ROLE-SWITCHER-001"
topic: "Hậu kiểm Độc lập Cuối cùng (Final Audit & Approval): Chức năng Chuyển đổi vai trò kiểm tra giao diện (Admin Role Impersonation / View-As Mode)"
verdict: "APPROVED"
bridge_endpoint: "http://127.0.0.1:17841/v1/responses"
turn_id: "turn_0c99fcc4-53f7-4c43-91b1-1c809a9af865"
thread_id: "thread_c07f9d27-6d79-4baa-b104-9e33066c5764"
model_used: "chatgpt-web/luna"
response_timestamp: "2026-09-19T13:21:03.127Z"
http_status: "200 OK"
raw_text_length: 14873
duration_seconds: 49
---

> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.# 5-Layer Audit — Admin Role Impersonation / View-As Mode

**Phạm vi đánh giá:** dựa trên source/diff và kết quả `npx tsc --noEmit = PASS (0 errors)` được cung cấp trong hồ sơ triển khai. Tôi **không coi đây là bằng chứng đã chạy integration/E2E hoặc kiểm thử trực tiếp trên Supabase**.

## EXECUTIVE SUMMARY

Kiến trúc hiện tại **đã thực hiện khá tốt phần “View-As UI Simulation”**, đặc biệt ở việc:

- giữ `realAppUser` tách khỏi `appUser`;
- lưu trạng thái theo `sessionStorage`, nên không dùng chung giữa các tab;
- có cơ chế vào/ra impersonation rõ ràng;
- có banner nhận diện trạng thái;
- có keyboard shortcut;
- có chọn lớp;
- TypeScript compile sạch.

Tuy nhiên, có **một lỗi kiến trúc bảo mật quan trọng** khiến tôi **chưa thể APPROVED**:

> `READ_ONLY` hiện mới là **trạng thái ở frontend**, chưa phải một **quyền Read-Only được enforce ở backend/database**.

Trong code, `startImpersonation()` chỉ thay đổi `appUser.permissions`, `role`, `assignedClassIds`... nhưng **Supabase session/token vẫn là của Admin thật**. Vì vậy, nếu một chức năng gọi trực tiếp Supabase và backend/RLS dựa vào identity/role thật của Admin, request đó vẫn được thực hiện dưới quyền Admin.

OWASP khuyến nghị authorization không được chỉ dựa vào JavaScript phía client; quyền phải được kiểm tra tại server/backend. [OWASP Cornucopia+1](https://cornucopia.owasp.org/cards/FRE8?utm_source=chatgpt.com) Supabase cũng xác định RLS/grants mới là lớp thực thi quyền truy cập dữ liệu ở database. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

* * *

# 1\. Layer 1 — State Invariants & Session Storage

### Đánh giá: **18/20**

### Điểm làm tốt

Kiến trúc:

```
realAppUser
      ↓
impersonation state
      ↓
appUser = effective user
```

là hướng thiết kế đúng.

Đặc biệt:

TypeScript

```
const isImpersonating =
  !!(impersonation &&
     impersonation.active &&
     realAppUser?.role === 'admin');
```

giúp bảo đảm chỉ Admin thật mới có thể duy trì View-As.

Việc lưu:

```
tbc_view_as_state_v1
```

trong `sessionStorage` cũng phù hợp với yêu cầu **cô lập theo tab**.

Ngoài ra có các điểm tốt:

- `realRole: 'admin'`
- `mode: 'READ_ONLY'`
- `startedAt`
- kiểm tra `realAppUser?.role === 'admin'`
- tự xóa state khi logout
- tự xóa khi auth session không còn
- user thật không phải Admin → xóa impersonation.

### Điểm cần lưu ý

`sessionStorage` chỉ bảo đảm **scope của browser tab**, không phải một cơ chế chống giả mạo bảo mật.

Người dùng có quyền DevTools vẫn có thể sửa:

JavaScript

```
sessionStorage.setItem(...)
```

hoặc sửa JavaScript runtime.

Điều này không phải vấn đề nghiêm trọng **nếu View-As được xác định rõ là UI testing tool**, nhưng nó trở thành vấn đề nếu hệ thống coi `appUser.permissions` là security boundary.

### Kết luận Layer 1

**Đạt về state architecture.**

* * *

# 2\. Layer 2 — Write Safety & Read-Only Simulation

## Đây là Layer có vấn đề nghiêm trọng nhất.

### Đánh giá: **5/30**

Code tuyên bố:

> `READ_ONLY Simulation`

và:

TypeScript

```
permissions: DEFAULT_PERMISSIONS[effRole]
```

nhưng điều này **không chứng minh database thực sự Read-Only**.

### Vấn đề cốt lõi

Giả sử:

```
Admin thật
  ↓
Supabase Auth JWT
  ↓
role = admin
```

Sau khi View-As:

```
Frontend appUser
role = teacher
permissions = teacher permissions
mode = READ_ONLY
```

nhưng:

```
Supabase JWT
role = admin
```

**không thay đổi.**

Do đó nếu code thực hiện:

TypeScript

```
supabase
  .from('students')
  .update(...)
```

thì database không biết frontend đang ở:

```
GVCN / Read-Only Simulation
```

Nó chỉ biết request đến từ **Admin đang đăng nhập**.

Đây chính là điểm OWASP cảnh báo: frontend authorization không được là lớp quyết định cuối cùng. [OWASP Cornucopia+1](https://cornucopia.owasp.org/cards/FRE8?utm_source=chatgpt.com)

Supabase cũng nêu rõ rằng RLS là lớp kiểm soát row-level ở database và cần kết hợp với grants; `service_role` thậm chí bypass RLS và phải được giữ ở backend. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

### Vì vậy:

| Cơ chế | Hiện tại |
| --- | --- |
| UI ẩn nút Edit | Có thể có |
| `appUser.permissions` | Có |
| `mode = READ_ONLY` | Có |
| Banner cảnh báo | Có |
| Token chuyển thành Teacher | **Không** |
| Database biết đang impersonate | **Chưa chứng minh** |
| RLS enforce Read-Only | **Chưa chứng minh** |
| UPDATE/INSERT/DELETE bị DB chặn | **Chưa chứng minh** |

### Đây là blocker của Acceptance.

Nếu mục tiêu chỉ là:

> “Admin xem giao diện giống người dùng”

thì kiến trúc hiện tại gần đạt.

Nhưng nếu tuyên bố:

> “Dữ liệu thực tế được bảo vệ 100%, không thể vô tình sửa/xóa”

thì **chưa đủ cơ sở để tuyên bố**.

### Tôi yêu cầu bổ sung tối thiểu

Phải có một trong các mô hình:

```
Admin
 ↓
View-As session
 ↓
Server-side authorization context
 ↓
READ ONLY
 ↓
Supabase/RLS
```

hoặc một lớp server/Edge Function/API thực hiện authorization dựa trên:

```
real admin identity
+
impersonated role
+
scope/class
+
read-only mode
```

và **mọi mutation phải bị từ chối**.

Quan trọng: không nên chỉ disable button. Phải test trực tiếp các đường:

```
INSERT
UPDATE
DELETE
UPSERT
RPC mutation
Edge Function mutation
```

* * *

# 3\. Layer 3 — Dynamic Class Scope

### Đánh giá: **9/20**

Phần UI chọn lớp được triển khai khá tốt:

TypeScript

```
classes
selectedClassId
selectedClass
effectiveClassId
effectiveClassName
```

và có:

TypeScript

```
assignedClassIds: effClassId
    ? [effClassId]
    : ...
```

Điều này tạo được **effective scope ở frontend**.

### Nhưng có một vấn đề quan trọng

Đây:

TypeScript

```
assignedClassIds: effClassId ? [effClassId] : ...
```

không tự động khiến database chỉ trả về lớp đó.

Ví dụ frontend có:

```
effectiveClassId = 7A10
```

nhưng request:

SQL

```
SELECT * FROM students
```

vẫn có thể trả về dữ liệu rộng hơn nếu RLS/API không kiểm soát `class_id`.

Do đó cần phân biệt:

### UI scope

```
appUser.assignedClassIds = [7A10]
```

với:

### Security scope

```
Database/RLS/API:
Admin impersonating GVCN
→ chỉ SELECT class_id = 7A10
```

Hai thứ này hiện **chưa được chứng minh là đồng nhất**.

Supabase khuyến nghị RLS để policy được áp dụng ngay khi table được truy cập, thay vì chỉ lọc dữ liệu ở frontend. [Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

### Một vấn đề phụ

Effect:

TypeScript

```
useEffect(() => {
   loadActiveClasses();
}, [isOpen, selectedClassId]);
```

`selectedClassId` không cần thiết phải là dependency của việc tải danh sách lớp.

Thiết kế sạch hơn:

TypeScript

```
}, [isOpen]);
```

Nếu không, mỗi lần chọn lớp có thể trigger lại query danh sách lớp.

Không phải security blocker, nhưng nên sửa.

* * *

# 4\. Layer 4 — UI/UX & Responsive

### Đánh giá: **18/20**

Đây là phần triển khai tốt nhất.

### Banner

Có các yếu tố UX rất rõ:

- màu Amber/Orange khác biệt mạnh;
- pulsing beacon;
- chữ **CHẾ ĐỘ KIỂM TRA**;
- role;
- class;
- Read-Only;
- `Đổi vai trò`;
- `Về Admin`;
- shortcut.

Điểm quan trọng là người dùng **khó quên rằng họ đang không ở trạng thái Admin bình thường**.

### Modal

Cấu trúc:

```
Admin identity
      ↓
Role selection
      ↓
Class scope
      ↓
Read-only warning
      ↓
Auto navigation
      ↓
Apply
```

hợp lý.

8 role cũng bao phủ khá rộng:

- Admin
- Hiệu trưởng
- Giám thị
- GVCN
- GVBM
- Ban cán sự
- Học sinh
- Phụ huynh.

### Mobile

Có xử lý:

- mobile drawer;
- button full-width;
- truncate;
- responsive grid;
- hidden/visible theo breakpoint.

### Keyboard shortcut

`Ctrl + Shift + A` được triển khai toàn cục và có hành vi:

```
Không impersonate
→ mở Role Switcher

Đang impersonate
→ thoát về Admin
```

rất tiện.

### Điểm trừ

Có một UX/security ambiguity:

`Cổng Học Sinh` và `Cổng Phụ Huynh` hiện **không thực sự impersonate**.

Code:

TypeScript

```
if (selectedRole === 'student_portal') {
    router.push('/student');
    return;
}
```

và:

TypeScript

```
if (selectedRole === 'parent_portal') {
    router.push('/portal');
    return;
}
```

Không gọi:

TypeScript

```
startImpersonation(...)
```

Do đó Admin chỉ **đi đến route**, chứ chưa thực sự trở thành “effective student/parent” theo cùng mô hình.

Nếu yêu cầu là:

> “chuyển đổi thành ... toàn bộ các mục khác”

thì đây là một khoảng trống cần xử lý.

* * *

# 5\. Layer 5 — Code Quality & TypeScript

### Đánh giá: **18/20**

### Bằng chứng tốt nhất hiện có

```
npx tsc --noEmit
PASS (0 errors)
```

Đây là bằng chứng compile tốt.

Kiến trúc component cũng tương đối sạch:

```
auth-context
    ↓
RoleSwitcherModal
    ↓
ImpersonationBanner
    ↓
SiteHeader
    ↓
RootLayout
```

Việc đưa state impersonation vào Auth Context là hợp lý vì nhiều component cần biết trạng thái này.

### Một số điểm cần cải thiện

#### 1\. `ROLE_OPTIONS` và `UserRole`

Có hai role:

```
student_portal
parent_portal
```

không phải `UserRole`, nên phải dùng union:

TypeScript

```
UserRole | 'student_portal' | 'parent_portal'
```

Điều này hoạt động nhưng cho thấy model domain chưa thống nhất hoàn toàn.

#### 2\. `DEFAULT_PERMISSIONS`

Đây chỉ là frontend permission model.

Không nên xem nó là security enforcement.

#### 3\. Class query

Như trên, dependency:

TypeScript

```
[selectedClassId]
```

không cần thiết.

#### 4\. Chưa có bằng chứng test mutation

TypeScript compile sạch **không chứng minh authorization đúng**.

Cần test runtime.

* * *

# BẢNG AUDIT TỔNG HỢP

| Layer | Điểm | Nhận xét |
| --- | --- | --- |
| **1\. State & Session** | **18/20** | Kiến trúc tốt, tách Admin thật/effective user |
| **2\. Write Safety** | **5/30** | **Critical gap: READ\_ONLY mới ở frontend** |
| **3\. Dynamic Class Scope** | **9/20** | UI scope tốt, DB/RLS scope chưa được chứng minh |
| **4\. UI/UX Responsive** | **18/20** | Rất tốt, rõ trạng thái, thao tác nhanh |
| **5\. Code Quality/TS** | **18/20** | Compile sạch, cấu trúc tốt |
| **TOTAL** | **68/100** | Chưa đủ điều kiện acceptance |

* * *

# 🔴 CÁC BLOCKER PHẢI SỬA TRƯỚC FINAL ACCEPTANCE

### BLOCKER 1 — Read-Only phải là backend-enforced

Không được chỉ dựa vào:

TypeScript

```
mode: 'READ_ONLY'
```

hoặc:

TypeScript

```
permissions: DEFAULT_PERMISSIONS[effRole]
```

Phải chứng minh:

```
View-As
   ↓
READ
   ✓ SELECT

WRITE
   ✗ INSERT
   ✗ UPDATE
   ✗ DELETE
   ✗ UPSERT
   ✗ mutation RPC
```

được chặn thực sự.

* * *

### BLOCKER 2 — Class scope phải được enforce

Nếu chọn:

```
GVCN → 7A10
```

phải chứng minh:

```
SELECT students
→ chỉ 7A10
```

và không thể đổi request thành:

```
class_id = 7A11
```

để lấy dữ liệu lớp khác.

RLS là cơ chế phù hợp để thực hiện row-level authorization này. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

* * *

### BLOCKER 3 — Portal phải thật sự View-As

Hiện tại:

```
Student Portal
Parent Portal
```

chỉ:

```
router.push(...)
```

chưa tạo effective identity tương ứng.

Nếu mục tiêu acceptance là **kiểm tra toàn bộ UI theo từng persona**, cần thống nhất chúng vào cùng một View-As architecture hoặc ghi rõ đây chỉ là route preview.

* * *

# TEST MATRIX BẮT BUỘC TRƯỚC KHI APPROVED

Tôi đề nghị Antigravity chạy đúng bộ test này:

| Test | Expected |
| --- | --- |
| Admin → GVCN 7A10 | PASS |
| GVCN thấy UI đúng role | PASS |
| GVCN thấy dữ liệu 7A10 | PASS |
| GVCN cố query 7A11 | **DENY** |
| GVCN cố INSERT | **DENY** |
| GVCN cố UPDATE | **DENY** |
| GVCN cố DELETE | **DENY** |
| GVCN gọi mutation RPC | **DENY** |
| Admin → GVBM | PASS |
| Admin → Ban cán sự 7A10 | PASS |
| Admin → Student Portal | effective student UI |
| Admin → Parent Portal | effective parent UI |
| `Ctrl+Shift+A` | về Admin |
| Refresh browser | state đúng theo thiết kế |
| mở tab mới | **không leak View-As từ tab khác** |
| logout | impersonation state bị xóa |
| session hết hạn | impersonation state bị xóa |
| đổi 7A10 → 7A11 | scope thay đổi chính xác |
| DevTools sửa `sessionStorage` | **không được tạo quyền DB trái phép** |

Test cuối cùng đặc biệt quan trọng: nếu sửa `sessionStorage` mà có thể lấy dữ liệu trái quyền thì frontend state đang bị dùng nhầm như một security boundary.

* * *

# KẾT LUẬN CHÍNH THỨC — FINAL ACCEPTANCE VERDICT

## **STATUS: `REQUEST_CHANGES`**

## **ACCEPTANCE SCORE: 68/100**

### Lý do

Đây là một **bản triển khai UI/View-As rất khá**, và phần state management đã đi đúng hướng. Tuy nhiên, với tiêu chí **“Read-Only Simulation bảo vệ dữ liệu trường học”**, bằng chứng hiện tại chưa đủ.

Điểm quyết định không phải là TypeScript hay giao diện.

Điểm quyết định là:

> **Admin đang giả lập Teacher nhưng Supabase vẫn nhận diện request là Admin.**

Vì vậy, `READ_ONLY` hiện tại nên được hiểu chính xác là:

> **Frontend Read-Only Simulation**

chứ **chưa thể kết luận là Database Read-Only**.

OWASP yêu cầu authorization phải được enforce ở trusted/server side thay vì dựa vào client-side JavaScript. [OWASP Cheat Sheet Series+1](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html?utm_source=chatgpt.com) Supabase cũng yêu cầu kết hợp grants + RLS để kiểm soát quyền truy cập thực tế tới dữ liệu. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

### Phán quyết cuối

**Không cần làm lại UI.**

**Không cần bỏ kiến trúc `realAppUser → impersonation → appUser`.**

Cần giữ nguyên phần lớn implementation hiện tại và bổ sung **security enforcement layer**:

```
                    ┌─────────────────────┐
                    │   REAL ADMIN AUTH    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   VIEW-AS CONTEXT   │
                    │ role + class + RO   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ SERVER / RLS AUTHZ  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
                 SELECT                 MUTATION
              scoped only              DENY
```

**Sau khi có bằng chứng test thực tế cho 3 điểm: `mutation denied` + `class scope enforced` + `portal persona enforced`, tính năng mới đủ cơ sở để chuyển từ `REQUEST_CHANGES` sang `APPROVED`.**