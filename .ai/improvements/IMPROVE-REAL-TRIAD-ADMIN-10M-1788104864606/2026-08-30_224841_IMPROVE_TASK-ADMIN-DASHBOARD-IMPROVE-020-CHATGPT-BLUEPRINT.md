⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là bản thiết kế ở mức **architecture + product specification**, ưu tiên privacy-by-design, tenant isolation và khả năng triển khai thực tế trên **Next.js 14 App Router + Recharts + Supabase**. Tôi cũng đối chiếu yêu cầu pháp lý với **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15**, hiện có hiệu lực từ 01/01/2026; đặc biệt Điều 24 quy định cơ chế bảo vệ riêng đối với dữ liệu của trẻ em. [Văn Bản Chính Phủ+1](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=&utm_source=chatgpt.com)

ADMIN DASHBOARD v2.0

# ADMIN DASHBOARD v2.0

## Kiến trúc Quản trị & Điều hành BGH — Senior Architecture Specification

**Task ID:** `TASK-ADMIN-DASHBOARD-IMPROVE-020`  
**Stack:** Next.js 14 App Router · TypeScript · Recharts · Supabase/PostgreSQL  
**Audience:** BGH · Ban Giám hiệu · Quản trị viên nhà trường · Khối trưởng  
**Architecture principles:** Privacy-by-Design · Tenant Isolation · RBAC · Least Privilege · Server-authoritative authorization · Explainable Risk Analytics

* * *

# 1\. Executive Architecture Decision

Dashboard v2.0 không nên được xây dựng như một trang biểu đồ lớn có thêm vài bộ lọc.

Nó nên được thiết kế thành **Executive Decision System** gồm 4 lớp:

```
┌──────────────────────────────────────────────────────────────┐
│                 BGH EXECUTIVE DASHBOARD                      │
│                                                              │
│  TAB 1: Tổng quan    TAB 2: Radar nguy cơ    TAB 3: Quản trị│
└──────────────────────────────┬───────────────────────────────┘
                               │
                     Presentation / UX Layer
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    Analytics / Policy Layer                   │
│                                                              │
│  Attendance KPI │ Z-Score │ Risk Classification │ Aggregates │
└──────────────────────────────┬───────────────────────────────┘
                               │
                     Authorized Query Layer
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    Supabase / PostgreSQL                      │
│                                                              │
│  RLS │ Tenant Isolation │ Views │ Functions │ Audit Logs      │
└──────────────────────────────────────────────────────────────┘
```

### Quyết định kiến trúc chính

1. **Browser không được quyết định quyền truy cập.**
2. **RLS là lớp bảo vệ cuối cùng**, không phụ thuộc vào filter của React.
3. **Meeting Projector Mode phải là privacy boundary**, không chỉ là CSS blur.
4. Dữ liệu định danh và dữ liệu analytics nên được **tách logical domain**.
5. Z-Score là tín hiệu thống kê, **không phải kết luận học sinh “vi phạm” hay “có vấn đề”**.
6. Risk score phải có **explanation** để BGH biết vì sao học sinh được đưa vào radar.
7. Mọi truy vấn dashboard phải bị giới hạn bởi `tenant_id` và scope của user.
8. Dữ liệu trẻ em phải được xử lý theo nguyên tắc bảo vệ đặc biệt; Điều 24 Luật 91/2025/QH15 quy định riêng đối với dữ liệu cá nhân của trẻ em và yêu cầu đồng ý kép trong trường hợp xử lý nhằm công bố/tiết lộ đời sống riêng tư của trẻ em từ đủ 7 tuổi trở lên.

* * *

# 2\. Product Information Architecture

## 2.1 Executive 3-Tab View

### TAB 01 — TỔNG QUAN

Mục tiêu: trả lời trong 10–20 giây:

> “Tình hình nề nếp toàn trường hiện tại thế nào?”

