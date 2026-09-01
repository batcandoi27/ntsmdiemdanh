⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# MASTER PLAN ĐÁNH GIÁ KIẾN TRÚC — HỆ THỐNG SƠ YẾU LÝ LỊCH HỌC SINH

## 1\. Kết luận kiến trúc

Đề xuất **tạo module hồ sơ riêng, liên kết 1:1 với `students` bằng `student_id`** là hướng đi đúng và an toàn nhất.

**Khuyến nghị chính:** không nên lưu toàn bộ dữ liệu chỉ dưới dạng một JSONB "tự do". Nên dùng mô hình:

- **Cột quan hệ/index:** `student_id`, `class_id`, `academic_year`, trạng thái workflow, timestamps.
- **`profile_data JSONB`:** lưu đầy đủ biểu mẫu 3 phần.
- **JSON Schema/Zod/TypeScript schema bắt buộc:** kiểm soát cấu trúc, kiểu dữ liệu và validation.
- **Version hóa schema:** để biểu mẫu có thể thay đổi theo năm học mà không phá dữ liệu cũ.

Điều này giữ nguyên **Zero-Regression Invariant**: module điểm danh tiếp tục đọc/ghi `students` và các bảng điểm danh hiện hữu, không phải join hoặc phụ thuộc vào hồ sơ sơ yếu lý lịch.

* * *

# 2\. Đánh giá tính đầy đủ của `StudentCurriculumVitae`

## 2.1. Các phần nghiệp vụ đã bao phủ

Danh sách yêu cầu hiện tại đã bao phủ đầy đủ 3 nhóm lớn:

| Nhóm | Trạng thái |
| --- | --- |
| I. Thông tin bản thân | Đầy đủ |
| II. Thông tin gia đình | Đầy đủ |
| III. Ý kiến phụ huynh | Đầy đủ |
| Chính sách học sinh | Đầy đủ |
| Sức khỏe/BHYT | Đầy đủ |
| Người quản lý trực tiếp | Đầy đủ |
| Anh/chị/em ruột | Đầy đủ |
| Khảo sát tính cách 16 lựa chọn | Đầy đủ |
| Hoàn cảnh đặc biệt | Đầy đủ |
| Liên hệ chính/chữ ký | Đầy đủ |
| Draft/Submit/Verify/Lock | Cần chuẩn hóa thêm |

Tuy nhiên, để hệ thống có thể triển khai production ổn định, tôi đề xuất bổ sung **metadata, workflow state, schema version và audit fields**.

* * *

## 2.2. JSON Schema đề xuất

TypeScript

