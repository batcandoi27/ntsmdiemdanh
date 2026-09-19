---
task_id: "TASK-ADMIN-ROLE-SWITCHER-001"
topic: "Thẩm định & Nâng cấp Kế hoạch: Chức năng Chuyển đổi vai trò kiểm tra giao diện (Admin Role Impersonation / View-As Mode) cho Quản trị viên"
bridge_endpoint: "http://127.0.0.1:17841/v1/responses"
turn_id: "turn_b0147c45-b0d4-41ff-b3d4-8ad21d29e7e7"
thread_id: "thread_2f3a6cbf-0b05-459e-9cd5-ee9c49e1dc8d"
model_used: "chatgpt-web/luna"
response_timestamp: "2026-09-19T13:15:20.311Z"
http_status: "200 OK"
raw_text_length: 29527
duration_seconds: 70
---

> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.# MASTER ARCHITECTURE — Admin Role Impersonation / View-As Mode

## 0\. Kết luận kiến trúc trước

Tôi **không khuyến nghị triển khai “đổi `appUser.role` trong `AuthContext` rồi coi như đã trở thành role khác**.

Với hệ thống hiện tại, cách đó chỉ là **UI impersonation**. Token Supabase vẫn thuộc Admin, nên nếu các thao tác ghi được gọi trực tiếp từ client thì Admin đang “đóng vai GVCN” nhưng vẫn có quyền thật của Admin.

Kiến trúc nên là:

> **Real Identity ≠ Effective View Role ≠ Authorization**

Ba khái niệm phải tách hoàn toàn:

```
REAL IDENTITY
    ↓
Supabase session
    ↓
Admin thật
    │
    ├── effectiveRole = admin
    │
    └── impersonation
          ↓
       effectiveRole = teacher
       effectiveClassId = 7A10
       mode = READ_ONLY
```

**Admin vẫn là Admin về mặt bảo mật.**  
Chỉ có giao diện và dữ liệu được trình bày theo “góc nhìn” của role đang kiểm tra.

