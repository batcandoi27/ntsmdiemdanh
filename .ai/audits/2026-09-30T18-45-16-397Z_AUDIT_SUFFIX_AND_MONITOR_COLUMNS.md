> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.Tôi sẽ audit theo đúng 5 tầng, nhưng phân biệt rõ đã được chứng minh từ mô tả với chưa thể nghiệm chứng nếu chưa xem schema/RLS/code/test. Tôi cũng sẽ kiểm tra riêng điểm “quy chuẩn Bộ” vì đây là phần không nên mặc định đúng chỉ từ mô tả.## Kết luận audit

Dựa trên phạm vi thông tin triển khai bạn cung cấp, tôi đánh giá hệ thống **đã sửa đúng hướng kiến trúc và UX**, nhưng **chưa đủ bằng chứng để nghiệm thu ở mức production/security-grade**.

**FINAL VERDICT: `REQUEST_CHANGES`**

Lý do chính không phải vì các thay đổi hiện tại sai, mà vì còn **4 nhóm bất biến cần được khóa ở tầng database/backend**, đặc biệt là:

1. Hậu tố A/B/C phải là **class-scoped assignment**, không được là thuộc tính của `student`.
2. Quy tắc sắp thứ tự theo mã định danh cần được chứng minh bằng **nguồn quy chuẩn cụ thể**, không nên gọi chung là “quy chuẩn Bộ” nếu chưa có văn bản/đặc tả xác nhận.
3. Phân vùng năm học phải được bảo vệ bằng **database constraint/RLS**, không chỉ bằng `getClasses()` hoặc logic UI.
4. Việc khóa `classId` trong Modal là rất tốt về UX nhưng **không phải security boundary**.

* * *

# 1\. Pedagogical & Regulatory Standard

### 1.1. Kiến trúc hậu tố A/B/C: đúng về mặt nghiệp vụ

Điểm quan trọng nhất là bạn đã phân biệt:

> `Student Identity` ≠ `Class-scoped Display Identity`

Đây là kiến trúc đúng.

Ví dụ:

| Student | Mã định danh | Lớp | Hậu tố |
| --- | --- | --- | --- |
| Nguyễn Văn A | 4250 | 8A12 | A |
| Nguyễn Văn A | 4251 | 8A12 | B |
| Nguyễn Văn A | 4250 | 8A13 | — |

Không nên lưu:

```
student.name = "Nguyễn Văn A - A"
```

mà nên có dạng:

```
student
 └── identity / immutable identifier

class_membership
 └── class_id
 └── student_id
 └── display_suffix
```

Điều này đặc biệt quan trọng khi học sinh chuyển lớp.

### 1.2. Nhưng có một điểm cần sửa cách diễn đạt

Tôi **chưa xác nhận được từ nguồn chính thức rằng Bộ GDĐT quy định cụ thể quy tắc “mã nhỏ hơn = A, mã lớn hơn = B” cho hậu tố hiển thị A/B trong một lớp**.

Nguồn chính thức của CSDL ngành xác nhận rằng mã định danh của đối tượng, trong đó có học sinh, được quản lý thống nhất; tài liệu dự thảo/quy định CSDL cũng mô tả mã định danh là duy nhất và bất biến. [Ministry of Education and Training+1](https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1555/D%E1%BB%B1%20th%E1%BA%A3o%20Th%C3%B4ng%20t%C6%B0%20CSDL%20Moet.pdf?utm_source=chatgpt.com)

Nhưng điều đó **không đồng nghĩa** với việc tôi có thể kết luận rằng:

```
4250 → A
4251 → B
```

là một quy định công khai của Bộ về **hậu tố hiển thị tên trong lớp**.

### Vì vậy:

Nếu hệ thống đang ghi specification:

> “Quy chuẩn Bộ GDĐT: mã nhỏ hơn đứng trước và được gán A/B/C”

thì nên đổi thành một trong hai trường hợp:

**Nếu đã có tài liệu chính thức:**

```
BGDĐT_NAME_ORDER_RULE
Source: [số văn bản / tài liệu / đặc tả]
```

**Nếu đây là quy tắc nghiệp vụ nội bộ được xây dựng để tương thích dữ liệu:**

```
INTERNAL_DUPLICATE_NAME_ORDER_RULE
Order by immutable student identifier ASC.
```

Không nên gắn nhãn “Bộ quy định” nếu chưa có văn bản chứng minh.

* * *

# 2\. Academic Year Partitioning & Data Integrity

Đây là phần tôi đánh giá **đã phát hiện đúng một lỗi kiến trúc thật sự quan trọng**.

Lỗi:

```
teacher_classes
    ├── 8A12 / 2025-2026
    └── 8A12 / 2026-2027

db.getClasses()
    → chỉ trả current year

classIds.length
    → 2

selectedClasses
    → 1
```

là một dạng **stale relation / temporal partition leak**.

Việc sửa:

```
activeClassIds
```

là đúng.

Nhưng cần lưu ý:

> **lọc ở application layer không đủ để đảm bảo toàn vẹn dữ liệu.**

* * *

## 2.1. Tôi khuyến nghị mô hình

```
academic_year
--------------
id
code
is_current

classes
--------------
id
academic_year_id
name

teacher_classes
--------------
teacher_id
class_id
```

Sau đó mọi bảng nghiệp vụ:

```
monitor_columns
monitor_records
attendance
...
```

nên đi theo:

```
class_id
```

và `class_id` phải trỏ đến đúng `classes.id`.

Không nên để mỗi bảng tự có:

```
academic_year = '2026-2027'
```

rồi hy vọng application layer luôn đồng bộ.

* * *

# 3\. Vấn đề `class_id` của “Bảo hiểm tai nạn”

Đây là một lỗi dữ liệu nghiêm trọng hơn lỗi UI.

Trước đây:

```
classIds[0]
```

được dùng để tạo `class_id`.

Đây là **anti-pattern**.

`classIds[0]` chỉ là:

> phần tử đầu tiên của một danh sách.

Nó tuyệt đối không có nghĩa:

> lớp hiện tại.

### Phải thay bằng:

```
currentClassId
```

và tốt hơn nữa:

```
CreateMonitorColumnCommand {
    classId: UUID
    ...
}
```

Backend kiểm tra:

```
teacher has permission to classId
AND
classId belongs to current academic year
```

rồi mới INSERT.

* * *

# 4\. `isOldYearColumn()` — hướng sửa là đúng nhưng nên nâng cấp

Việc sửa:

```
if (!targetClass)
    → old year
```

giải quyết được lỗi hiện tại.

Nhưng tôi **không khuyến nghị dùng `!targetClass` làm tiêu chí gốc để xác định lịch sử**.

Bởi:

```
targetClass == null
```

có thể xảy ra vì nhiều lý do:

- lớp đã bị xóa;
- query lỗi;
- permission không cho đọc;
- dữ liệu hỏng;
- `class_id` sai;
- lớp thực sự thuộc năm cũ.

Các trạng thái này không giống nhau.

### Nên xác định bằng dữ liệu thời gian:

```
column.class_id
    ↓
classes.academic_year_id
    ↓
academic_year.is_current
```

Ví dụ:

```
CURRENT
OLD
ORPHANED / INVALID
```

Ba trạng thái này nên tách riêng.

* * *

# 5\. Bảo toàn A/B/C khi chuyển lớp — đây là điểm cần khóa

Yêu cầu của bạn:

> cùng lớp cũ A/B phải giữ nguyên, không đảo khi thêm/xóa/chuyển học sinh.

Điều này **không được phép thực hiện bằng cách tính lại mỗi lần render**.

Ví dụ nguy hiểm:

JavaScript