```
type Gender = 'male' | 'female' | 'other' | 'unspecified';

type PolicyCategory =
  | 'child_of_war_invalid'
  | 'poor_or_near_poor_household'
  | 'child_of_martyr'
  | 'orphan_both_parents'
  | 'other';

type ContactRole = 'father' | 'mother' | 'guardian';

interface VietnamLocation {
  ward?: string;
  province?: string;
}

interface DetailedAddress extends VietnamLocation {
  houseNumberStreet?: string;
  neighborhood?: string;
  hamletVillage?: string;
}

interface ParentPerson {
  fullName: string;
  birthYear?: number;
  citizenId?: string;
  phoneNumbers: string[];
  occupation?: string;
  position?: string;
  workplace?: string;
}

interface Sibling {
  fullName: string;
  birthYear?: number;
  occupationOrSchool?: string;
}

interface StudentCurriculumVitaeProfile {
  schemaVersion: '1.0';

  student: {
    fullNameUppercase: string;
    gender: Gender;

    dateOfBirth: string;
    birthOrder?: number;

    ethnicity?: string;
    nationality?: string;
    religion?: string;

    identity: {
      citizenId?: string;
      issuedDate?: string;
      issuedPlace?: string;
      personalIdentificationNumber?: string;
    };

    birthplace: {
      medicalFacility?: string;
      ward?: string;
      province?: string;
    };

    birthRegistrationPlace: VietnamLocation;

    hometown: {
      hamletVillage?: string;
      ward?: string;
      province?: string;
    };

    permanentResidence: DetailedAddress;
    currentResidence: DetailedAddress;

    policyStatus: {
      items: Array<{
        category: PolicyCategory;
        warInvalidType?: string;
        householdCode?: string;
        description?: string;
      }>;
    };

    livingWith?: string;

    directManager?: {
      fullName?: string;
      relationship?: string;
      phone?: string;
    };

    hobbiesTalents?: string;

    healthNotes?: {
      chronicDiseases?: string;
      vision?: string;
      cardiovascular?: string;
      allergies?: string;
      otherNotes?: string;
    };

    classPosition?: string;

    healthInsurance?: {
      insuranceNumber?: string;
      initialHealthcareFacility?: string;
    };
  };

  family: {
    father?: ParentPerson;
    mother?: ParentPerson;
    guardian?: ParentPerson;

    siblings: Sibling[];
  };

  parentOpinion: {
    personalityTraits: {
      patientHardworking?: boolean;
      politeModerate?: boolean;
      introverted?: boolean;
      competitivePerfectionist?: boolean;
      sociableOpen?: boolean;
      caring?: boolean;
      creativeDreamy?: boolean;
      rebelliousOppositional?: boolean;
      hotTempered?: boolean;
      honest?: boolean;
      passiveIndifferent?: boolean;
      leadershipInfluential?: boolean;
      sensitiveShy?: boolean;
      extroverted?: boolean;
      carefreeHumorous?: boolean;
      other?: string;
    };

    specialFamilyCircumstances?: string;

    primaryEmergencyContact?: {
      role: ContactRole;
      fullName?: string;
      phone?: string;
    };

    declarant?: {
      fullName: string;
      declaredAt?: string;
      signatureType?: 'typed' | 'digital' | 'uploaded';
      signatureReference?: string;
    };
  };
}
```

## Nhận xét quan trọng

### A. Không nên dùng mảng checkbox nếu bộ lựa chọn là cố định

Ví dụ này không tối ưu:

JSON

```
{
  "traits": [
    "honest",
    "introverted"
  ]
}
```

Tôi khuyến nghị:

JSON

```
{
  "personalityTraits": {
    "honest": true,
    "introverted": true,
    "other": ""
  }
}
```

Lợi ích:

- dễ render đúng 16 checkbox;
- dễ export DOCX;
- không phụ thuộc spelling;
- validation rõ ràng;
- thêm trường mới có thể kiểm soát bằng `schemaVersion`.

* * *

### B. `siblings` nên giới hạn nghiệp vụ tối đa 5 nhưng schema vẫn linh hoạt

TypeScript

```
siblings: Sibling[] // validation: max(5)
```

Validation không nên chỉ dựa vào UI; API cũng phải enforce `max(5)`.

* * *

### C. Ngày tháng nên lưu ISO

Ví dụ:

JSON

```
"dateOfBirth": "2014-08-28"
```

Không lưu:

JSON

```
"dateOfBirth": "28/08/2014"
```

UI và DOCX có thể hiển thị `dd/MM/yyyy`, còn database/API dùng ISO để tránh lỗi locale.

* * *

# 3\. Schema database production đề xuất

SQL

```
CREATE TABLE student_curriculum_vitae (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL UNIQUE
        REFERENCES students(id)
        ON DELETE CASCADE,

    class_id VARCHAR NOT NULL,

    academic_year VARCHAR NOT NULL DEFAULT '2026-2027',

    schema_version VARCHAR NOT NULL DEFAULT '1.0',

    profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    status VARCHAR NOT NULL DEFAULT 'draft',

    parent_submitted_at TIMESTAMPTZ,
    teacher_verified_at TIMESTAMPTZ,
    teacher_verified_by UUID,

    is_locked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Tôi đề xuất enum workflow logic:

```
draft
submitted
under_review
verified
returned_for_revision
locked
```

Thay vì chỉ dùng:

```
parent_submitted_at
teacher_verified_at
is_locked
```

Các timestamp vẫn nên giữ, nhưng `status` giúp frontend và API hiểu trạng thái hiện tại một cách rõ ràng.

## Index đề xuất

SQL

```
CREATE INDEX idx_student_curriculum_vitae_class_year
ON student_curriculum_vitae(class_id, academic_year);

