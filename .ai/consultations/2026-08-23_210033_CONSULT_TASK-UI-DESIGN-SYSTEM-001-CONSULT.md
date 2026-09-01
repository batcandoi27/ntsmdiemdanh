⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# Đánh giá kiến trúc & giải pháp đề xuất

## TASK-UI-DESIGN-SYSTEM-001 — Master Design System & Universal UI/UX Overhaul cho Education Management App

> Mục tiêu nên là xây dựng **một Design System thống nhất, có khả năng mở rộng và platform-aware**, thay vì chỉ “đồng bộ màu sắc và component”. Hệ thống phải phục vụ đồng thời:
> 
> - Mobile: giáo viên, phụ huynh, học sinh
> - PC/Web: quản trị viên, văn phòng, giáo viên
> - Nhiều module nghiệp vụ: điểm danh, lớp học, học sinh, phụ huynh, lịch học, thông báo, báo cáo
> - Các trạng thái nghiệp vụ quan trọng: loading, empty, error, offline, permission denied, pending/syncing

* * *

# 1\. Kiến trúc mục tiêu

Khuyến nghị áp dụng mô hình:

```
┌─────────────────────────────────────────────┐
│                 APPLICATION                 │
│                                             │
│  Feature / Screen / Domain-specific UI      │
├─────────────────────────────────────────────┤
│             COMPOSITION LAYER               │
│                                             │
│  PageLayout / FormLayout / DataTable        │
│  AttendanceCard / StudentRow / Filters      │
├─────────────────────────────────────────────┤
│             DESIGN SYSTEM                   │
│                                             │
│ Components                                  │
│ Button / Input / Select / Modal / Table     │
│ Tabs / Badge / Toast / EmptyState           │
├─────────────────────────────────────────────┤
│              SEMANTIC TOKENS                │
│                                             │
│ color.primary / text.default                │
│ surface.card / border.default               │
│ status.success / attendance.present         │
├─────────────────────────────────────────────┤
│                CORE TOKENS                  │
│                                             │
│ Colors / Typography / Spacing / Radius      │
│ Shadows / Motion / Breakpoints              │
└─────────────────────────────────────────────┘
```

## Nguyên tắc cốt lõi

**Không để màn hình phụ thuộc trực tiếp vào giá trị thiết kế thô.**

Ví dụ **không tốt**:

CSS

```
background: #2563eb;
padding: 12px;
border-radius: 8px;
color: #ffffff;
```

Thay bằng:

CSS

```
background: var(--color-action-primary);
padding: var(--space-3);
border-radius: var(--radius-md);
color: var(--color-text-on-primary);
```

Điều này cho phép đổi theme, redesign hoặc mở rộng Dark Mode mà không phải sửa hàng loạt UI.

* * *

# 2\. Kiến trúc Design Token chuẩn

Khuyến nghị chia token thành 3 tầng.

## Layer 1 — Primitive/Foundation Tokens

Đây là giá trị gốc, **không dùng trực tiếp trong feature UI**.

TypeScript

```
export const primitives = {
  color: {
    blue: {
      50: "#EFF6FF",
      100: "#DBEAFE",
      500: "#3B82F6",
      600: "#2563EB",
      700: "#1D4ED8",
    },

    green: {
      50: "#F0FDF4",
      500: "#22C55E",
      600: "#16A34A",
    },

    red: {
      50: "#FEF2F2",
      500: "#EF4444",
      600: "#DC2626",
    },

    neutral: {
      0: "#FFFFFF",
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      400: "#94A3B8",
      500: "#64748B",
      700: "#334155",
      900: "#0F172A",
    },
  },

  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
  },

  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "24px",
    full: "9999px",
  },
};
```

### Quy tắc

Không viết:

TypeScript

```
const buttonStyle = {
  padding: "12px 16px",
  backgroundColor: "#2563EB",
};
```

Mà dùng token:

TypeScript

```
const buttonStyle = {
  paddingInline: tokens.spacing[4],
  paddingBlock: tokens.spacing[3],
  backgroundColor: semanticTokens.color.action.primary,
};
```

* * *