```
duplicates
  .sort(byStudentId)
  .map((student, index) => suffix[index])
```

Ban đầu:

```
4250 → A
4251 → B
```

Sau khi 4250 chuyển đi:

```
4251 → A
```

\=> **vi phạm invariant**.

* * *

## Kiến trúc đúng

Phải lưu assignment:

```
class_student_identity
----------------------
class_id
student_id
duplicate_suffix
assigned_at
```

Ví dụ:

```
8A12 | 4250 | A
8A12 | 4251 | B
```

Khi 4250 rời lớp:

```
8A12 | 4250 | A | inactive
8A12 | 4251 | B | active
```

Không được tự biến B thành A.

Nếu có học sinh mới 4252:

```
4250 → A
4251 → B
4252 → C
```

Đây mới là **Invariant Preservation** đúng nghĩa.

* * *

# 6\. UX Audit

Ở tầng UX, thay đổi lớn nhất của bạn là **đúng mental model của giáo viên**.

Trước:

```
Lớp hiện tại
   ↓
Không có sổ
   ↓
Đi sang Settings
   ↓
Chọn lớp
   ↓
Tạo sổ
   ↓
Quay lại lớp
```

Đây là flow gây mất context.

Flow mới:

```
Lớp 8A12
   ↓
Theo dõi
   ↓
+ Tạo Sổ Mới Ngay
   ↓
Modal
   ↓
classId = 8A12
   ↓
Save
   ↓
8A12 monitor
```

### Tôi đánh giá thay đổi này rất hợp lý về UX.

Đặc biệt:

```
🏫 Lớp: 8A12
👥 Áp dụng cho tất cả học sinh lớp 8A12 (40 HS)
```

giải quyết một vấn đề UX rất quan trọng:

> **Scope visibility**

Giáo viên phải biết mình đang thao tác trên:

```
lớp nào?
bao nhiêu học sinh?
toàn lớp hay nhóm?
```

Không nên bắt giáo viên “đoán” từ URL.

* * *

# 7\. Nhưng Modal “khóa classId” chưa phải Security

Đây là một điểm tôi muốn nhấn mạnh.

Bạn có:

```
CreateMonitorColumnModal
       ↓
classId = currentClassId
```

Rất tốt.

Nhưng hacker/user vẫn có thể bỏ UI và gửi request:

http

```
POST /monitor-columns

{
    "class_id": "OTHER_CLASS_ID"
}
```

Nếu backend chỉ tin payload thì:

> **Multi-tenant isolation bị phá.**

Vì vậy backend phải kiểm tra:

```
authenticated_teacher
        ↓
teacher_classes
        ↓
requested class_id
        ↓
academic year
```

### Công thức authorization nên là:

```
ALLOW
=
authenticated
AND
teacher_has_class_access
AND
class_is_in_allowed_academic_scope
```

Không được:

```
ALLOW = classId nằm trong request
```

* * *

# 8\. RLS — đây là hạng mục tôi xem là BLOCKER trước APPROVED

Với Supabase/PostgreSQL, tôi muốn thấy tối thiểu các policy dạng logic:

```
teacher
   ↓
teacher_classes
   ↓
classes
   ↓
monitor_columns
```

Ví dụ về mặt nguyên tắc:

SQL

```
USING (
    EXISTS (
        SELECT 1
        FROM teacher_classes tc
        WHERE tc.teacher_id = auth.uid()
          AND tc.class_id = monitor_columns.class_id
    )
)
```

Nhưng nếu có năm học:

SQL

```
AND EXISTS (
    SELECT 1
    FROM classes c
    JOIN academic_years ay
      ON ay.id = c.academic_year_id
    WHERE c.id = monitor_columns.class_id
      AND ay.is_current = true
)
```

**Lưu ý:** đây là cấu trúc minh họa để audit; chưa phải SQL tôi khẳng định có thể copy nguyên xi vào schema hiện tại của bạn.

* * *