CREATE INDEX idx_student_curriculum_vitae_status
ON student_curriculum_vitae(status);

CREATE INDEX idx_student_curriculum_vitae_profile_gin
ON student_curriculum_vitae
USING GIN(profile_data);
```

### Lưu ý về GIN index

Không nên mặc định query mọi báo cáo trực tiếp qua JSONB. GIN chỉ nên được giữ nếu thực sự có nhu cầu tìm kiếm/filter sâu trong `profile_data`.

Ví dụ báo cáo thường xuyên theo:

- lớp;
- năm học;
- trạng thái đã nộp;
- đã duyệt;

thì các trường này nên nằm ở cột quan hệ/index riêng.

* * *

# 4\. Đánh giá an toàn kiến trúc: Zero-Regression

## Đạt yêu cầu nếu tuân thủ nguyên tắc sau

```
ATTENDANCE MODULE
       │
       ├── students
       ├── classes
       ├── attendance_records
       └── attendance reports

CURRICULUM VITAE MODULE
       │
       ├── students (reference only)
       └── student_curriculum_vitae
```

**Không thay đổi:**

- schema hiện hữu của attendance;
- query điểm danh;
- webhook điểm danh;
- API contract điểm danh;
- index điểm danh;
- cache điểm danh.

Module hồ sơ chỉ thực hiện:

```
student_id -> students.id
```

và không làm ngược lại.

## Quy tắc kiến trúc bắt buộc

### Rule 1 — Attendance không được join bắt buộc sang Vitae

Sai:

SQL

```
SELECT ...
FROM attendance_records a
JOIN students s ON ...
JOIN student_curriculum_vitae v ON ...
```

Đúng:

SQL

```
SELECT ...
FROM attendance_records a
JOIN students s ON ...
```

Hồ sơ chỉ được load tại những route cần hồ sơ.

* * *

### Rule 2 — Không sửa API response cũ nếu không cần

Ví dụ API hiện tại:

```
GET /api/students
```

không nên đột ngột trả thêm toàn bộ:

```
curriculumVitae.profile_data
```

vì:

- payload lớn hơn;
- dữ liệu CCCD/sức khỏe rất nhạy cảm;
- tăng chi phí network;
- có thể tạo regression frontend.

Tạo API riêng:

```
GET  /api/students/:studentId/curriculum-vitae
PUT  /api/students/:studentId/curriculum-vitae
POST /api/students/:studentId/curriculum-vitae/submit
POST /api/students/:studentId/curriculum-vitae/verify
POST /api/students/:studentId/curriculum-vitae/return
POST /api/students/:studentId/curriculum-vitae/lock
```

* * *

### Rule 3 — Phân quyền dữ liệu nhạy cảm

`profile_data` chứa:

- CCCD học sinh;
- CCCD cha/mẹ;
- điện thoại;
- sức khỏe;
- hoàn cảnh gia đình.

Do đó không được coi đây là dữ liệu `student` thông thường.

Phân quyền tối thiểu:

| Role | Quyền |
| --- | --- |
| Parent/Guardian | Chỉ hồ sơ con mình |
| Homeroom Teacher | Học sinh thuộc lớp được phân công |
| School Admin | Theo quyền quản trị |
| Attendance Staff | Không mặc định đọc toàn bộ hồ sơ |
| Student | Không mặc định có quyền truy cập |

API list phải dùng **masked fields** khi không cần dữ liệu đầy đủ.

Ví dụ:

```
CCCD: ********1234
SĐT: 09******89
```

* * *

# 5\. Auto-fill nhưng không tạo phụ thuộc dữ liệu nguy hiểm

Cổng phụ huynh có thể prefill:

- họ tên;
- ngày sinh;
- giới tính;
- lớp;
- mã học sinh nếu có.

Nhưng phải xác định rõ **source of truth**.

Khuyến nghị:

```
students
    ↓