## Layer 2 — Semantic Tokens

Đây phải là lớp được component sử dụng chủ yếu.

TypeScript

```
export const semanticTokens = {
  color: {
    text: {
      primary: "{color.neutral.900}",
      secondary: "{color.neutral.700}",
      muted: "{color.neutral.500}",
      inverse: "{color.neutral.0}",
      disabled: "{color.neutral.400}",
    },

    surface: {
      page: "{color.neutral.50}",
      default: "{color.neutral.0}",
      subtle: "{color.neutral.100}",
    },

    border: {
      default: "{color.neutral.200}",
      subtle: "{color.neutral.100}",
      focus: "{color.blue.500}",
    },

    action: {
      primary: "{color.blue.600}",
      primaryHover: "{color.blue.700}",
      danger: "{color.red.600}",
    },

    status: {
      success: "{color.green.600}",
      error: "{color.red.600}",
      warning: "#D97706",
      info: "{color.blue.600}",
    },
  },
};
```

Tên token phải mô tả **ý nghĩa**, không mô tả màu:

❌

```
buttonBlue
textGray
cardWhite
```

✅

```
color.action.primary
color.text.primary
color.surface.default
color.border.default
```

* * *

## Layer 3 — Component Tokens

Dùng khi một component có đặc tính riêng cần kiểm soát.

TypeScript

```
export const componentTokens = {
  button: {
    primary: {
      background: "{color.action.primary}",
      text: "{color.text.inverse}",
      radius: "{radius.md}",
      minHeight: "44px",
    },
  },

  input: {
    background: "{color.surface.default}",
    border: "{color.border.default}",
    borderFocus: "{color.border.focus}",
    radius: "{radius.md}",
  },
};
```

### Quy tắc kiến trúc quan trọng

```
Primitive → Semantic → Component → Feature
```

Không đảo chiều.

Feature không nên import trực tiếp `blue.600`, trừ trường hợp visualization đặc biệt được quản trị rõ ràng.

* * *

# 3\. Bộ Foundation Schema đề xuất

## 3.1 Color System

Tách rõ:

```
Brand
Neutral
Semantic Status
Interaction
Education Domain
Data Visualization
```

Ví dụ domain-specific:

TypeScript

```
attendance: {
  present: {
    background: "...",
    text: "...",
    icon: "..."
  },
  absent: {},
  late: {},
  excused: {},
  pending: {}
}
```

Đặc biệt với ứng dụng điểm danh, không chỉ dùng:

```
green = có mặt
red = vắng
```

Phải đảm bảo trạng thái vẫn phân biệt được khi:

- người dùng mù màu
- Dark Mode
- màn hình chất lượng thấp
- in báo cáo trắng đen

Mỗi status nên có:

```
Color + Icon + Label
```

Ví dụ:

```
✓ Có mặt
✕ Vắng
◷ Đi trễ
⊘ Có phép
? Chưa cập nhật
```

**Không dùng màu như nguồn thông tin duy nhất.**

* * *

## 3.2 Typography

Khuyến nghị scale đơn giản:

```
Display     32 / 40
H1          28 / 36
H2          24 / 32
H3          20 / 28
Title       18 / 26
Body        16 / 24
Body Small  14 / 20
Caption     12 / 16
```

Không nên tạo 15–20 kích thước font tùy ý.

Schema:

TypeScript

```
typography: {
  display: {
    fontSize: "32px",
    lineHeight: "40px",
    fontWeight: 700,
  },

  h1: {
    fontSize: "28px",
    lineHeight: "36px",
    fontWeight: 700,
  },

  body: {
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 400,
  },

  bodySmall: {
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: 400,
  },
}
```

### Best practice

Không hardcode:

CSS

```
font-size: 13px;
font-size: 15px;
font-size: 17px;
```

trong từng màn hình nếu không có lý do rõ ràng.

* * *

## 3.3 Spacing System

Nên dùng hệ thống 4px:

```
4
8
12
16
20
24
32
40
48
64
```

Đây là cách giảm đáng kể UI “lệch nhịp”.

Ví dụ:

```
Card padding       16 hoặc 24
Field gap          12 hoặc 16
Section gap        24 hoặc 32
Page section gap   32 hoặc 40
```

Tránh:

```
margin: 13px
padding: 19px
gap: 27px
```

trừ trường hợp thiết kế thực sự yêu cầu.

* * *

# 4\. Universal Responsive Architecture: Mobile + PC

Đây là phần quan trọng nhất.

## Không nên thiết kế theo tư duy:

```
Desktop UI → co lại thành Mobile UI
```

Mà nên dùng:

```
Same Information Architecture
+
Platform-specific Presentation
```

Ví dụ màn hình điểm danh.

### Desktop

```
┌──────── Sidebar ───────┬──────────────────────────────────┐
│ Dashboard              │ Điểm danh                         │
│ Lớp học                │ [Ngày] [Lớp] [Tìm kiếm]          │
│ Học sinh               │                                  │
│ Báo cáo                │ ┌──────────────────────────────┐ │
│                        │ │ STT │ Học sinh │ Trạng thái  │ │
│                        │ │ 1   │ ...      │ Có mặt      │ │
│                        │ │ 2   │ ...      │ Vắng        │ │
│                        │ └──────────────────────────────┘ │
└────────────────────────┴──────────────────────────────────┘
```

### Mobile

```
┌─────────────────────┐
│ ← Điểm danh         │
│ [Lớp 10A1 ▾]        │
│ [Ngày hôm nay]      │
├─────────────────────┤
│ Nguyễn Văn A         │
│ [✓ Có mặt] [Vắng]   │
├─────────────────────┤
│ Trần Thị B           │
│ [✓ Có mặt] [Vắng]   │
├─────────────────────┤
│                     │
│ [ Lưu điểm danh ]   │
└─────────────────────┘
```

Cùng domain model, khác interaction model.

* * *

# 5\. Breakpoint Strategy

Không nên chỉ có:

CSS

```
@media (max-width: 768px)
```

Khuyến nghị semantic breakpoint:

TypeScript

```
breakpoints: {
  compact: "0px",
  mobile: "480px",
  tablet: "768px",
  laptop: "1024px",
  desktop: "1280px",
  wide: "1536px",
}
```

Nhưng tránh responsive logic bị rải khắp app.

## Anti-pattern

TypeScript

```
if (window.innerWidth < 768) {
  return <MobileAttendance />;
}

return <DesktopAttendance />;
```

ở mọi screen.

## Tốt hơn

Tách:

```
AttendanceFeature
├── AttendanceDataProvider
├── AttendanceController
├── AttendanceDesktopView
├── AttendanceMobileView
└── shared
    ├── AttendanceStatusControl
    └── AttendanceSummary
```

Hoặc ưu tiên responsive component nếu khác biệt không quá lớn.

```
Một component
→ layout thay đổi bằng CSS

Hai view riêng
→ khi information density hoặc interaction khác căn bản
```

* * *

# 6\. Component Taxonomy chuẩn

Khuyến nghị phân loại theo tầng.

## Foundation

```
Icon
Text
Box
Stack
Inline
Grid
Divider
```

Đây là primitive layout.

## Base Components

```
Button
IconButton
Input
Textarea
Select
Checkbox
Radio
Switch
Badge
Avatar
Tooltip
Spinner
Skeleton
```

## Composite Components

```
SearchField
DatePickerField
FormField
ConfirmDialog
Pagination
DataTable
FilterBar
EmptyState
ErrorState
PageHeader
StatCard
```

## Domain Components

```
AttendanceStatusSelector
AttendanceSummary
StudentAttendanceRow
ClassSelector
StudentProfileCard
ScheduleCard
ParentContactCard
```

### Nguyên tắc

Domain component không nên bị nhét vào Design System Core.

❌

```
/design-system
  Button
  Input
  StudentAttendanceCard
  MonthlyTuitionCalculation
```

Tốt hơn:

```
/design-system
  Button
  Input
  Modal
  Table

/features
  attendance
    components
      StudentAttendanceCard
```

* * *

# 7\. Component API: Best Practices

## Button