# 9\. Race Conditions

Có ít nhất 6 tình huống phải test.

### Case A — Hai tab cùng tạo sổ

```
Tab A → Create
Tab B → Create
```

Có thể tạo duplicate.

Cần:

```
UNIQUE constraint
```

ở database nếu nghiệp vụ không cho phép duplicate.

* * *

### Case B — Hai giáo viên cùng thao tác

```
Teacher A → class 8A12
Teacher B → class 8A12
```

Nếu cả hai có quyền, cần xác định rõ:

```
shared ownership
```

hay:

```
exclusive ownership
```

Không nên để UI tự quyết định.

* * *

### Case C — chuyển năm học trong lúc đang mở trang

```
Teacher mở monitor
      ↓
Admin đổi current academic year
      ↓
Teacher bấm Create
```

Backend phải xác nhận lại academic-year scope tại thời điểm INSERT.

* * *

### Case D — chuyển học sinh trong lúc tạo sổ

```
40 HS
↓
Teacher mở modal

Student chuyển lớp

↓
Teacher Save
```

Nếu sổ có snapshot học sinh, cần quy định:

```
snapshot tại thời điểm tạo
```

hay:

```
dynamic membership
```

Đây là một quyết định nghiệp vụ cần ghi rõ.

* * *

### Case E — xóa lớp cũ

Không nên để:

```
class_id → dangling FK
```

Cần:

```
FK
ON DELETE RESTRICT
```

hoặc chiến lược archive phù hợp.

* * *

### Case F — học sinh trùng tên mới nhập

Đây là test quan trọng nhất của Name Suffix Architecture.

```
4250 → A
4251 → B

thêm 4240
```

Nếu algorithm chạy lại:

```
4240 → A
4250 → B
4251 → C
```

\=> **FAIL**

Đúng phải là:

```
4250 → A
4251 → B
4240 → C
```

nếu 4240 gia nhập sau và suffix A/B đã được cấp.

* * *

# 10\. Data Leakage cần test riêng

Tôi đề nghị chạy một bộ test matrix:

| Test | Kết quả bắt buộc |
| --- | --- |
| GV A đọc lớp mình | ALLOW |
| GV A đọc lớp khác | DENY |
| GV A tạo sổ lớp khác | DENY |
| GV A sửa sổ năm cũ | DENY |
| GV A xóa sổ năm cũ | Chỉ nếu policy cho phép |
| GV A đọc monitor cũ | READ nếu được phép |
| đổi `class_id` bằng API | DENY |
| đổi `academic_year_id` bằng API | DENY |
| truy cập UUID lớp khác | DENY |
| query bỏ filter năm học | Không làm lộ dữ liệu |

Đặc biệt:

> **Không được coi UUID khó đoán là biện pháp bảo mật.**

RLS mới là security boundary.

* * *

# 11\. Kiến trúc tôi đề xuất sau audit

Nên hình dung hệ thống thành 4 tầng:

```
┌─────────────────────────────┐
│            UX               │
│ Current Class / Modal       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       APPLICATION           │
│ validate command            │
│ current class               │
│ current academic year       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       DATABASE              │
│ FK / UNIQUE / CHECK         │
│ immutable identity          │
│ class-scoped suffix         │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│          RLS                │
│ teacher ↔ class             │
│ teacher ↔ monitor           │
│ current/old year isolation  │
└─────────────────────────────┘
```

Hiện tại, theo mô tả của bạn:

```
UX             ██████████  tốt
Application    ████████░░  khá tốt
Database       ███████░░░  cần khóa thêm
RLS/Security   █████░░░░░  chưa đủ bằng chứng
Regulatory     ██████░░░░  cần xác minh nguồn A/B
```

Đây **không phải điểm số nghiệm thu**, mà là bản đồ mức độ cần hoàn thiện theo từng tầng.

* * *

# 12\. Bộ test nghiệm thu bắt buộc