```
┌───────────────────────────────────────────────────────────────┐
│ QUẢN TRỊ & ĐIỀU HÀNH BGH                 [🔒 Projector Mode] │
│ Hôm nay · 30/08/2026       [Khối ▼] [Lớp ▼] [Khoảng thời gian]│
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Chuyên cần        Vi phạm       Cải thiện       Nguy cơ cao │
│    96.4%             42             +8.2%             17      │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  XU HƯỚNG NỀ NẾP — 30 NGÀY                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Recharts Line/Area                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
├───────────────────────────────┬───────────────────────────────┤
│ Phân bố theo khối             │ Cảnh báo mới                  │
│ BarChart                      │  ● Khối 8 tăng vắng           │
│                               │  ● 3 lớp có anomaly           │
└───────────────────────────────┴───────────────────────────────┘
```

### KPI bắt buộc

- Tỷ lệ chuyên cần
- Tỷ lệ đi muộn
- Tỷ lệ vắng không phép
- Số sự kiện nề nếp
- Xu hướng 7/30 ngày
- Số học sinh đang ở Risk Level `HIGH`
- Số lớp có anomaly
- Delta so với kỳ trước

Không dùng quá nhiều KPI trên viewport đầu tiên.

* * *

# 3\. TAB 02 — EARLY WARNING & ANOMALY RADAR

Mục tiêu:

> “Ai hoặc khu vực nào cần BGH xem xét trước?”

## 3.1 UX

```
┌──────────────────────────────────────────────────────────────┐
│ RADAR HỌC SINH NGUY CƠ                                       │
│                                                              │
│ [🔎 Tìm học sinh/lớp]  [Khối ▼] [Mức độ ▼] [7/30/90 ngày ▼]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 HIGH       🟠 MEDIUM       🟢 NORMAL       ⚪ DATA LOW    │
│     17             38              842             21         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Học sinh*     Lớp    Risk    Z-Score   Tín hiệu       Xu hướng│
│                                                              │
│ Ng** V** A**   8A2    HIGH     +3.1    Vắng tăng      ↗      │
│ Tr** M** K**   9B1    HIGH     +2.7    Đi muộn        ↗      │
│ Ph** H** T**   7A3   MEDIUM    +2.1    Vi phạm        →      │
└──────────────────────────────────────────────────────────────┘
```

\* Khi Projector Mode bật, tất cả danh tính phải được anonymize.

## 3.2 Search

Search không được gửi toàn bộ bảng học sinh xuống browser.

Thay vào đó:

```
User
  │
  ▼
Search Input
  │
  ▼
Server Action / Route Handler
  │
  ├── authenticate()
  ├── authorize(scope)
  ├── tenant filter
  └── parameterized query
         │
         ▼
     PostgreSQL
```

Search phải hỗ trợ:

- mã học sinh
- tên
- lớp
- khối

Nhưng kết quả trả về phải phụ thuộc RBAC.

* * *

# 4\. Risk Model

## 4.1 Không dùng Z-Score đơn độc

Z-Score:

```
z = (x - μ) / σ
```

Trong đó:

- `x`: chỉ số hiện tại của học sinh
- `μ`: baseline của nhóm tham chiếu
- `σ`: độ lệch chuẩn

Ví dụ:

```
Attendance anomaly
z_attendance = (absence_student - absence_cohort_mean)
               / absence_cohort_stddev
```

### Nhưng cần xử lý zero/low variance

Nếu:

```
σ ≈ 0
```

thì không được tạo:

```
Infinity
NaN
```

Thay vào đó:

```
if cohort_count < MIN_COHORT_SIZE:
    statistic_status = "INSUFFICIENT_DATA"

if stddev < EPSILON:
    use_percentile_or_absolute_threshold()
```

* * *

# 5\. Multi-Signal Risk Engine

Khuyến nghị không tạo risk từ một biến duy nhất.

```
Risk Score =
    W1 * attendance_anomaly
  + W2 * lateness_anomaly
  + W3 * discipline_anomaly
  + W4 * negative_trend
  + W5 * repeated_events
```