API nên semantic:

TypeScript

```
<Button variant="primary" size="md">
  Lưu điểm danh
</Button>
```

Không nên:

TypeScript

```
<Button
  background="#2563EB"
  textColor="white"
  padding="12px 20px"
  borderRadius="8px"
>
```

Một API chuẩn:

TypeScript

```
type ButtonProps = {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};
```

Không tạo quá nhiều boolean:

❌

TypeScript

```
<Button
  primary
  danger
  small
  rounded
  outlined
  dark
  compact
/>
```

Boolean explosion khiến component khó hiểu và tạo tổ hợp trạng thái không kiểm soát được.

* * *

# 8\. State Matrix bắt buộc cho mọi Component

Một Design System trưởng thành không chỉ có trạng thái “normal”.

Mỗi interactive component nên định nghĩa:

```
Default
Hover
Focus Visible
Active/Pressed
Disabled
Loading
Error
Selected (nếu applicable)
Read-only (nếu applicable)
```

Ví dụ Input:

| State | Yêu cầu |
| --- | --- |
| Default | Border chuẩn |
| Hover | Feedback nhẹ |
| Focus | Focus ring rõ |
| Filled | Giá trị rõ ràng |
| Error | Label + border + message |
| Disabled | Không chỉ giảm opacity quá mức |
| Readonly | Không gây hiểu nhầm là disabled |

Đặc biệt **focus-visible** rất quan trọng cho desktop accessibility.

* * *

# 9\. Screen State System

Mỗi feature screen nên xử lý đầy đủ:

```
Loading
Loading with stale data
Empty
Error
Permission denied
Offline
Partial failure
Success
```

Ví dụ Attendance:

TypeScript

```
switch (state.status) {
  case "loading":
    return <AttendanceSkeleton />;

  case "error":
    return <ErrorState onRetry={retry} />;

  case "empty":
    return <EmptyState />;

  case "ready":
    return <AttendanceContent data={state.data} />;
}
```

## Anti-pattern phổ biến

TypeScript

```
if (!data) return null;
```

Điều này tạo màn hình trắng và che giấu trạng thái hệ thống.

* * *

# 10\. Form UX Architecture

Ứng dụng giáo dục thường có rất nhiều form:

- Thêm học sinh
- Chỉnh sửa hồ sơ
- Tạo lớp
- Điểm danh
- Nhập điểm
- Cấu hình trường

Khuyến nghị chuẩn hóa:

```
Label
Optional indicator
Control
Helper text
Validation message
```

Schema:

TypeScript

```
<FormField
  label="Họ và tên"
  required
  error={errors.fullName?.message}
>
  <Input
    value={value}
    onChange={onChange}
    aria-invalid={Boolean(errors.fullName)}
  />
</FormField>
```

Không để mỗi form tự render lỗi theo một cách khác nhau.

* * *

# 11\. Data-heavy PC UX

Với Education Management App trên PC, bảng dữ liệu là thành phần chiến lược.

## DataTable cần hỗ trợ kiến trúc

```
Column definition
Sorting
Filtering
Pagination
Row selection
Loading
Empty
Error
Sticky header
Column visibility
Responsive fallback
```

Ví dụ:

TypeScript

```
type Column<T> = {
  id: string;
  header: string;
  accessor?: (row: T) => unknown;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  width?: number;
};
```

## Responsive fallback

Không cố nhồi desktop table vào mobile.

```
Desktop → DataTable
Mobile → List/Card representation
```

Cả hai dùng chung:

```
Query
Filters
Sorting state
Pagination
Business data
```

Khác:

```
Presentation
Density
Interaction
```

* * *

# 12\. Navigation Architecture

Khuyến nghị phân cấp:

## Desktop

```
App Shell
├── Sidebar
│   ├── Tổng quan
│   ├── Điểm danh
│   ├── Lớp học
│   ├── Học sinh
│   ├── Phụ huynh
│   └── Báo cáo
├── Top Bar
└── Main Content
```

## Mobile

Không bắt buộc copy sidebar thành hamburger menu hoàn toàn.

Ưu tiên:

```
Primary Navigation
→ các chức năng dùng thường xuyên

Secondary Navigation
→ More / Menu
```

Ví dụ:

```
Home | Điểm danh | Lớp học | Thông báo | Thêm
```

Tùy role.

### Role-based navigation

Không chỉ hide menu bằng CSS:

TypeScript

```
{user.role === "admin" && <AdminMenu />}
```

Quyền cần được kiểm soát ở:

```
Route
API authorization
Feature permission
Navigation visibility
```

Navigation chỉ là lớp presentation, **không phải security boundary**.

* * *

# 13\. Accessibility Baseline

Khuyến nghị đặt chuẩn tối thiểu:

## Keyboard

```
Tab navigation
Visible focus
Enter/Space activation
Escape closes modal
Focus trap in modal
Focus restoration after close
```

## Semantic HTML

Không dùng:

TypeScript

```
<div onClick={save}>Lưu</div>
```

Thay bằng:

TypeScript

```
<button type="button" onClick={save}>
  Lưu
</button>
```

## Color

Không dùng màu là nguồn thông tin duy nhất.

## Touch Target

Mobile interactive target nên đủ lớn và có khoảng cách tránh chạm nhầm.

## Screen Reader

Modal, error, loading và thông báo cần semantics/ARIA phù hợp.

* * *

# 14\. Accessibility & UX cho hệ thống giáo dục

Một số trường hợp đặc biệt nên được thiết kế ngay từ đầu:

### Điểm danh nhanh

Không nên yêu cầu:

```
Tap học sinh
→ Open modal
→ Chọn trạng thái
→ Confirm
```

cho 40 học sinh.

Tốt hơn:

```
Danh sách
→ thao tác trực tiếp
→ batch action
→ undo khi phù hợp
```

### Hành động phá hủy dữ liệu

Không dùng confirm cho mọi thao tác.

Phân loại:

```
Low risk
→ immediate action + undo

Medium risk
→ confirmation

High risk
→ explicit confirmation / typed confirmation
```

* * *

# 15\. Dark Mode Architecture

Ngay cả khi chưa triển khai, token phải sẵn sàng.

## Sai

CSS

```
.card {
  background: white;
  color: black;
}
```

## Đúng

CSS

```
.card {
  background: var(--color-surface-default);
  color: var(--color-text-primary);
}
```

Sau đó:

CSS

```
:root {
  --color-surface-default: #ffffff;
  --color-text-primary: #0f172a;
}

[data-theme="dark"] {
  --color-surface-default: #172033;
  --color-text-primary: #f8fafc;
}
```

Không cần sửa component.

* * *

# 16\. Kiến trúc thư mục đề xuất

Nếu dự án là React/TypeScript, khuyến nghị cấu trúc:

```
src/
├── app/
│   ├── providers/
│   ├── routes/
│   └── layouts/
│
├── design-system/
│   ├── tokens/
│   │   ├── primitives.ts
│   │   ├── semantic.ts
│   │   └── components.ts
│   │
│   ├── foundations/
│   │   ├── typography/
│   │   └── icons/
│   │
│   ├── components/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Badge/
│   │   └── DataTable/
│   │
│   └── index.ts
│
├── features/
│   ├── attendance/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── model/
│   │   ├── screens/
│   │   └── types.ts
│   │
│   ├── students/
│   ├── classes/
│   └── reports/
│
├── shared/
│   ├── api/
│   ├── hooks/
│   ├── utils/
│   └── types/
│
└── styles/
    ├── globals.css
    └── theme.css
```

Điểm quan trọng:

```
Design System ≠ Shared folder
```

`shared` dễ trở thành “bãi rác component”.

Một component chỉ nên vào Design System khi:

1. Có khả năng tái sử dụng thực sự
2. Có API ổn định
3. Không phụ thuộc business domain
4. Có states rõ ràng
5. Có accessibility contract

* * *

# 17\. Drop-in Token Implementation

Ví dụ CSS variables:

CSS