Supabase Auth dùng JWT để xác thực và RLS để giới hạn truy cập dữ liệu, vì vậy việc đổi role ở React state **không thể được coi là cơ chế authorization**. [Supabase+1](https://supabase.com/docs/guides/auth?utm_source=chatgpt.com)

* * *

# 1\. Kiến trúc 5 lớp

## Layer 1 — Auth & State Invariants

### Không dùng `localStorage` cho trạng thái impersonation

Tôi đề xuất:

```
Supabase Auth
    ↓
cookie/session
    ↓
REAL USER = admin

View-As State
    ↓
sessionStorage
```

### Vì sao `sessionStorage`?

| Tình huống | sessionStorage |
| --- | --- |
| Reload trang | Giữ |
| F5 | Giữ |
| Tab hiện tại | Giữ |
| Mở tab mới | Không tự copy |
| Đóng tab | Mất |
| Logout | Xóa |
| Session Supabase hết hạn | Phải tự hủy |
| Có thể chứa token Supabase | **Không** |

Điểm quan trọng:

> **Không bao giờ lưu access token / refresh token vào state impersonation.**

Supabase hiện khuyến nghị SSR Next.js sử dụng cookie-based session với `@supabase/ssr`; `getClaims()`/`getUser()` dùng để xác minh danh tính, thay vì tin `getSession()` cho quyết định authorization. [Supabase+1](https://supabase.com/nextjs?utm_source=chatgpt.com)

### State chuẩn

TypeScript

```
export type UserRole =
  | 'admin'
  | 'principal'
  | 'supervisor'
  | 'teacher'
  | 'gvbm'
  | 'class_monitor';

export type ImpersonationState = {
  active: boolean;

  realRole: 'admin';

  effectiveRole: UserRole;

  effectiveClassId?: string;

  effectiveUserId?: string;

  mode: 'READ_ONLY';

  startedAt: string;

  source: 'admin-view-as';

  version: 1;
};
```

Tôi **cố ý không dùng**:

TypeScript

```
impersonatedUser: appUser
```

vì cách này rất dễ khiến code phía dưới nhầm rằng Admin thực sự đã đăng nhập thành user kia.

Thay vào đó:

TypeScript

```
realUser
effectiveView
```

là hai object độc lập.

* * *

# 2\. Layer 2 — Write Safety

Đây là vấn đề quan trọng nhất của toàn bộ feature.

## Không được giải quyết bằng cảnh báo UI đơn thuần

Ví dụ:

```
⚠ Bạn đang xem dưới vai trò GVCN
```

**không đủ an toàn.**

Admin vẫn có token Admin.

Nếu UI có:

TypeScript

```
await supabase
  .from('attendance')
  .update(...)
```

thì RLS có thể nhìn thấy:

```
auth.uid() = ADMIN_ID
```

chứ không biết rằng React đang hiển thị:

```
effectiveRole = teacher
```

Kết quả:

> Admin có thể vô tình ghi dữ liệu thật.

* * *

# 3\. Chế độ Safe Mode bắt buộc

Tôi đề xuất View-As mặc định:

```
READ_ONLY
```

Không phải:

```
SAFE_MODE = true
```

một biến boolean đơn giản.

Nên dùng enum:

TypeScript

```
export type SimulationMode =
  | 'READ_ONLY'
  | 'WRITE_ENABLED';
```

Nhưng phiên bản đầu tiên của feature **chỉ implement `READ_ONLY`**.

TypeScript

```
mode: 'READ_ONLY'
```

### Trong READ\_ONLY

Các hành động sau phải bị chặn:

```
INSERT
UPDATE
DELETE
UPSERT
RPC có side-effect
Storage upload/delete
Gửi thông báo
Xuất dữ liệu có mutation
Thay đổi hồ sơ
Điểm danh
Duyệt hồ sơ
Xóa học sinh
Đổi trạng thái
```

* * *

# 4\. Không chỉ ẩn nút — phải chặn ở 3 tầng

## Tầng A — UI

TypeScript

```
{!isReadOnly && (
  <Button>Lưu điểm danh</Button>
)}
```

Nhưng đây chỉ là UX.

* * *

## Tầng B — Application service

Tạo:

```
src/lib/impersonation/
    guard.ts
    context.ts
    types.ts
```

Ví dụ:

TypeScript

```
export function assertWriteAllowed(
  impersonation: ImpersonationState | null
) {
  if (
    impersonation?.active &&
    impersonation.mode === 'READ_ONLY'
  ) {
    throw new Error(
      'WRITE_BLOCKED_IN_IMPERSONATION_MODE'
    );
  }
}
```

Service:

TypeScript

```
async function saveAttendance(data: AttendanceInput) {
  assertWriteAllowed(getImpersonationState());

  return supabase
    .from('attendance')
    .insert(data);
}
```

* * *

## Tầng C — Server/API

Đây mới là **security boundary thực sự**.

Các Route Handler / Server Action nhạy cảm phải kiểm tra:

```
real identity
+
impersonation context
+
operation
```

Ví dụ:

TypeScript

```
const authContext = await getAuthContext();

if (
  authContext.impersonation?.active &&
  authContext.impersonation.mode === 'READ_ONLY'
) {
  return Response.json(
    {
      error: 'WRITE_BLOCKED_IN_VIEW_AS'
    },
    { status: 403 }
  );
}
```

* * *

# 5\. RLS vẫn phải giữ nguyên

Không được sửa RLS theo kiểu:

```
Nếu Admin thì cho tất cả
```

rồi hy vọng View-As sẽ tự hạn chế quyền.

RLS vẫn phải bảo vệ database theo **real authenticated identity**.

Supabase thiết kế Auth + RLS chính là để access token xác định người gọi và RLS quyết định hàng dữ liệu nào được phép truy cập. [Supabase+1](https://supabase.com/docs/guides/auth?utm_source=chatgpt.com)

* * *

# 6\. Layer 3 — Dynamic Class Assignment

Đây là nơi tôi đề xuất nâng cấp đáng kể so với kế hoạch ban đầu.

Admin không nên phải:

```
đóng vai GVCN
→ vào trang
→ tìm lớp
→ quay lại
→ đổi lớp
```

Mà Modal phải có:

```
┌─────────────────────────────────────┐
│       VIEW AS — KIỂM TRA GIAO DIỆN │
├─────────────────────────────────────┤
│                                     │
│ Vai trò                             │
│ [ GVCN ▼ ]                          │
│                                     │
│ Lớp kiểm tra                        │
│ [ 7A10 ▼ ]                          │
│                                     │
│ Chế độ                              │
│ 🔒 Chỉ xem / Read-only              │
│                                     │
│ ✓ Không ghi dữ liệu thật            │
│ ✓ Không thay đổi tài khoản          │
│                                     │
│        [ Bắt đầu kiểm tra ]         │
└─────────────────────────────────────┘
```

* * *

# 7\. Role Context nên có scope

Ví dụ:

TypeScript

```
type EffectiveView = {
  role: UserRole;

  classId?: string;

  userId?: string;

  permissions: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
};
```

Khi Admin chọn:

```
GVCN
7A10
```

state:

TypeScript

```
{
  active: true,
  realRole: 'admin',
  effectiveRole: 'teacher',
  effectiveClassId: '7A10',
  mode: 'READ_ONLY'
}
```

* * *

# 8\. Có cần chọn `effectiveUserId` không?

**Không nên mặc định.**

Có hai khái niệm khác nhau:

### View as Role

```
Admin → Teacher
```

### View as Specific User

```
Admin → Nguyễn Văn A
```

Hai feature này không nên trộn vào một API.

Giai đoạn 1:

```
ROLE + CLASS
```

là đủ.

Ví dụ:

```
GVCN + 7A10
```

không cần giả mạo một giáo viên cụ thể.

Điều này giảm rất nhiều rủi ro về:

- audit
- privacy
- identity confusion
- notification
- ownership
- assignedClassIds

* * *

# 9\. AuthContext — kiến trúc đề xuất

TypeScript

```
type AuthContextValue = {
  authUser: SupabaseUser | null;

  appUser: AppUser | null;

  effectiveRole: UserRole;

  effectiveClassId?: string;

  isImpersonating: boolean;

  impersonation: ImpersonationState | null;

  startImpersonation: (
    role: UserRole,
    classId?: string
  ) => void;

  stopImpersonation: () => void;

  isReadOnlySimulation: boolean;
};
```

Điểm quan trọng:

TypeScript

```
appUser.role
```

**không thay đổi.**

Ví dụ:

```
appUser.role
    ↓
admin

effectiveRole
    ↓
teacher
```

* * *

# 10\. Provider logic mẫu

TypeScript

```
'use client';

const STORAGE_KEY =
  'trantbc:view-as:v1';

function loadImpersonation():
  ImpersonationState | null {

  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    const state =
      JSON.parse(raw) as ImpersonationState;

    if (
      state.version !== 1 ||
      !state.active ||
      state.realRole !== 'admin'
    ) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}
```

Start:

TypeScript

```
function startImpersonation(
  role: UserRole,
  classId?: string
) {
  if (appUser?.role !== 'admin') {
    return;
  }

  const next: ImpersonationState = {
    active: true,
    realRole: 'admin',
    effectiveRole: role,
    effectiveClassId: classId,
    mode: 'READ_ONLY',
    startedAt: new Date().toISOString(),
    source: 'admin-view-as',
    version: 1,
  };

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(next)
  );

  setImpersonation(next);
}
```

Stop:

TypeScript

```
function stopImpersonation() {
  sessionStorage.removeItem(STORAGE_KEY);
  setImpersonation(null);

  router.push('/');
}
```

* * *

# 11\. Quan trọng: Supabase logout không được bị View-As ảnh hưởng

Không được làm:

TypeScript

```
logout()
```

khi chỉ muốn:

```
Thoát View-As
```

Hai thao tác phải hoàn toàn khác nhau:

```
EXIT VIEW-AS
     ↓
xóa impersonation state
     ↓
Admin vẫn đăng nhập


LOGOUT
     ↓
Supabase signOut()
     ↓
xóa session thật
```

Đây là invariant bắt buộc.

* * *

# 12\. Khi Supabase session hết hạn

AuthContext phải nghe:

TypeScript

```
supabase.auth.onAuthStateChange(...)
```

Khi:

```
SIGNED_OUT
```

thì:

TypeScript

```
sessionStorage.removeItem(
  'trantbc:view-as:v1'
);

setImpersonation(null);
```

Không được để:

```
Supabase session = null
View-As = teacher
```

tồn tại.

* * *

# 13\. Khi mở tab mới

Đây là lý do tôi chọn `sessionStorage`.

Tab A:

```
Admin
→ View as GVCN
→ 7A10
```

Tab B:

```
Admin bình thường
```

Điều này đặc biệt hữu ích khi Admin muốn:

```
Tab 1: Admin dashboard
Tab 2: GVCN 7A10
Tab 3: Học sinh
```

mà không làm ảnh hưởng lẫn nhau.

* * *

# 14\. Layer 4 — ImpersonationBanner

Tôi không khuyến nghị banner cao 60–80px.

Nó sẽ phá layout.

Nên là **compact persistent indicator**.

Desktop:

```
┌──────────────────────────────────────────────────────────┐
│ 🔒 VIEW-AS  GVCN · 7A10 · CHỈ XEM       [Đổi vai trò] [×] │
└──────────────────────────────────────────────────────────┘
```

Mobile:

```
┌─────────────────────────────────┐
│ 🔒 GVCN · 7A10   [Thoát View-As] │
└─────────────────────────────────┘
```

* * *

# 15\. Banner phải có màu nhận diện riêng

Không nên dùng:

```
red
```

vì người dùng dễ hiểu là lỗi.

Cũng không nên dùng:

```
green
```

vì dễ hiểu là trạng thái bình thường.

Nên dùng một **amber/gold education accent**:

```
VIEW-AS
```

với icon:

```
👁
```

hoặc:

```
🔍
```

và badge:

```
READ ONLY
```

Mục tiêu là:

> Nhìn vào màn hình sau 1 giây phải biết ngay mình đang không ở Admin view bình thường.

* * *

# 16\. Không che BottomNav

Không dùng:

CSS

```
position: fixed;
top: 0;
```

một cách độc lập với layout.

Nên tạo layout:

TypeScript

```
<AppShell>
  <ImpersonationBanner />

  <SiteHeader />

  <main>
    {children}
  </main>

  <BottomNav />
</AppShell>
```

và dùng CSS variable:

CSS

```
--impersonation-height
```

để layout biết chính xác phần banner đang chiếm bao nhiêu.

Mobile:

CSS

```
padding-bottom:
  calc(
    var(--bottom-nav-height) +
    env(safe-area-inset-bottom)
  );
```

* * *

# 17\. Keyboard shortcut

Tôi đề xuất:

```
Ctrl + Shift + Escape
```

→ thoát View-As ngay lập tức.

Không cần mở modal.

Có thể thêm:

```
Esc
```

nhưng chỉ khi:

```
RoleSwitcherModal đang mở
```

Không nên dùng `Esc` toàn cục để thoát View-As vì người dùng có thể vô tình bấm.

* * *

# 18\. RoleSwitcherModal

Nên chia thành 3 khu vực.

```
┌──────────────────────────────────────────────┐
│ VIEW AS                                      │
│ Kiểm tra giao diện theo từng nhóm người dùng │
├──────────────────────────────────────────────┤
│                                              │
│ VAI TRÒ                                      │
│                                              │
│ 👑 Admin                                     │
│ 🏫 Hiệu trưởng                               │
│ 👁 Giám thị                                  │
│ 👨‍🏫 GVCN                                      │
│ 📚 GV bộ môn                                 │
│ 🎓 Ban cán sự                                │
│ 🎒 Học sinh                                  │
│ 👨‍👩‍👧 Phụ huynh                              │
│                                              │
├──────────────────────────────────────────────┤
│ PHẠM VI                                      │
│ [ 7A10 ▼ ]                                   │
│                                              │
│ 🔒 READ ONLY                                 │
├──────────────────────────────────────────────┤
│              [ Bắt đầu kiểm tra ]            │
└──────────────────────────────────────────────┘
```

* * *

# 19\. Role nào cần class?

Có thể định nghĩa:

TypeScript

```
const ROLE_SCOPE = {
  admin: 'none',
  principal: 'school',
  supervisor: 'school',
  teacher: 'class',
  gvbm: 'class',
  class_monitor: 'class',
  student: 'class',
  parent: 'student',
};
```

Do đó UI tự động:

```
teacher
→ hiện chọn lớp

class_monitor
→ hiện chọn lớp

student
→ hiện chọn lớp

principal
→ không cần chọn lớp
```

* * *

# 20\. Killer Feature #1 — One-click Deep View

Đây là tính năng tôi đánh giá có giá trị thực tế rất cao.

Admin đang ở:

```
Dashboard
```

bấm:

```
👁 Xem như GVCN
```

→ chọn:

```
7A10
```

→ hệ thống tự chuyển thẳng tới:

```
/homeroom/students
```

Không cần Admin tự tìm menu.

Tương tự:

```
Giám thị → /supervisor
Học sinh → /student
GVCN → /homeroom/students
GVBM → /teacher
```

* * *

# 21\. Killer Feature #2 — Role Journey

Cho phép kiểm tra một luồng hoàn chỉnh:

```
GVCN
 ↓
Danh sách lớp
 ↓
Hồ sơ học sinh
 ↓
Điểm danh
 ↓
Báo cáo
```

Một nút:

```
▶ Kiểm tra luồng GVCN
```

sẽ tự đưa Admin qua các màn hình.

Mục tiêu là test UX chứ không chỉ test từng page.

* * *

# 22\. Killer Feature #3 — Permission Matrix Overlay

Trong View-As:

```
┌─────────────────────────────┐
│ QUYỀN HIỆN TẠI              │
├─────────────────────────────┤
│ Xem học sinh       ✓        │
│ Xem điểm danh      ✓        │
│ Tạo điểm danh      🔒       │
│ Sửa điểm danh      🔒       │
│ Xóa học sinh       🔒       │
│ Xuất Word          ✓        │
└─────────────────────────────┘
```

Điều này giúp Admin phát hiện:

```
UI đang hiện nút
nhưng role thực tế không được phép
```

hoặc ngược lại.

* * *

# 23\. Killer Feature #4 — Missing UI Detector

Khi View-As được bật, hệ thống có thể kiểm tra:

```
Expected menu
Expected CTA
Expected dashboard card
Expected BottomNav
Expected role-specific action
```

và hiển thị:

```
✓ 12 thành phần đúng
⚠ 2 thành phần thiếu
⚠ 1 menu không đúng role
```

Đây mới thực sự biến View-As thành **QA tool cho Admin**.

* * *

# 24\. Killer Feature #5 — View-As History

Ví dụ:

```
LỊCH SỬ KIỂM TRA

20:10  GVCN · 7A10
20:05  Giám thị
19:57  Học sinh · 7A8
19:45  GVCN · 6A1
```

Không lưu thông tin nhạy cảm dư thừa.

Chỉ:

```
admin_user_id
role
class_id
started_at
ended_at
```

Nếu cần audit nghiêm túc, lưu server-side.

* * *

# 25\. Killer Feature #6 — “Why is this hidden?”

Khi Admin đang View-As:

```
┌──────────────────────────────┐
│ 🔒 Nút Lưu                   │
│                              │
│ Bị khóa vì:                  │
│ Role: GVCN                   │
│ Mode: READ ONLY              │
│                              │
│ Đây không phải lỗi giao diện │
└──────────────────────────────┘
```

Đây là UX rất hữu ích cho QA.

* * *

# 26\. Route protection

Không được chỉ dựa vào:

TypeScript

```
if (effectiveRole === 'teacher')
```

ở client.

Ví dụ Admin View-As GVCN truy cập:

```
/admin/users
```

thì cần quyết định rõ:

### Option A — View-As được phép xem Admin pages?

**Không.**

### Option B — View-As chỉ được xem role portal?

**Tôi đề xuất Option B.**

```
Admin thật
     ↓
View-As teacher
     ↓
teacher UI only
```

Admin vẫn có thể:

```
Exit View-As
     ↓
Admin UI
```

* * *

# 27\. Route Policy

Tạo:

TypeScript

```
const ROUTE_ACCESS = {
  '/admin': ['admin'],
  '/principal': ['principal'],
  '/supervisor': ['supervisor'],
  '/homeroom': ['teacher'],
  '/teacher': ['gvbm'],
  '/student': ['student'],
  '/portal': ['parent'],
};
```

Nhưng với View-As:

TypeScript

```
getEffectiveRouteRole()
```

được dùng **cho UI routing**.

Authorization server vẫn phải xác minh:

```
real authenticated identity
```

và impersonation context.

* * *

# 28\. Một điểm rất quan trọng với `/student`

Hệ thống hiện có:

```
/student
```

Nếu Admin View-As Học sinh thì không nên lấy:

```
admin.appUser
```

để quyết định:

```
studentId
```

Nếu không, hệ thống sẽ rơi vào trạng thái:

```
role = student
userId = admin
```

Đây là state không hợp lệ.

Có hai cách.

### Cách 1 — Role-only demo

```
student role
+
sample class/student context
```

### Cách 2 — Specific student preview

```
student
→ 7A10
→ Nguyễn Văn A
```

Tôi khuyến nghị:

**Giai đoạn 1: role + fixture/sample context.**

Sau đó mới làm:

**Specific User View.**

* * *

# 29\. Fixture mode là một Killer Feature tiềm năng

Có thể thêm:

```
DATA SOURCE

● Dữ liệu thật — READ ONLY
○ Dữ liệu mẫu
○ Empty state
○ Lớp đông
○ Lớp chưa có học sinh
```

Ví dụ:

```
Học sinh
→ 7A10
→ Dữ liệu thật
```

hoặc:

```
Học sinh
→ Demo Dataset
→ 45 học sinh
→ 3 học sinh chưa điểm danh
```

Cách này giúp QA test cả:

```
normal state
empty state
loading state
error state
large-data state
```

mà không phải phá dữ liệu thật.

* * *

# 30\. Context API hoàn chỉnh hơn

Tôi đề xuất interface:

TypeScript

```
export interface ViewAsContext {
  active: boolean;

  realRole: 'admin';

  role: UserRole;

  classId?: string;

  userId?: string;

  mode: 'READ_ONLY';

  dataMode: 'REAL' | 'FIXTURE';

  startedAt: string;

  start: (config: {
    role: UserRole;
    classId?: string;
    userId?: string;
    dataMode?: 'REAL' | 'FIXTURE';
  }) => void;

  stop: () => void;

  assertReadOnly: () => void;
}
```

* * *

# 31\. API tuyệt đối không nên có

Không tạo:

TypeScript

```
setRole('teacher')
```

trong AuthContext.

Đây là anti-pattern.

Cũng không tạo:

TypeScript

```
appUser.role = 'teacher'
```

hoặc:

TypeScript

```
setAppUser({
  ...appUser,
  role: 'teacher'
});
```

Bởi vì các component khác sẽ không biết:

```
role này là role thật
hay role giả lập?
```

* * *

# 32\. Naming convention

Tôi khuyên toàn project dùng thống nhất:

```
realRole
effectiveRole

realUser
effectiveView

isImpersonating
isReadOnlySimulation

realClassIds
effectiveClassId
```

Tránh:

```
currentRole
currentUser
role
user
```

ở các context quan trọng vì quá dễ nhầm.

* * *

# 33\. Audit event

Khi bắt đầu:

TypeScript

```
{
  type: 'VIEW_AS_STARTED',
  actorUserId: admin.id,
  effectiveRole: 'teacher',
  classId: '7A10',
  mode: 'READ_ONLY',
  timestamp
}
```

Khi kết thúc:

TypeScript

```
{
  type: 'VIEW_AS_STOPPED',
  actorUserId: admin.id,
  effectiveRole: 'teacher',
  classId: '7A10',
  durationMs
}
```

**Không log access token.**

* * *

# 34\. Performance / Zero Regression

Không nên để toàn bộ app subscribe vào thay đổi state lớn.

Tách:

TypeScript

```
<AuthProvider>
   <ViewAsProvider>
      <App />
   </ViewAsProvider>
</AuthProvider>
```

và memo:

TypeScript

```
const value = useMemo(
  () => ({
    ...
  }),
  [
    appUser,
    impersonation,
  ]
);
```

Các component không dùng View-As không nên re-render chỉ vì banner thay đổi.

* * *

# 35\. Không tạo vòng lặp AuthContext

Một lỗi thường gặp:

```
AuthContext
 ↓
load impersonation
 ↓
setAppUser
 ↓
AuthContext render
 ↓
load impersonation
 ↓
setAppUser
 ↓
...
```

Không được làm.

Initialization chỉ:

```
Supabase auth
     ↓
load appUser
     ↓
validate impersonation
     ↓
set state
```

Một lần.

* * *

# 36\. Validation khi reload

Khi reload:

TypeScript

```
const saved = loadImpersonation();

if (!saved) {
  ...
}
```

Sau đó kiểm tra:

```
realRole === admin
role hợp lệ
classId còn tồn tại
mode hợp lệ
version hợp lệ
```

Nếu không:

TypeScript

```
clearImpersonation();
```

Không crash application.

* * *

# 37\. Session expiry

Flow chuẩn:

```
Supabase session
       │
       ├── valid
       │     ↓
       │  View-As giữ nguyên
       │
       └── SIGNED_OUT
             ↓
       clear View-As
             ↓
       redirect login
```

Supabase SSR hiện sử dụng cookie-based sessions và cơ chế refresh token; với Next.js authenticated routes cũng cần tránh caching/ISR không phù hợp để không làm lẫn session giữa người dùng. [Supabase+1](https://supabase.com/docs/guides/auth/server-side/advanced-guide?utm_source=chatgpt.com)

* * *

# 38\. Data fetching — điểm cần đặc biệt chú ý

Không được viết:

TypeScript

```
fetchStudents({
  role: effectiveRole
});
```

rồi backend tin:

TypeScript

```
role = teacher
```

Request này chỉ là **UI context**.

Backend phải biết:

```
authenticated admin
```

và:

```
view-as teacher
```

là một context được server xác thực.

* * *

# 39\. Nếu muốn dữ liệu thật nhưng read-only

Kiến trúc lý tưởng:

```
Browser
   │
   │ GET
   ↓
Route Handler
   │
   ├── verify Admin session
   ├── verify View-As state
   ├── enforce READ_ONLY
   │
   ↓
Supabase
   │
   ↓
REAL SCHOOL DATA
```

Không có:

```
Browser
 ↓
"role=teacher"
 ↓
Supabase
```

rồi hy vọng client tự bảo vệ.

* * *

# 40\. Một lưu ý về Supabase RLS

Nếu hệ thống đang dùng RLS tốt, **đừng phá RLS để phục vụ View-As**.

Supabase cho phép xây RBAC bằng custom claims và dùng authorization logic trong RLS policies. [Supabase](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac?utm_source=chatgpt.com)

View-As không nên biến thành:

```
Admin impersonates teacher
→ cấp JWT teacher giả
```

trừ khi bạn thực sự xây dựng một hệ thống impersonation server-side hoàn chỉnh.

Với yêu cầu hiện tại, điều đó là **không cần thiết**.

* * *

# 41\. Nếu sau này cần WRITE-AS thật sự

Đây là feature hoàn toàn khác:

```
Admin
 ↓
Server creates impersonation context
 ↓
short-lived signed token
 ↓
server validates actor + target
 ↓
RLS / API enforces target permissions
 ↓
audit every mutation
```

Không nên đưa vào phiên bản View-As đầu tiên.

Tên feature nên phân biệt:

```
VIEW AS
```

với:

```
ACT AS
```

### VIEW AS

```
READ ONLY
```

### ACT AS

```
Có thể ghi dữ liệu
```

Đây là hai mức bảo mật khác nhau.

* * *

# 42\. Definition of Done

Antigravity chỉ được coi feature hoàn thành khi toàn bộ checklist này PASS:

### Authentication

-  Admin thật không bị đổi `appUser.role`
-  Supabase session không bị thay thế
-  Logout vẫn logout Admin
-  Session hết hạn → View-As tự mất
-  Reload → View-As được khôi phục đúng
-  Tab mới không tự View-As

### Role

-  Có đủ role cần test
-  Role có scope rõ ràng
-  Teacher có thể chọn class
-  Class không hợp lệ → không start
-  Không nhầm `role` với `userId`

### Security

-  View-As mặc định READ\_ONLY
-  UI ẩn/disable write actions
-  Application service chặn write
-  Server/API chặn write
-  Không có token impersonation giả
-  RLS hiện hữu không bị bypass
-  Không ghi access/refresh token vào View-As state

### UX

-  Banner luôn nhìn thấy
-  Không che Header
-  Không che BottomNav
-  Mobile responsive
-  Có nút Exit
-  `Ctrl + Shift + Escape`
-  Role switch một thao tác
-  Chọn class trực tiếp
-  Hiển thị `READ ONLY`

### Regression

-  Admin bình thường hoạt động
-  Login/logout hoạt động
-  Refresh hoạt động
-  Navigation hoạt động
-  Realtime không lỗi
-  Không render loop
-  Không memory leak
-  Không thay đổi permission thật của Admin

* * *

# 43\. Kiến trúc file tôi đề xuất

```
src/
├── context/
│   ├── auth-context.tsx
│   └── view-as-context.tsx
│
├── components/
│   ├── site-header.tsx
│   ├── impersonation-banner.tsx
│   ├── role-switcher-modal.tsx
│   └── view-as/
│       ├── role-card.tsx
│       ├── class-selector.tsx
│       └── permission-preview.tsx
│
├── lib/
│   └── impersonation/
│       ├── types.ts
│       ├── constants.ts
│       ├── storage.ts
│       ├── guard.ts
│       ├── route-policy.ts
│       └── validation.ts
│
├── app/
│   └── api/
│       └── ...
│
└── lib/
    └── supabase/
        ├── client.ts
        └── server.ts
```

Với Next.js + Supabase hiện nay, việc tách browser/server Supabase clients bằng `@supabase/ssr` là hướng được tài liệu chính thức khuyến nghị cho App Router. [Supabase+1](https://supabase.com/nextjs?utm_source=chatgpt.com)

* * *

# 44\. MASTER FLOW

```
                    ┌──────────────────┐
                    │ Supabase Session │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   REAL IDENTITY  │
                    │      ADMIN       │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
          Normal Admin             View-As Mode
                 │                       │
                 │                ┌──────▼──────┐
                 │                │ effective   │
                 │                │ role        │
                 │                └──────┬──────┘
                 │                       │
                 │                ┌──────▼──────┐
                 │                │ class scope │
                 │                └──────┬──────┘
                 │                       │
                 │                ┌──────▼──────┐
                 │                │ READ ONLY   │
                 │                └──────┬──────┘
                 │                       │
                 └───────────────┬───────┘
                                 ▼
                         ┌───────────────┐
                         │      UI       │
                         └───────┬───────┘
                                 │
                      ┌──────────┴─────────┐
                      ▼                    ▼
                   READ                 WRITE
                      │                    │
                      ▼                    ▼
                  ALLOWED              BLOCKED
```

* * *

# 45\. Bản chỉ thị trực tiếp cho Antigravity

Nếu mục tiêu là đưa cho dev/agent triển khai ngay, tôi sẽ dùng chỉ thị này:

> **Implement Admin View-As as a UI simulation layer, NOT as a real authentication-role switch.**
> 
> 1. Preserve `appUser.role` and the real Supabase identity permanently.
> 2. Introduce `ViewAsContext` with `realRole`, `effectiveRole`, `effectiveClassId`, `mode`, `dataMode`, and lifecycle methods.
> 3. Persist only View-As metadata in `sessionStorage`; never store or replace Supabase tokens.
> 4. Default every View-As session to `READ_ONLY`.
> 5. Block all INSERT/UPDATE/DELETE/UPSERT/RPC side-effects at UI, application-service, and server/API layers.
> 6. Never rely on client-side `effectiveRole` as an authorization mechanism.
> 7. Keep Supabase Auth/RLS as the real security boundary.
> 8. Allow Admin to select role + class directly from `RoleSwitcherModal`.
> 9. Add persistent `ImpersonationBanner` with `READ ONLY`, current role, current class, and one-click Exit.
> 10. Add `Ctrl+Shift+Escape` for immediate View-As exit.
> 11. On `SIGNED_OUT`, invalid state, invalid class, or expired session, automatically clear View-As.
> 12. Never confuse `effectiveRole` with `effectiveUserId`; role simulation and specific-user impersonation are separate features.
> 13. Do not modify logout semantics.
> 14. Add audit events for start/stop View-As without storing tokens.
> 15. Add automated tests covering reload, new tab, logout, session expiry, role switching, class switching, route protection, write blocking, mobile layout, and regression of normal Admin mode.
> 16. Do not consider the feature complete until every item in the Definition of Done checklist passes.

* * *

## 46\. Đánh giá cuối cùng

Với yêu cầu của trường Trần Bội Cơ, tôi sẽ **không triển khai “Admin biến thành user khác” theo nghĩa authentication thật**.

Thiết kế phù hợp hơn là:

> **Admin View-As / Read-Only Simulation**

với 3 lớp nhận thức:

```
WHO AM I?
    → Admin thật

WHO AM I VIEWING AS?
    → GVCN / Giám thị / Học sinh...

WHAT DATA AM I ALLOWED TO MODIFY?
    → NOTHING trong View-As
```

Đây là điểm then chốt. Nó cho Admin khả năng **đi xuyên qua toàn bộ UX của từng nhóm người dùng và xem dữ liệu thật**, nhưng không biến một thao tác nhầm trong lúc kiểm tra giao diện thành thao tác ghi CSDL thật.

Về mặt sản phẩm, tôi còn xem đây không chỉ là một tính năng “đổi role”, mà là nền móng cho một **Admin QA/UX Control Center**: Role Journey + Permission Matrix + Missing UI Detector + Fixture/Real Data + Audit Trail có thể phát triển từ cùng một `ViewAsContext`.

[Supabase+2Supabase+2](https://supabase.com/docs/guides/auth?utm_source=chatgpt.com)