Ví dụ cấu hình:

```
attendance_anomaly   35%
lateness_anomaly     20%
discipline_anomaly   20%
negative_trend       15%
repeated_events      10%
```

Các weight phải là **configuration**, không hard-code vào UI.

* * *

# 6\. Risk Classification

```
                    ┌───────────────┐
                    │ Data Quality  │
                    │ Check         │
                    └───────┬───────┘
                            │
                     insufficient?
                      /          \
                    YES           NO
                    │              │
             DATA_INSUFFICIENT     ▼
                              Calculate signals
                                     │
                                     ▼
                              Calculate score
                                     │
                       ┌─────────────┼─────────────┐
                       ▼             ▼             ▼
                    NORMAL        MEDIUM          HIGH
```

Khuyến nghị:

| Level | Điều kiện minh họa | UI |
| --- | --- | --- |
| `NORMAL` | score < 1.5 | Bình thường |
| `MEDIUM` | 1.5 ≤ score < 2.5 | Theo dõi |
| `HIGH` | score ≥ 2.5 | Cần xem xét |
| `DATA_INSUFFICIENT` | thiếu baseline | Không kết luận |

Các ngưỡng trên là **product defaults**, cần configurable và được BGH phê duyệt trước khi dùng thực tế.

* * *

# 7\. Explainability

Mỗi risk record phải có:

```
type RiskExplanation = {
  level: "NORMAL" | "MEDIUM" | "HIGH" | "DATA_INSUFFICIENT";

  score: number;

  signals: {
    metric: string;
    value: number;
    baseline: number;
    zScore?: number;
    contribution: number;
    direction: "POSITIVE" | "NEGATIVE";
  }[];

  generatedAt: string;
  modelVersion: string;
};
```

UI:

```
HIGH RISK — Score 2.87

Các tín hiệu chính:

🔴 Chuyên cần
   Z-Score: +3.1
   Đóng góp: 1.09

🟠 Đi muộn
   Z-Score: +2.2
   Đóng góp: 0.44

🟠 Xu hướng 30 ngày
   Giảm 12%
   Đóng góp: 0.38
```

Không dùng wording:

> “Học sinh có vấn đề.”

Nên dùng:

> “Dữ liệu cho thấy tín hiệu bất thường cần được xem xét.”

Đây là distinction quan trọng giữa **statistical signal** và **human judgment**.

* * *

# 8\. TAB 03 — BẢNG SỐ LIỆU QUẢN TRỊ KHỐI

Mục tiêu:

> “Khối/lớp nào đang tốt, xấu hoặc thay đổi nhanh?”

```
┌──────────────────────────────────────────────────────────────┐
│ BẢNG QUẢN TRỊ KHỐI                                          │
├──────┬────────┬─────────┬─────────┬─────────┬───────────────┤
│ Khối │ HS     │ CC %    │ Muộn    │ Vi phạm │ Risk High     │
├──────┼────────┼─────────┼─────────┼─────────┼───────────────┤
│ 6    │ 220    │ 97.1%   │ 12      │ 8       │ 2             │
│ 7    │ 218    │ 96.8%   │ 15      │ 11      │ 3             │
│ 8    │ 225    │ 94.2%   │ 31      │ 19      │ 8             │
│ 9    │ 211    │ 97.6%   │ 9       │ 6       │ 4             │
└──────┴────────┴─────────┴─────────┴─────────┴───────────────┘
```

Click vào khối:

```
Khối 8
  ↓
Danh sách lớp
  ↓
Metrics từng lớp
  ↓
Risk distribution
```

Không load toàn bộ hierarchy ngay từ đầu.

* * *

# 9\. MEETING PROJECTOR PRIVACY MODE

## 9.1 Principle

Projector Mode phải là **server-enforced presentation policy**, không chỉ:

```
filter: blur(...)
```