initial prefill
    ↓
student_curriculum_vitae.profile_data
```

Sau khi phụ huynh gửi hồ sơ, `profile_data` là **snapshot khai báo cho năm học đó**, không tự động bị ghi đè khi một field trong `students` thay đổi.

Điều này rất quan trọng vì:

```
Hồ sơ 2026-2027
```

có thể cần giữ nguyên giá trị đã khai báo tại thời điểm xác nhận.

* * *

# 6\. Workflow đề xuất

```
DRAFT
  │
  │ Parent saves
  ▼
DRAFT
  │
  │ Submit
  ▼
SUBMITTED
  │
  ├───────────────┐
  │               │
Teacher returns   Teacher verifies
  │               │
  ▼               ▼
RETURNED       VERIFIED
  │               │
  └───────┐       │
          │       │ Lock
          ▼       ▼
        DRAFT    LOCKED
```

## API guard quan trọng

```
LOCKED
```

không được update bằng endpoint save thông thường.

Muốn sửa phải có workflow rõ ràng:

```
Admin unlock
hoặc
Teacher returns for revision
```

Mỗi thay đổi sau `verified` nên có audit log.

* * *

# 7\. Khuyến nghị bổ sung bảng Audit

Nếu hệ thống triển khai thật với dữ liệu hồ sơ học sinh, nên thêm:

SQL

```
CREATE TABLE student_curriculum_vitae_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_vitae_id UUID NOT NULL
        REFERENCES student_curriculum_vitae(id)
        ON DELETE CASCADE,

    actor_id UUID,
    action VARCHAR NOT NULL,

    previous_status VARCHAR,
    next_status VARCHAR,

    changed_fields JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Các action:

```
created
autosaved
submitted
returned
verified
locked
unlocked
exported_docx
exported_pdf
```

Không nhất thiết lưu toàn bộ `profile_data` ở mỗi lần autosave vì sẽ nhanh làm audit table phình lớn.

* * *

# 8\. Kiến trúc API đề xuất

## Parent Portal

```
GET  /api/portal/curriculum-vitae
PUT  /api/portal/curriculum-vitae
POST /api/portal/curriculum-vitae/submit
```

`PUT`:

```
status = draft
```

Auto-save nên có debounce, ví dụ 1.5–3 giây sau khi người dùng ngừng nhập.

Không nên gọi API mỗi ký tự.

## Homeroom

```
GET  /api/homeroom/students/:studentId/curriculum-vitae
PATCH /api/homeroom/students/:studentId/curriculum-vitae
POST  /api/homeroom/students/:studentId/curriculum-vitae/verify
POST  /api/homeroom/students/:studentId/curriculum-vitae/return
POST  /api/homeroom/students/:studentId/curriculum-vitae/lock
```

## Print Center

```
GET  /api/homeroom/curriculum-vitae/print
POST /api/homeroom/export-docx
POST /api/homeroom/export-pdf
```

* * *

# 9\. Thiết kế export DOCX/PDF

Đây là phần cần tách riêng thành service:

```
CurriculumVitaeService
        │
        ├── ProfileValidationService
        ├── WorkflowService
        ├── ExportMappingService
        │       ├── DOCX Template Mapper
        │       └── PDF Renderer
        └── AuditService
```

## Mẫu A — Hồ sơ từng học sinh

```
profile_data
     ↓
Normalized Print DTO
     ↓
Template Mapper
     ↓
DOCX
     ↓
Optional PDF conversion
```

**Không nên để logic export đọc trực tiếp raw JSONB khắp codebase.**

Tạo mapper:

TypeScript

```
toCurriculumVitaePrintDTO(vitae)
```

DTO chịu trách nhiệm:

- format ngày;
- checkbox `☑ / ☐`;
- chuyển boolean thành ký hiệu in;
- ghép địa chỉ;
- bỏ trống đúng vị trí khi không có dữ liệu;
- giới hạn 5 anh/chị/em;
- chuẩn hóa chữ in hoa.

