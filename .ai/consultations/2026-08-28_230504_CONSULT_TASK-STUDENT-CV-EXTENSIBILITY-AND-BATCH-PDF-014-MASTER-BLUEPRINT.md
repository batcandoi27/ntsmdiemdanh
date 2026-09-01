⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# Nâng cấp Master Plan — Batch PDF, Dynamic School Config, Admin Catalogs & Teacher Custom Fields

## 1\. Kiến trúc Batch PDF / Print CSS: khóa đúng 2 trang cho mỗi học sinh

### 1.1. Quyết định kiến trúc

Khuyến nghị triển khai theo mô hình **HTML là nguồn render duy nhất**, sau đó hỗ trợ 2 đầu ra:

```
Student/Profile Data
        +
Dynamic School Config
        +
Admin Catalog Config
        +
Teacher Custom Fields
        ↓
CV/Student Dossier ViewModel
        ↓
StudentCVPrintDocument
        ├── Browser Print → CSS @media print → PDF
        └── Batch Export → Render toàn bộ students → Print/PDF
```

Không nên duy trì hai bộ layout độc lập cho:

- form xem/in từng học sinh;
- PDF batch;
- print preview.

Cả hai đều phải dùng cùng một `StudentCVPrintDocument` để tránh sai lệch mẫu.

### 1.2. Cấu trúc DOM bắt buộc

Mỗi học sinh luôn là **một print unit gồm chính xác hai trang**:

TypeScript

```
<BatchStudentCVDocument>
  {students.map((student, index) => (
    <section
      className="student-print-unit"
      key={student.id}
      data-student-id={student.id}
    >
      <article className="cv-page cv-page-1">
        {/* Trang 1: Bản thân + Gia đình */}
      </article>

      <article className="cv-page cv-page-2">
        {/* Trang 2: Guardian + siblings + 16 traits + 3 signatures */}
      </article>
    </section>
  ))}
</BatchStudentCVDocument>
```

**Không** để browser tự quyết định nơi ngắt giữa các phần lớn.

### 1.3. CSS print A4

Dùng đơn vị vật lý `mm`, không dùng chiều cao theo `%` hoặc viewport:

CSS

```
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  html,
  body {
    width: 210mm;
    height: auto;
    margin: 0;
    padding: 0;
    background: #fff;
  }

  .no-print {
    display: none !important;
  }

  .student-print-unit {
    break-inside: avoid;
  }

  .cv-page {
    position: relative;
    width: 210mm;
    height: 297mm;
    box-sizing: border-box;

    /*
     * Ví dụ:
     * trái 28mm ≈ 2.8cm, đủ vùng bấm gáy
     * phải 15mm
     * trên/dưới điều chỉnh theo mẫu scan
     */
    padding: 15mm 15mm 15mm 28mm;

    overflow: hidden;

    break-after: page;
    page-break-after: always;

    break-inside: avoid;
    page-break-inside: avoid;
  }

  .cv-page-2 {
    break-after: auto;
    page-break-after: auto;
  }

  .student-print-unit:not(:last-child) .cv-page-2 {
    break-after: page;
    page-break-after: always;
  }
}
```

### 1.4. Chống tràn dòng

Điểm quan trọng nhất: **không cho dữ liệu tự do phá cấu trúc 2 trang**.

Mỗi vùng mẫu phải có giới hạn vật lý:

CSS

```
.print-field-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: clip;
  white-space: nowrap;
}

.print-field-value.wrap-2 {
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.fixed-row {
  min-height: 7mm;
  max-height: 7mm;
}
```

Các nguyên tắc:

1. **Field một dòng**: `nowrap + overflow: hidden`.
2. **Field được phép hai dòng**: clamp tối đa 2 dòng.
3. **Table**: thiết lập chiều cao hàng hoặc số hàng tối đa nếu mẫu cố định.
4. **Custom fields**: không được tự động kéo dài trang vô hạn.
5. Dữ liệu dài bất thường phải có chiến lược rõ ràng:
   
   - giảm font trong giới hạn nhỏ;
   - clamp;
   - rút gọn khi render print;
   - hoặc đưa phần vượt quá vào khu vực ghi chú có quota cố định.