hoặc:

```
display: none
```

Bởi vì dữ liệu vẫn có thể tồn tại trong:

- React state
- browser memory
- network response
- DevTools
- HTML hydration payload
- client cache

## 9.2 Data contract

Normal mode:

```
{
  "studentId": "uuid",
  "displayName": "Nguyen Van A",
  "className": "8A2",
  "riskLevel": "HIGH"
}
```

Projector mode:

```
{
  "studentId": null,
  "displayName": "Ng** V** A**",
  "className": "8A2",
  "riskLevel": "HIGH"
}
```

Tốt hơn nữa, API Projector không trả `studentId` nếu UI không cần nó.

```
Projection DTO ≠ Internal Student DTO
```

* * *

# 10\. Anonymization Policy

Không nên dùng một regex masking tùy ý.

Định nghĩa policy:

```
type PrivacyMode =
  | "NORMAL"
  | "PROJECTOR";
```

```
type ProjectionPolicy = {
  showStudentName: boolean;
  showStudentId: boolean;
  showAvatar: boolean;
  showContact: boolean;
  showSensitiveAttributes: boolean;
};
```

Projector:

```
showStudentName       = masked
showStudentId         = false
showAvatar             = false
showContact            = false
showSensitiveAttributes = false
```

Tên có thể hiển thị:

```
Ng** V** A**
```

hoặc một alias:

```
HS-08-014
```

Alias dạng mã thường an toàn hơn nếu có nguy cơ người xem suy ra danh tính từ tên viết tắt.

* * *

# 11\. Projector UX

Projector mode phải có trạng thái nhìn thấy rõ:

```
┌──────────────────────────────────────────────┐
│ 🔒 CHẾ ĐỘ CHIẾU HỘI NGHỊ                    │
│ Danh tính học sinh đang được ẩn danh         │
└──────────────────────────────────────────────┘
```

Khi bật:

- hide sidebar không cần thiết
- tăng font size
- tăng contrast
- giảm mật độ UI
- không hiển thị email/số điện thoại
- không hiển thị avatar
- không hiển thị thông tin nhạy cảm
- không hiển thị raw student IDs
- disable thao tác drill-down có thể dẫn đến PII

### Fail-safe

Nếu privacy policy không tải được:

```
Projector Mode = SAFE
```

Không được fallback:

```
Projector Mode = Normal
```

* * *

# 12\. Data Flow

## 12.1 Normal Dashboard

```
                    ┌──────────────┐
                    │ Browser      │
                    └──────┬───────┘
                           │
                     HTTPS / Session
                           │
                           ▼
                 ┌───────────────────┐
                 │ Next.js App Router│
                 └─────────┬─────────┘
                           │
                  authenticate()
                           │
                           ▼
                    authorize(scope)
                           │
                           ▼
                 ┌───────────────────┐
                 │ Analytics Service │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │ Supabase Postgres │
                 │       + RLS       │
                 └───────────────────┘
```

## 12.2 Projector

```
Browser
  │
  │ projector=true
  ▼
Next.js Server
  │
  ├── authenticate
  ├── authorize PROJECTOR
  ├── resolve tenant
  ├── resolve privacy policy
  │
  ▼
Projection Query/View
  │
  ├── aggregate metrics
  ├── mask identity
  └── exclude PII
  │
  ▼
Browser
```

Điểm quan trọng:

> **Masking phải xảy ra trước khi dữ liệu rời trusted server boundary.**

* * *

# 13\. Supabase Data Architecture

Khuyến nghị schema domain:

```
tenants
 ├── tenant_members
 ├── roles
 ├── permissions
 │
 ├── students
 ├── classes
 ├── grades
 │
 ├── attendance_events
 ├── discipline_events
 │
 ├── analytics_daily
 ├── student_risk_scores
 ├── class_risk_scores
 │
 └── audit_logs
```

## 13.1 Tenant key

Các bảng business chính phải có:

```
tenant_id uuid not null
```

Không dựa vào quan hệ gián tiếp để suy tenant nếu có thể tránh.

* * *

# 14\. RLS Strategy

Mỗi bảng tenant-scoped:

```
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
```

Policy concept:

```
tenant_id = current_user_tenant_id()
```

Nhưng cần tránh một anti-pattern:

```
tenant_id được gửi từ client
        ↓
SELECT ...
WHERE tenant_id = client_value
```

Client không được tự khai báo tenant để quyết định scope.

Đúng:

```
Authenticated identity
       ↓
membership
       ↓
authorized tenant scope
       ↓
RLS
```

* * *

# 15\. RBAC

Khuyến nghị permission-based RBAC thay vì chỉ:

```
if role === "admin"
```

## Roles

```
SUPER_ADMIN
SCHOOL_ADMIN
PRINCIPAL
VICE_PRINCIPAL
GRADE_MANAGER
TEACHER
VIEWER
```

## Permissions

```
dashboard.read
dashboard.projector
analytics.read
risk.read
student.identity.read
student.sensitive.read
attendance.read
discipline.read
admin.users.manage
audit.read
```

Ví dụ:

| Role | Dashboard | Risk | PII | Projector |
| --- | --- | --- | --- | --- |
| Principal | ✓ | ✓ | ✓ | ✓ |
| Vice Principal | ✓ | ✓ | configurable | ✓ |
| Grade Manager | ✓ | ✓ scoped | limited | ✓ |
| Teacher | ✓ | scoped | class-only | ✗ |
| Viewer | ✓ | aggregate | ✗ | ✗ |

RBAC phải được kết hợp với **ABAC/scope**:

```
permission
+
tenant
+
school
+
grade
+
class
+
privacy mode
```

* * *

# 16\. Security Invariants

Đây là các invariant phải được coi là **non-negotiable**.

### INV-01 — Tenant isolation

Không có request hợp lệ nào của Tenant A được đọc dữ liệu Tenant B.

```
∀ query:
result.tenant_id ∈ authorizedTenantSet
```

### INV-02 — Server-authoritative authorization

UI hiding không được coi là security control.

### INV-03 — Projector never receives raw PII

Nếu component không cần PII, API không trả PII.

### INV-04 — No client-controlled tenant

Không tin:

```
?tenantId=
```

cho authorization.

### INV-05 — No privilege escalation

User không được tự sửa:

```
role
permissions
tenant_id
scope
```

### INV-06 — Risk does not equal verdict

`HIGH` chỉ là statistical alert.

### INV-07 — Explainability

Mỗi risk score phải truy được:

```
modelVersion
calculationTimestamp
baseline
signals
threshold
```

### INV-08 — Auditability

Các thao tác nhạy cảm phải audit:

```
login
role change
PII access
risk detail access
projector activation
export
bulk download
```

### INV-09 — Least privilege

Không sử dụng service-role credentials ở browser.

### INV-10 — Fail closed

Authorization/privacy failure:

```
DENY
```

không phải:

```
ALLOW
```

### INV-11 — Data minimization

Dashboard aggregate chỉ lấy những columns cần thiết.

### INV-12 — No sensitive data in logs

Không log:

```
student full name
phone
address
health information
raw personal identifiers
```

* * *

# 17\. API / Server Architecture

Khuyến nghị:

```
app/
├── (dashboard)/
│   └── admin/
│       ├── page.tsx
│       ├── overview/
│       ├── risk/
│       └── management/
│
├── api/
│   └── admin/
│       ├── overview/
│       ├── risk/
│       └── management/
│
lib/
├── auth/
│   ├── authenticate.ts
│   ├── authorize.ts
│   └── permissions.ts
│
├── tenant/
│   └── resolveTenantScope.ts
│
├── analytics/
│   ├── zscore.ts
│   ├── risk-engine.ts
│   └── explainability.ts
│
├── privacy/
│   ├── projector-policy.ts
│   └── anonymize.ts
│
└── audit/
    └── audit-event.ts
```