## Mẫu B — Thống kê toàn lớp

Dùng query/service riêng tạo row:

TypeScript

```
interface CurriculumVitaeClassExportRow {
  studentName: string;
  className: string;
  insuranceNumber?: string;
  citizenId?: string;
  fatherPhone?: string;
  motherPhone?: string;
  healthNotes?: string;
  specialFamilyCircumstances?: string;
}
```

UI chọn cột:

```
☑ BHYT
☑ CCCD
☑ SĐT Cha
☑ SĐT Mẹ
☐ Tình trạng sức khỏe
☑ Hoàn cảnh đặc biệt
```

Backend nhận danh sách whitelist. Không nhận arbitrary database field names từ client.

* * *

# 10\. Phase triển khai theo Dev Loop

## Phase 0 — Discovery & Baseline

**Mục tiêu:** bảo vệ hệ thống hiện tại trước khi code.

Thực hiện:

1. Lập inventory:
   
   - `students`;
   - attendance tables;
   - existing APIs;
   - portal routes;
   - homeroom routes;
   - auth/RBAC;
   - DOCX/export infrastructure.
2. Ghi baseline:
   
   - test điểm danh;
   - response contract quan trọng;
   - query performance nếu có benchmark.
3. Tạo checklist:
   
   ```
   [ ] No attendance schema modification
   [ ] No attendance API contract modification
   [ ] No mandatory join to vitae
   [ ] Existing attendance tests remain green
   ```

**Exit criteria:** hiểu rõ integration points trước migration.

* * *

## Phase 1 — Domain & Contract First

Tạo:

```
StudentCurriculumVitaeProfile
CurriculumVitaeStatus
CurriculumVitaePrintDTO
validation schema
API DTOs
```

Viết validation cho:

- CCCD format nếu áp dụng;
- phone number;
- date;
- birth order;
- sibling max 5;
- checkbox fixed set;
- conditional policy details;
- required fields trước submit;
- readonly/locked status.

**Exit criteria:** test schema pass độc lập với UI/database.

* * *

## Phase 2 — Database Migration

Chỉ thêm:

```
student_curriculum_vitae
student_curriculum_vitae_audit_logs
```

Không alter bảng attendance.

Thực hiện migration rollback plan.

Test:

```
create
update
unique(student_id)
cascade behavior
class/year indexes
status queries
```

**Exit criteria:** toàn bộ regression test điểm danh vẫn pass.

* * *

## Phase 3 — Service/API Layer

Triển khai:

```
Repository
Service
Authorization
Validation
Workflow
Audit
```

Ưu tiên API test trước UI.

Test các case:

```
Parent A cannot read Student B
Teacher cannot read another class
Locked record cannot normal-update
Draft can autosave
Submitted cannot silently overwrite
Returned can be edited
Verified requires teacher permission
```

**Exit criteria:** API contract ổn định.

* * *

## Phase 4 — Parent Portal

Route:

```
/portal
```

Tab:

```
📝 Sơ Yếu Lý Lịch
```

UI chia 3 section lớn, tránh form 1 trang quá dài trên mobile.

```
Step 1: Bản thân
Step 2: Gia đình
Step 3: Ý kiến phụ huynh
Review & Submit
```

Có:

- autosave;
- save indicator;
- validation inline;
- progress;
- submit confirmation;
- read-only khi locked.

**Exit criteria:** phụ huynh hoàn thành toàn bộ form trên mobile.

* * *

## Phase 5 — Homeroom Management

Route:

```
/homeroom/students
```

Thêm action:

```
Xem hồ sơ
```

Drawer/modal:

```
Thông tin đầy đủ
Trạng thái
Lịch sử
Yêu cầu bổ sung
Xác nhận
Khóa hồ sơ
```

Danh sách lớp nên có summary nhẹ:

```
Đã nộp: 32/40
Đã duyệt: 28
Cần bổ sung: 4
Chưa nộp: 8
```