Trước khi chuyển `REQUEST_CHANGES → APPROVED`, tôi khuyến nghị chạy tối thiểu:

### Name Suffix

```
T01 duplicate name + same DOB
T02 duplicate name + different DOB
T03 add new duplicate
T04 remove A
T05 remove B
T06 transfer A to another class
T07 transfer B to another class
T08 return A to old class
T09 import students
T10 concurrent student import
```

### Academic Year

```
T11 old class + current class same teacher
T12 old monitor must not appear current
T13 current monitor appears correct class
T14 wrong class_id API injection
T15 old year modification attempt
T16 current-year rollover
```

### Security

```
T17 teacher A → teacher B class
T18 direct UUID access
T19 forged class_id POST
T20 forged student_id
T21 forged academic_year
T22 RLS bypass attempt
```

### Monitor

```
T23 create from empty state
T24 create from header
T25 duplicate creation
T26 double-click Save
T27 two browser tabs
T28 two teachers
T29 class membership changed during creation
T30 refresh after creation
```

* * *

# 13\. Quyết định nghiệm thu

### Hiện trạng

**REQUEST\_CHANGES**

Không phải vì kiến trúc đã triển khai là sai.

Ngược lại, **3 sửa chữa lớn đang đi đúng hướng**:

- tách hậu tố khỏi identity gốc;
- phân biệt current/old academic year;
- đưa việc tạo sổ về đúng context của lớp.

Nhưng để đạt mức **APPROVED production**, tôi yêu cầu đóng 4 blocker:

### BLOCKER 1 — Name suffix persistence

Phải chứng minh A/B/C được lưu theo:

```
class_id + student_id
```

và **không recompute lại suffix lịch sử**.

### BLOCKER 2 — Regulatory provenance

Phải xác định chính xác:

> Quy tắc `ID ASC → A/B/C` là quy định chính thức của Bộ hay là business rule nội bộ.

Các tài liệu chính thức tôi tìm được xác nhận vai trò của mã định danh học sinh và yêu cầu dữ liệu phải được cập nhật chính xác, nhưng **chưa đủ để chứng minh riêng quy tắc hậu tố A/B mà bạn nêu**. [Ministry of Education and Training+1](https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1555/D%E1%BB%B1%20th%E1%BA%A3o%20Th%C3%B4ng%20t%C6%B0%20CSDL%20Moet.pdf?utm_source=chatgpt.com)

### BLOCKER 3 — Database invariants

Phải có:

```
FK
UNIQUE
CHECK
transaction
```

để không thể tạo trạng thái:

```
monitor → wrong class
student membership → wrong year
suffix → wrong class
```

### BLOCKER 4 — RLS authorization

Phải chứng minh bằng test rằng:

```
UI bypass
API manipulation
UUID substitution
class_id substitution
academic-year substitution
```

đều không thể vượt quyền.

* * *

## Khuyến nghị vận hành cuối cùng

Sau khi đóng 4 blocker trên, nên coi:

```
student.id
        ↓
immutable identity

class_membership
        ↓
class-scoped relationship

duplicate_suffix
        ↓
persistent historical presentation attribute

monitor_column
        ↓
class-scoped + academic-year-scoped resource

RLS
        ↓
final security boundary
```

là **5 nguyên tắc kiến trúc bất biến** của hệ thống.

Đặc biệt, **không cho phép developer tương lai quay lại cách viết `classIds[0]`**, hoặc đưa suffix vào `student.name`. Hai kiểu “tiện tay” này chính là nguồn tái phát của hai lỗi bạn vừa sửa.

**Đánh giá cuối:** bản triển khai hiện tại **đã đạt mức “đúng hướng và có thể tiếp tục hardening”, nhưng chưa nên đóng nghiệm thu production ở cấp Security/Data Integrity** cho tới khi 4 blocker trên được kiểm thử và chứng minh.

END OF HANDOFF