* * *

# 18\. Separation of DTOs

Không dùng chung database model với UI model.

```
DB Model
   ↓
Domain Model
   ↓
Authorization
   ↓
Projection Policy
   ↓
Dashboard DTO
```

Ví dụ:

```
StudentRecord
        ↓
AuthorizedStudent
        ↓
ProjectorStudentDTO
```

Điều này giúp tránh lỗi kiểu:

```
return student;
```

và vô tình expose toàn bộ columns.

* * *

# 19\. Analytics Pipeline

Khuyến nghị không tính mọi Z-Score realtime từ raw events cho mỗi page load.

```
Raw attendance/events
        │
        ▼
Daily aggregation
        │
        ▼
Cohort baseline
        │
        ▼
Feature calculation
        │
        ▼
Risk engine
        │
        ▼
student_risk_scores
        │
        ▼
Dashboard
```

## Refresh strategy

```
Realtime:
  attendance KPI hiện tại

Near-realtime:
  anomaly/risk

Daily:
  cohort baseline

Historical:
  trend aggregation
```

* * *

# 20\. Cohort Definition

Z-Score chỉ có ý nghĩa nếu baseline hợp lý.

Không nên so:

```
HS lớp 6
```

với:

```
toàn trường
```

một cách mặc định.

Cohort có thể là:

```
tenant
→ school
→ grade
→ class
→ period
```

Ví dụ:

```
absence_student
vs
absence_mean_grade_8
```

hoặc:

```
absence_student
vs
absence_mean_class_8A2
```

Cohort selection phải được version hóa.

* * *

# 21\. Data Quality Layer

Trước khi tính anomaly:

```
Missing?
Duplicate?
Outlier?
Insufficient sample?
Late ingestion?
Timezone mismatch?
```

Tạo:

```
type DataQualityStatus =
  | "GOOD"
  | "WARNING"
  | "INSUFFICIENT"
  | "INVALID";
```

Nếu:

```
sample_size < minimum
```

thì:

```
risk = DATA_INSUFFICIENT
```

không phải `HIGH`.

* * *

# 22\. UX Design System

## Visual hierarchy

BGH dashboard nên ưu tiên:

```
1. Decision
2. Alert
3. Trend
4. Detail
5. Raw data
```

Không đảo ngược thành:

```
Raw table
→ nhiều filter
→ nhiều chart
→ cuối cùng mới có insight
```

## Colors

Không dùng màu đỏ cho mọi thứ.

```
HIGH      = critical attention
MEDIUM    = monitor
NORMAL    = healthy
DATA LOW  = informational
```

Màu phải đi cùng:

- icon
- text label
- pattern/shape

để không phụ thuộc riêng vào màu.

* * *

# 23\. Responsive / Projector Layout

### Desktop

```
12-column grid
```

### Projector

```
16:9
minimum text size: 24–28px
KPI: 36–56px
```

Không dùng dashboard desktop thu nhỏ nguyên xi cho projector.

Projector là một **presentation surface riêng**.

* * *

# 24\. Recharts Guidelines

### Overview

- `LineChart` / `AreaChart`: xu hướng
- `BarChart`: so sánh khối
- `PieChart` chỉ dùng khi số category ít
- Tooltip phải có semantic label
- Không phụ thuộc tooltip để truyền thông tin quan trọng

### Performance

Không render hàng nghìn student points trực tiếp.

```
Raw records
→ aggregate
→ chart dataset
→ Recharts
```

* * *

# 25\. Accessibility

Dashboard BGH phải hỗ trợ:

- keyboard navigation
- focus states
- aria labels
- screen-reader labels
- text equivalent cho chart
- không dùng màu làm tín hiệu duy nhất
- bảng có semantic headers

Ví dụ:

```
Chart:
“Tỷ lệ chuyên cần giảm từ 97.4% xuống 94.2% trong 30 ngày,
giảm 3.2 điểm phần trăm.”
```

Chart phải có textual summary.

* * *

# 26\. Audit Model

```
audit_logs
------------
id
tenant_id
actor_user_id
action
resource_type
resource_id
scope
metadata
created_at
```

Ví dụ:

```
PRIVACY_PROJECTOR_ENABLED
RISK_DETAIL_VIEWED
STUDENT_PII_VIEWED
RISK_EXPORT_REQUESTED
ROLE_CHANGED
```

`metadata` không được chứa raw PII không cần thiết.

* * *

# 27\. Export Control

Export là một security boundary riêng.

Không cho:

```
Dashboard read
→ automatically export all students
```

Cần permission:

```
risk.export
student.export
```

Export phải:

1. authorize
2. enforce tenant
3. enforce scope
4. generate file server-side
5. audit
6. expire download URL

Projector mode:

```
export = DENY
```

theo mặc định.

* * *

# 28\. Privacy Mode State Machine

```
NORMAL
  │
  │ authorized user
  ▼
PROJECTOR
  │
  ├── timeout
  ├── logout
  ├── explicit exit
  └── authorization loss
          │
          ▼
        NORMAL
```

Nếu session mất:

```
PROJECTOR
  ↓
LOCKED
```

không giữ lại dashboard dữ liệu nhạy cảm.

* * *

# 29\. Security Test Matrix

## Tenant

```
User A / Tenant A
→ GET Tenant A = ALLOW

User A / Tenant A
→ GET Tenant B = DENY
```

## RBAC

```
Teacher
→ student.identity.read = DENY

Principal
→ student.identity.read = ALLOW
```

## Projector

```
Projector API
→ raw name = MUST NOT EXIST

Projector API
→ phone = MUST NOT EXIST

Projector API
→ student UUID = MUST NOT EXIST unless explicitly required
```

## Injection

Search phải dùng parameterized queries / Supabase query builder.

## Enumeration

Không để:

```
/student/{uuid}
```

cho phép brute-force UUID trở thành PII discovery vector.

* * *

# 30\. Performance Targets

Mục tiêu UX:

```
Initial dashboard:
< 2s perceived load

Tab switch:
< 500ms cached / prefetched

Risk list:
pagination + server-side filtering

Chart:
aggregate dataset only
```

Không fetch:

```
10,000 students
```

chỉ để hiển thị:

```
17 high-risk students
```

* * *

# 31\. Recommended Query Strategy

### Overview

```
SELECT
  tenant_id,
  period,
  attendance_rate,
  lateness_count,
  discipline_count,
  high_risk_count
FROM analytics_daily
WHERE tenant_id = authorized_tenant
  AND period BETWEEN ...
```

### Risk

```
SELECT
  masked_display_name,
  class_name,
  risk_level,
  risk_score,
  primary_signal,
  generated_at
FROM student_risk_projection
WHERE ...
ORDER BY risk_score DESC
LIMIT ...
```

`student_risk_projection` nên là một projection/view được thiết kế riêng cho dashboard, không phải raw student table.

* * *

# 32\. Suggested Database Views

```
v_admin_overview
v_admin_grade_metrics
v_admin_class_metrics
v_student_risk_dashboard
v_student_risk_projector
```

Trong đó:

```
v_student_risk_dashboard
```

phục vụ user có quyền xem identity.

Còn:

```
v_student_risk_projector
```

không expose identity.

Hai projection này giúp giảm nguy cơ developer vô tình dùng nhầm DTO.

* * *

# 33\. Deployment Architecture

```
                 Internet
                    │
                    ▼
              Next.js 14
                    │
          ┌─────────┴─────────┐
          │                   │
       Auth/RBAC          Analytics
          │                   │
          └─────────┬─────────┘
                    ▼
              Supabase
          ┌─────────┴─────────┐
          │                   │
      PostgreSQL             Audit
        + RLS                Logs
```