Khuyến nghị tạo một hàm chuẩn hóa trước render:

TypeScript

```
type PrintTextOptions = {
  maxChars?: number;
  fallback?: string;
};

export function toPrintText(
  value: unknown,
  options: PrintTextOptions = {},
): string {
  const text = String(value ?? "").trim();
  const fallback = options.fallback ?? "................................";

  if (!text) return fallback;

  return options.maxChars
    ? text.slice(0, options.maxChars)
    : text;
}
```

Việc giới hạn cuối cùng nên dựa trên **layout capacity**, không chỉ dựa trên số ký tự.

### 1.5. Batch 43 học sinh

Ví dụ 43 học sinh:

```
43 × 2 = 86 trang A4
```

Luồng export:

```
GVCN
 ↓ click
"🖨️ Xuất / In Toàn Bộ Sơ Yếu Lý Lịch Cả Lớp (.PDF)"
 ↓
Authorize teacher owns class
 ↓
Load class + all active students
 ↓
Load app_settings once
 ↓
Load catalogs needed for label/value resolution
 ↓
Load custom field definitions for class
 ↓
Load all profile_data
 ↓
Build 43 PrintViewModels
 ↓
Validate every student
 ↓
Render exactly:
Student 1: Page 1 + Page 2
Student 2: Page 1 + Page 2
...
Student 43: Page 1 + Page 2
 ↓
window.print()
 ↓
Browser Save as PDF
```

### 1.6. ViewModel tách khỏi DB schema

Không render trực tiếp raw database row:

TypeScript

```
type StudentCVPrintViewModel = {
  studentId: string;

  school: {
    governingAuthority: string;
    schoolName: string;
    schoolYear: string;
  };

  classInfo: {
    className: string;
    homeroomTeacherName: string;
  };

  student: {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    ethnicity: string;
    religion: string;
    birthPlace: string;
    address: string;
    phone: string;
    // ...
  };

  guardians: GuardianPrintData[];
  siblings: SiblingPrintData[];
  personalityTraits: string[];
  customFields: CustomFieldPrintData[];
  signatures: SignaturePrintData;
};
```

Ưu điểm: thay đổi schema DB không làm thay đổi trực tiếp template in.

* * *

# 2\. Universal Dynamic School Config

## 2.1. Cấm hardcode

Các chuỗi sau không được xuất hiện trong component nghiệp vụ:

```
TRƯỜNG THCS TRẦN BỘI CƠ
ỦY BAN NHÂN DÂN QUẬN 5
```

Thay bằng resolver:

TypeScript

```
type SchoolPrintConfig = {
  governingAuthority: string;
  schoolName: string;
  schoolYear: string;
};

const schoolConfig = await getSchoolPrintConfig();
```

### 2.2. Khuyến nghị schema `app_settings`

Nếu hệ thống đã có bảng key-value, giữ cấu trúc này:

SQL

```
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NULL
);
```

Các key:

```
school.governing_authority
school.name
school.academic_year
school.address
school.phone
school.logo
```

Ví dụ:

JSON

```
{
  "key": "school.name",
  "value": {
    "text": "TRƯỜNG THCS ..."
  }
}
```

Hoặc tốt hơn cho các setting cùng nhóm:

```
school.profile
```

JSON

```
{
  "governingAuthority": "ỦY BAN NHÂN DÂN ...",
  "schoolName": "TRƯỜNG ...",
  "academicYear": "2026-2027",
  "address": "",
  "phone": ""
}
```

Khuyến nghị một record JSON nhóm để giảm round-trip và đơn giản hóa validation.

### 2.3. Nguồn tên GVCN

Không lưu cứng trong setting:

```
classes.homeroom_teacher_id
        ↓
users/teachers.full_name
```

Hoặc nếu schema hiện tại đã có:

```
classes.homeroom_teacher_name
```

Resolver ưu tiên:

TypeScript

```
homeroomTeacherName =
  class.teacher?.fullName ??
  class.homeroomTeacherName ??
  "";
```

### 2.4. Nguồn dữ liệu cuối cùng