```
:root {
  /* Primitive */
  --blue-50: #eff6ff;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;

  --neutral-0: #ffffff;
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-500: #64748b;
  --neutral-900: #0f172a;

  /* Semantic */
  --color-page: var(--neutral-50);
  --color-surface: var(--neutral-0);
  --color-surface-subtle: var(--neutral-100);

  --color-text-primary: var(--neutral-900);
  --color-text-secondary: var(--neutral-500);
  --color-text-on-primary: var(--neutral-0);

  --color-border: var(--neutral-200);
  --color-focus: var(--blue-600);

  --color-primary: var(--blue-600);
  --color-primary-hover: var(--blue-700);

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  /* Layout */
  --control-height-sm: 36px;
  --control-height-md: 44px;
  --control-height-lg: 52px;
}
```

* * *

# 18\. Drop-in Button Pattern

TypeScript

```
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  startIcon,
  endIcon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled || loading}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      className={className}
    >
      {loading ? (
        <span aria-hidden="true">...</span>
      ) : (
        startIcon
      )}

      <span>{children}</span>

      {!loading && endIcon}
    </button>
  );
}
```

CSS contract:

CSS

```
.ds-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  min-height: var(--control-height-md);
  padding-inline: var(--space-4);

  border-radius: var(--radius-md);
  border: 1px solid transparent;

  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.ds-button[data-variant="primary"] {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.ds-button[data-variant="primary"]:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.ds-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.ds-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
```

Khuyến nghị dùng CSS Modules hoặc cơ chế style encapsulation tương đương để tránh class collision.

* * *

# 19\. Anti-patterns cần tránh

## 1\. Hardcode Design Values

TypeScript

```
style={{
  color: "#333",
  padding: 13,
  borderRadius: 7,
}}
```

### Hậu quả

- Không thống nhất
- Khó redesign
- Khó Dark Mode
- Không audit được UI

* * *

## 2\. God Component

```
StudentPage
  3,000+ lines
  Fetch API
  Form state
  Modal state
  Table
  Filters
  Export
  Business rules
```

Nên tách:

```
Screen orchestration
Feature hooks/controller
Presentation components
API layer
Domain logic
```

* * *

## 3\. Shared Component trở thành Business Component

❌

```
components/
  StudentAttendanceTable.tsx
```

rồi được import từ mọi nơi chỉ vì “dùng chung”.

Nếu đó là nghiệp vụ attendance, nên thuộc:

```
features/attendance/components/
```

* * *

## 4\. Mobile = Desktop bị ép thu nhỏ

Đây là một trong các nguyên nhân UX tệ nhất với enterprise app.

Không dùng table 12 cột trên điện thoại và hy vọng horizontal scroll giải quyết tất cả.

* * *

## 5\. Excessive Modals

Không dùng modal cho:

```
Mở chi tiết
Chỉnh sửa lớn
Workflow nhiều bước
Form phức tạp
```

Modal phù hợp hơn cho:

```
Confirmation
Quick edit
Focused short task
```

* * *

## 6\. Một Component với quá nhiều Props

TypeScript

```
<Card
  isSmall
  isLarge
  compact
  elevated
  outlined
  primary
  warning
  mobile
  desktop
  horizontal
  vertical
/>
```

Đây là dấu hiệu component đang chứa nhiều responsibility.

* * *

## 7\. Duplicate State Handling

Mỗi page tự tạo:

TypeScript

```
<Spinner />
<div>Không có dữ liệu</div>
<div>Có lỗi xảy ra</div>
```

theo kiểu khác nhau.

Cần chuẩn hóa:

```
<LoadingState />
<EmptyState />
<ErrorState />
<PermissionDeniedState />
```

* * *

## 8\. Relying on `window.innerWidth` throughout app

Responsive responsibility nên tập trung vào:

```
CSS
Layout primitives
Responsive hooks khi thực sự cần behavior khác
```

Không biến breakpoint thành business logic.

* * *

# 20\. Design Governance

Design System sẽ xuống cấp nếu không có governance.

Khuyến nghị:

## Component Lifecycle

```
Experimental
→ Beta
→ Stable
→ Deprecated
→ Removed
```

## Rule thêm component mới

Trước khi tạo component:

1. Component tương tự đã tồn tại chưa?
2. Có thể compose từ component hiện có không?
3. Nó generic hay domain-specific?
4. API có tối thiểu không?
5. States đã đủ chưa?
6. Mobile/Desktop behavior đã xác định chưa?
7. Accessibility contract đã kiểm tra chưa?

* * *

# 21\. Recommended UI Quality Gates

Mỗi Pull Request liên quan UI nên kiểm tra:

```
[ ] Không hardcode color/spacing ngoài token policy
[ ] Có loading state
[ ] Có empty state nếu cần
[ ] Có error state
[ ] Keyboard accessible
[ ] Focus visible
[ ] Mobile layout kiểm tra
[ ] Desktop layout kiểm tra
[ ] Không dùng color là thông tin duy nhất
[ ] Không tạo duplicate component
[ ] Domain component không bị đưa nhầm vào Design System
```

* * *

# 22\. Lộ trình triển khai thực tế

Không khuyến nghị “rewrite toàn bộ UI” trong một lần.

## Phase 1 — Audit

Lập inventory:

```
Screens
Components
Colors
Typography
Spacing
Forms
Tables
Modals
Navigation
Duplicate patterns
```

Kết quả:

```
UI Inventory
Component Inventory
Token Inventory
UX Issue List
Migration Priority
```

* * *

## Phase 2 — Foundations

Triển khai trước:

```
Color tokens
Typography
Spacing
Radius
Elevation
Breakpoints
Motion
```

* * *

## Phase 3 — Core Components

Ưu tiên:

```
Button
Input
Select
Checkbox
Radio
Badge
Modal/Dialog
Toast
Spinner/Skeleton
EmptyState
ErrorState
```

* * *

## Phase 4 — Layout & App Shell

Chuẩn hóa:

```
Desktop AppShell
Mobile AppShell
PageContainer
PageHeader
Content sections
Sidebar
Topbar
Navigation
```

* * *

## Phase 5 — Feature Migration

Ưu tiên theo business impact:

```
1. Điểm danh
2. Dashboard
3. Học sinh
4. Lớp học
5. Phụ huynh
6. Báo cáo
7. Settings
```

Mỗi feature:

```
Audit
→ UX redesign
→ Token migration
→ Component migration
→ Responsive test
→ Accessibility test
→ Release
```

Không nên migration theo kiểu:

```
"thay tất cả Button trước"
```

trên toàn bộ hệ thống nếu điều đó tạo một PR quá lớn và khó regression-test.

* * *

# 23\. Kiến trúc tổng thể tôi khuyến nghị

```
                    ┌─────────────────┐
                    │   APP / ROUTES  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    APP SHELL    │
                    │ Desktop/Mobile  │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │       FEATURE MODULES       │
              │ Attendance / Students / ... │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │ DOMAIN UI       │
                    │ Feature-specific│
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │       DESIGN SYSTEM         │
              │ Components + Patterns       │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │ SEMANTIC TOKENS │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ PRIMITIVE TOKENS│
                    └─────────────────┘
```

* * *

# 24\. Kết luận kiến trúc

Giải pháp tốt nhất cho dự án này không phải là tạo thêm nhiều component, mà là thiết lập **UI contract rõ ràng**:

### Foundation

```
Token-first
Semantic naming
No arbitrary values
```

### Components

```
Accessible
Composable
Controlled API surface
State-complete
```

### Responsive

```
Shared domain/data
Platform-appropriate presentation
Mobile không phải desktop thu nhỏ
```

### Feature Architecture

```
Design System → generic
Feature → domain-specific
Shared → utility/common infrastructure
```

### Governance

```
Component inventory
Versioning/lifecycle
Quality gates
Incremental migration
```

**Khuyến nghị ưu tiên cao nhất:** trước khi redesign từng màn hình, hãy xây dựng **Token Layer + Core Component Contract + App Shell + State System**. Nếu làm ngược lại, mỗi màn hình sẽ đẹp riêng lẻ nhưng toàn bộ ứng dụng vẫn nhanh chóng trở nên không nhất quán và khó bảo trì.