Không tải full `profile_data` cho toàn bộ học sinh nếu không cần.

**Exit criteria:** teacher workflow hoàn chỉnh.

* * *

## Phase 6 — Print Center & Export

Route:

```
/homeroom/print-center
```

Triển khai thứ tự:

1. Print DTO.
2. DOCX Mẫu A.
3. Snapshot visual test.
4. Class statistics Mẫu B.
5. PDF nếu stack hiện tại hỗ trợ conversion ổn định.

### Quan trọng với yêu cầu "100% theo mẫu"

Không nên tuyên bố đạt "100%" chỉ từ mô tả field. Cần dùng chính **ảnh biểu mẫu chính thức 2 trang** làm acceptance artifact.

Checklist visual:

```
[ ] Đúng tiêu đề
[ ] Đúng thứ tự trường
[ ] Đúng nhãn
[ ] Đủ checkbox
[ ] Đúng số dòng
[ ] Không mất trường dài
[ ] Không lệch trang
[ ] Không tràn bảng
[ ] Đúng 2 trang khi in
[ ] Test dữ liệu ngắn
[ ] Test dữ liệu dài
[ ] Test toàn bộ checkbox
```

**Exit criteria:** visual QA sign-off so với biểu mẫu tham chiếu.

* * *

## Phase 7 — Hardening & Regression

Chạy:

```
Unit tests
Integration tests
Authorization tests
Migration tests
Attendance regression tests
Export tests
Responsive tests
Load tests
Security review
```

Đặc biệt kiểm tra:

- không leak CCCD;
- không leak health data;
- export authorization;
- logs không ghi raw sensitive JSON;
- backup/restore;
- retention policy;
- autosave conflict.

* * *

# 11\. Rủi ro chính và quyết định xử lý

| Rủi ro | Mức | Xử lý |
| --- | --- | --- |
| Phá attendance | Cao | Module/bảng/API riêng |
| JSONB mất kiểm soát | Cao | Zod/JSON Schema + version |
| Lộ CCCD/sức khỏe | Rất cao | RBAC + masking + audit |
| Form thay đổi theo năm | Trung bình | `schema_version` |
| Export sai mẫu | Cao | Print DTO + visual QA |
| Autosave ghi đè | Trung bình | version/updated\_at conflict |
| Query JSONB chậm | Trung bình | index field quan trọng |
| Payload list quá lớn | Trung bình | summary endpoint riêng |
| Locked bị sửa | Cao | server-side workflow guard |

* * *

# 12\. Khuyến nghị cuối cùng

Kiến trúc nên được chốt theo công thức:

```
STUDENTS
    │
    │ stable existing core
    ▼
ATTENDANCE SYSTEM
    │
    └── KHÔNG THAY ĐỔI
```

song song:

```
STUDENTS
    │ 1:1
    ▼
STUDENT_CURRICULUM_VITAE
    │
    ├── profile_data JSONB
    ├── schema_version
    ├── status workflow
    ├── submission/verification metadata
    └── audit trail
```

**Đánh giá tổng thể:**

- **Độ đầy đủ nghiệp vụ:** 9/10
- **An toàn với module điểm danh:** 10/10 nếu giữ strict module boundary
- **Khả năng mở rộng:** 9/10
- **Khả năng export theo biểu mẫu thực tế:** 9/10, với điều kiện thực hiện visual QA trực tiếp trên ảnh/mẫu DOCX chính thức
- **Khuyến nghị triển khai:** **GO**, nhưng bắt đầu bằng **Phase 0 → Phase 2 → regression test**, không nhảy ngay vào UI.

Điểm cần bổ sung quan trọng nhất trước khi bắt đầu code là: **schema version, status workflow, RBAC dữ liệu nhạy cảm, audit log và Print DTO tách khỏi raw JSONB**. Đây là 5 thành phần giúp module sơ yếu lý lịch có thể phát triển độc lập nhiều năm mà vẫn không tạo regression cho hệ thống điểm danh.