| Dữ liệu | Nguồn |
| --- | --- |
| Cơ quan chủ quản | `app_settings` |
| Tên trường | `app_settings` |
| Niên khóa | `app_settings` |
| Tên lớp | `classes` |
| GVCN | quan hệ `classes → teachers/users` |
| Học sinh | `students` |
| Hồ sơ mở rộng | `profile_data` |

* * *

# 3\. Schema `AdminCatalogConfig`

Khuyến nghị không tạo một bảng riêng cho từng danh mục như `ethnicities`, `religions`, `hospitals` nếu yêu cầu là Admin CP có thể mở rộng nhiều catalog.

Dùng generic catalog model.

## 3.1. `admin_catalogs`

SQL

```
CREATE TABLE admin_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NULL,

  input_mode TEXT NOT NULL DEFAULT 'select'
    CHECK (input_mode IN ('select', 'chips')),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_by UUID NULL
);
```

Catalog code:

```
ethnicity
religion
birth_hospital
province
initial_healthcare_provider
```

## 3.2. `admin_catalog_items`

SQL

```
CREATE TABLE admin_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  catalog_id UUID NOT NULL
    REFERENCES admin_catalogs(id)
    ON DELETE CASCADE,

  code TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (catalog_id, code)
);

CREATE INDEX idx_admin_catalog_items_active
ON admin_catalog_items(catalog_id, is_active, sort_order);
```

Ví dụ tỉnh/TP:

JSON

```
{
  "code": "HCM",
  "label": "Thành phố Hồ Chí Minh",
  "value": "Thành phố Hồ Chí Minh",
  "metadata": {
    "region": "south"
  }
}
```

## 3.3. `AdminCatalogConfig` TypeScript

TypeScript

```
export type CatalogInputMode = "select" | "chips";

export interface AdminCatalogConfig {
  id: string;
  code:
    | "ethnicity"
    | "religion"
    | "birth_hospital"
    | "province"
    | "initial_healthcare_provider"
    | string;

  name: string;
  description?: string;
  inputMode: CatalogInputMode;
  isActive: boolean;

  items: AdminCatalogItem[];
}

export interface AdminCatalogItem {
  id: string;
  code: string;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}
```

### 3.4. Admin CP `/settings`

Nên có nhóm:

```
CẤU HÌNH TRƯỜNG
├── Cơ quan chủ quản
├── Tên trường
├── Niên khóa
└── Thông tin liên hệ

DANH MỤC DÙNG CHUNG
├── Dân tộc
├── Tôn giáo
├── Nơi sinh / Bệnh viện
├── Tỉnh / Thành phố
└── Nơi KCB ban đầu
```

Mỗi catalog hỗ trợ:

```
[+ Thêm mục]
[Chỉnh sửa]
[Bật/Tắt]
[Kéo thả thứ tự]
```

Không nên hard-delete item đang được student profile tham chiếu. Dùng `is_active = false`.

* * *

# 4\. Schema `TeacherCustomField`

Yêu cầu quan trọng: **definition và value phải tách riêng**.

Không nên chỉ nhét cả định nghĩa lẫn dữ liệu vào `profile_data.custom_fields`, vì sẽ khó:

- validate;
- thay đổi label;
- reorder;
- hiển thị bảng tổng hợp;
- thống kê;
- quản lý field đã bị xóa.

## 4.1. Field definition

SQL

```
CREATE TABLE teacher_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  class_id UUID NOT NULL
    REFERENCES classes(id)
    ON DELETE CASCADE,

  field_key TEXT NOT NULL,
  label TEXT NOT NULL,

  field_type TEXT NOT NULL
    CHECK (
      field_type IN (
        'text',
        'textarea',
        'number',
        'date',
        'phone',
        'select',
        'multi_select',
        'boolean'
      )
    ),

  options JSONB NOT NULL DEFAULT '[]'::jsonb,

  placeholder TEXT NULL,
  help_text TEXT NULL,

  required BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_parent_form BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_teacher_summary BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_print_pdf BOOLEAN NOT NULL DEFAULT FALSE,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (class_id, field_key)
);

CREATE INDEX idx_teacher_custom_fields_class
ON teacher_custom_fields(class_id, is_active, sort_order);
```