Secrets:

```
SUPABASE_SERVICE_ROLE_KEY
```

chỉ tồn tại server-side.

Không expose qua:

```
NEXT_PUBLIC_*
```

* * *

# 34\. Implementation Phases

## Phase 1 — Security Foundation

- tenant model
- tenant membership
- RBAC
- permission matrix
- RLS
- audit log
- server authorization utilities

**Không bắt đầu bằng chart.**

## Phase 2 — Executive Overview

- KPI
- trend
- grade comparison
- data quality indicators

## Phase 3 — Risk Engine

- baseline
- Z-Score
- multi-signal score
- thresholds
- explanation
- versioning

## Phase 4 — Projector

- dedicated projection DTO
- anonymization
- projector UI
- fail-closed behavior
- export disable

## Phase 5 — Management Table

- grade
- class
- drill-down
- server pagination
- scoped filtering

## Phase 6 — Hardening

- RLS penetration tests
- RBAC tests
- privacy regression tests
- export tests
- audit verification
- performance testing

* * *

# 35\. Definition of Done

Dashboard v2.0 chỉ được coi là hoàn thành khi:

### Privacy

- Projector không nhận raw student PII.
- Student names được anonymize.
- Avatar/contact/sensitive fields bị loại khỏi projection.
- Projector fail-closed.
- Export bị khóa trong Projector.

### Tenant

- Mọi business table có tenant scope.
- RLS được bật.
- Cross-tenant tests đều fail.
- Client không quyết định tenant authorization.

### RBAC

- Permissions được kiểm tra server-side.
- Scope được áp dụng theo tenant/grade/class.
- PII access được permission riêng.

### Analytics

- Z-Score xử lý zero variance.
- Có minimum sample size.
- Có data-quality state.
- Risk score có explanation.
- Model/threshold version được lưu.

### UX

- Đủ 3 tabs.
- Search/filter server-side.
- Overview trả lời được trạng thái toàn trường nhanh.
- Risk tab trả lời được “cần chú ý ai/vùng nào”.
- Management tab trả lời được “khối/lớp nào thay đổi”.

### Audit

- PII access logged.
- Projector activation logged.
- Role changes logged.
- Export logged.

* * *

# 36\. Final Architecture Principle

Kiến trúc đề xuất có một nguyên tắc cốt lõi:

> **Dashboard không được coi dữ liệu học sinh là “dữ liệu để hiển thị”; dashboard phải coi đó là dữ liệu được cấp quyền để sử dụng cho một mục đích cụ thể.**

Do đó:

```
                  DATA
                    │
                    ▼
              Tenant Boundary
                    │
                    ▼
             Authentication
                    │
                    ▼
              Authorization
                    │
                    ▼
              Data Minimization
                    │
                    ▼
             Analytics / Risk
                    │
                    ▼
            Privacy Projection
                    │
                    ▼
              Executive UX
```

Đây là mô hình phù hợp hơn cho một hệ thống BGH so với kiến trúc:

```
Database
   ↓
API
   ↓
React
   ↓
Hide sensitive fields
```

Đặc biệt, Luật 91/2025/QH15 đã có hiệu lực từ 01/01/2026 và quy định riêng về bảo vệ dữ liệu cá nhân của trẻ em; vì vậy Projector Mode nên được thiết kế như một **privacy/security boundary ngay từ backend**, không phải một tính năng trình bày bổ sung ở frontend.

**Nguồn pháp lý chính:** [Luật số 91/2025/QH15 — Cổng Thông tin điện tử Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=&utm_source=chatgpt.com)

Nếu triển khai tiếp thành codebase, ưu tiên thứ tự **RLS + RBAC → privacy projection → analytics/risk engine → 3-tab UX**, thay vì làm giao diện trước rồi mới bổ sung security. Điều này giảm đáng kể nguy cơ phải refactor data-access layer sau khi dashboard đã phụ thuộc vào raw student records.