Ví dụ:

JSON

```
{
  "field_key": "uniform_size",
  "label": "Cỡ đồng phục",
  "field_type": "select",
  "options": [
    { "label": "S", "value": "S" },
    { "label": "M", "value": "M" },
    { "label": "L", "value": "L" }
  ],
  "required": false,
  "show_in_parent_form": true,
  "show_in_teacher_summary": true,
  "show_in_print_pdf": false
}
```

## 4.2. Giá trị trong `profile_data.custom_fields`

Theo yêu cầu, vẫn lưu value tại:

```
profile_data.custom_fields
```

Khuyến nghị JSON object:

JSON

```
{
  "transport_to_school": "Xe đạp",
  "uniform_size": "M",
  "zalo": "090...",
  "favorite_subjects": [
    "Toán",
    "Tin học"
  ]
}
```

Schema logic:

TypeScript

```
export type CustomFieldValues = Record<
  string,
  string | number | boolean | string[] | null
>;
```

Definition:

TypeScript

```
export interface TeacherCustomField {
  id: string;
  classId: string;
  fieldKey: string;
  label: string;
  fieldType:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "phone"
    | "select"
    | "multi_select"
    | "boolean";
  options: Array<{
    label: string;
    value: string;
  }>;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  showInParentForm: boolean;
  showInTeacherSummary: boolean;
  showInPrintPdf: boolean;
  sortOrder: number;
  isActive: boolean;
}
```

## 4.3. Quy tắc quyền

GVCN chỉ được quản lý definition của lớp mình:

```
Teacher
  → authenticated
  → assigned as homeroom teacher for class
  → may CRUD teacher_custom_fields for that class
```

Không được phép:

```
Teacher A → add/edit fields for Teacher B's class
Teacher → edit Admin shared catalogs
Parent → alter field definitions
```

Parent chỉ được cập nhật values của các field:

```
show_in_parent_form = true
```

và chỉ trong phạm vi hồ sơ học sinh mà parent có quyền.

## 4.4. Render động

Form phụ huynh:

TypeScript

```
{customFields
  .filter(field => field.showInParentForm && field.isActive)
  .map(field => (
    <DynamicProfileField
      key={field.id}
      definition={field}
      value={profile.custom_fields?.[field.fieldKey]}
      onChange={handleCustomFieldChange}
    />
  ))}
```

Bảng tổng hợp GVCN:

```
STT | Họ tên | SĐT | Phương tiện | Cỡ đồng phục | Zalo
```

Chỉ lấy:

TypeScript

```
showInTeacherSummary === true
```

và render column theo `sortOrder`.

* * *

# 5\. Smart Pre-fill

## 5.1. Resolver ưu tiên

Một field không nên có nhiều nơi cùng ghi đè tùy tiện.

Khuyến nghị:

```
1. Giá trị người dùng đã nhập trong profile_data
2. Dữ liệu chính thức hiện có trong students
3. Default từ class/context
4. Placeholder
```

Ví dụ:

TypeScript

```
function resolveField<T>(
  profileValue: T | null | undefined,
  masterValue: T | null | undefined,
  fallback: T,
): T {
  return profileValue ?? masterValue ?? fallback;
}
```

Không dùng `||`, vì:

TypeScript

```
false
0
""
```

có thể là giá trị hợp lệ.

## 5.2. Pre-fill mapping

| Form field | Primary source |
| --- | --- |
| Họ tên | `students.full_name` |
| Ngày sinh | `students.date_of_birth` |
| Giới tính | `students.gender` |
| Lớp | `classes.name` |
| GVCN | `classes → teacher` |
| SĐT phụ huynh | profile/contact data |
| Dân tộc | `students/profile_data` |
| Tôn giáo | `profile_data` |
| Nơi sinh | `profile_data` + catalog |
| Tỉnh/TP | address/profile + catalog |
| Nơi KCB | profile + catalog |

Catalog không phải source of truth cho giá trị hồ sơ. Catalog chỉ cung cấp **tập lựa chọn chuẩn**.

* * *

# 6\. API / Service Boundary

Khuyến nghị:

```
SchoolConfigService
CatalogService
TeacherCustomFieldService
StudentProfileService
StudentCVPrintService
```

Batch endpoint logic:

TypeScript

```
GET /classes/:classId/student-cv/batch-print
```

Hoặc:

TypeScript

```
POST /classes/:classId/student-cv/export
```

Request:

JSON

```
{
  "studentIds": null,
  "output": "print"
}
```

`studentIds = null` nghĩa là toàn bộ lớp.

Response không nhất thiết phải trả PDF binary nếu giai đoạn đầu dùng browser print. Có thể trả:

TypeScript

```
StudentCVPrintViewModel[]
```

và frontend render print document.

Nếu cần export PDF server-side trong tương lai, giữ nguyên ViewModel và thay renderer:

```
ViewModel
 ├── React/HTML + Browser Print
 └── Headless Chromium PDF Renderer
```

Như vậy không phải viết lại mapping dữ liệu.

* * *

# 7\. Tiêu chí nghiệm thu Batch PDF 1:1

## AC-01 — Dynamic school

- Không còn chuỗi tên trường/cơ quan mẫu hardcode trong UI nghiệp vụ.
- Đổi `school.profile` tại Admin CP → print preview thay đổi.
- Đổi GVCN/lớp → tài liệu thay đổi đúng.

## AC-02 — Exactly 2 pages/student

Với `N` học sinh:

```
Expected page count = N × 2
```

Ví dụ:

| Students | Expected |
| --- | --- |
| 1 | 2 |
| 2 | 4 |
| 10 | 20 |
| 43 | 86 |

Không được có:

```
43 students → 85 pages
43 students → 87 pages
```

## AC-03 — Không vỡ trang

Kiểm tra:

- page 1 không chứa bất kỳ nội dung page 2;
- page 2 không bị đẩy phần cuối sang page 3;
- student `n + 1` không xuất hiện trên page 2 của student `n`;
- checkbox đủ 16;
- đủ 3 vùng chữ ký.

## AC-04 — Margin

Đo PDF A4:

```
210 × 297 mm
```

Lề trái đạt khoảng:

```
25–30 mm
```

theo cấu hình thiết kế cuối cùng.

## AC-05 — Catalog

Admin:

- thêm;
- sửa;
- reorder;
- deactivate.

Thay đổi phải phản ánh trong dropdown/chips mới.

## AC-06 — Custom fields

GVCN:

1. tạo `Phương tiện đi học`;
2. tạo `Cỡ đồng phục`;
3. tạo `Zalo`;
4. phụ huynh nhìn thấy field được cho phép;
5. nhập value;
6. reload vẫn còn;
7. GVCN thấy column tương ứng;
8. teacher khác không thấy definition của lớp này.

* * *

# 8\. Kế hoạch kiểm thử Terminal

Không nên chỉ kiểm tra bằng mắt. Chia thành 4 lớp.

## Phase A — Static checks

Chạy các command tương ứng package manager của repository, ví dụ:

Bash

```
npm run lint
npm run typecheck
npm run build
```

Nếu project dùng script khác, dùng script thực tế hiện có.

Sau đó tìm hardcode:

Bash

```
rg -n "TRƯỜNG THCS TRẦN BỘI CƠ|ỦY BAN NHÂN DÂN QUẬN 5" .
```

Kết quả mong muốn trong production source:

```
0 matches
```

Ngoại lệ hợp lệ:

- fixtures;
- migration historical data;
- test snapshot cố ý.

Các ngoại lệ phải được ghi rõ.

## Phase B — Unit tests

Các test tối thiểu:

```
SchoolConfigService
├── loads dynamic school values
└── fallback behavior

CatalogService
├── active items only
├── ordering
└── inactive items excluded

TeacherCustomFieldService
├── validates field types
├── unique field_key/class
├── authorization
└── value validation

StudentCVPrintService
├── exactly 2 page models/student
├── class isolation
├── prefill priority
└── custom field resolution
```

Ví dụ invariant:

TypeScript

```
expect(document.students).toHaveLength(43);
expect(document.expectedPageCount).toBe(86);
```

## Phase C — Integration tests

Seed một lớp có:

```
43 students
```

Bao gồm edge cases:

1. tên dài;
2. địa chỉ rất dài;
3. nhiều anh/chị/em;
4. custom field text dài;
5. nhiều field select;
6. thiếu dữ liệu;
7. Unicode tiếng Việt đầy đủ.

Assert:

```
student count = 43
logical pages/student = 2
total logical pages = 86
```

## Phase D — Browser/PDF smoke test

Nếu stack có Playwright:

Bash

```
npx playwright test
```

Test batch:

```
1. Login as homeroom teacher
2. Open class
3. Click batch export
4. Assert 43 student print units
5. Assert 86 .cv-page elements
6. Generate print/PDF artifact
7. Validate resulting page count = 86
```

DOM assertion:

TypeScript

```
await expect(page.locator(".student-print-unit")).toHaveCount(43);
await expect(page.locator(".cv-page")).toHaveCount(86);
```

PDF page-count validation nên dùng một utility trong CI, ví dụ công cụ hiện có của môi trường, để kiểm tra file thực tế:

```
actual_pdf_pages === expected_students * 2
```

Quan trọng: DOM có 86 `.cv-page` **chưa đủ** chứng minh PDF thật có 86 trang. Cần ít nhất một test artifact-level.

* * *

# 9\. Regression Matrix đề xuất

| Scenario | Expected |
| --- | --- |
| 1 student, đầy đủ data | 2 PDF pages |
| 43 students | 86 PDF pages |
| Student thiếu guardian | vẫn 2 pages |
| Tên cực dài | không tạo page 3 |
| Custom field dài | clamp/quota, không tràn |
| 16 personality checks | đủ trên page 2 |
| 3 signatures | đủ trên page 2 |
| Đổi tên trường | PDF thay đổi |
| Đổi niên khóa | PDF thay đổi |
| Đổi GVCN | PDF thay đổi |
| Admin deactivate catalog item | không xuất hiện lựa chọn mới |
| Existing student dùng catalog item cũ | giá trị lịch sử vẫn hiển thị |
| Teacher A custom field | Teacher B không thấy |
| Parent reload form | custom values giữ nguyên |

* * *

# 10\. Thứ tự triển khai khuyến nghị

## Step 1 — Data/config foundation

- Chuẩn hóa `app_settings`.
- Thêm `admin_catalogs`.
- Thêm `admin_catalog_items`.
- Thêm `teacher_custom_fields`.
- Xác định JSON contract `profile_data.custom_fields`.

## Step 2 — Services & authorization

- `SchoolConfigService`.
- `CatalogService`.
- `TeacherCustomFieldService`.
- class ownership authorization.

## Step 3 — Dynamic forms

- Smart pre-fill.
- Shared dropdown/chips.
- Dynamic teacher fields.
- validation theo field definition.

## Step 4 — Summary table

- Dynamic columns.
- stable `field_key`.
- `sort_order`.

## Step 5 — Print renderer

- Build `StudentCVPrintViewModel`.
- Build page 1.
- Build page 2.
- fixed-height zones.
- print-only CSS.

## Step 6 — Batch

- Load entire class.
- Render sequentially.
- one `student-print-unit` per student.
- browser print.
- PDF artifact test.

## Step 7 — Hardening

- 43-student regression fixture.
- long-text cases.
- authorization tests.
- page-count CI gate.

* * *

## Quyết định kiến trúc cuối cùng

**Nên chốt 4 nguyên tắc không thay đổi:**

1. **One canonical print template**: một nguồn HTML/layout cho single và batch.
2. **Exactly two fixed physical page containers per student**: không để browser tự flow thành số trang bất kỳ.
3. **Definition/value separation**: `teacher_custom_fields` giữ schema; `profile_data.custom_fields` giữ values.
4. **All institutional text resolved dynamically**: `app_settings + classes`, không hardcode tên trường/cơ quan/GVCN.

Với thiết kế này, yêu cầu hiện tại 43 học sinh/86 trang hoạt động ổn định, đồng thời vẫn có thể mở rộng sang server-side PDF bằng Headless Chromium sau này mà không phải thay đổi schema nghiệp vụ hoặc viết lại template.