---
evidence_id: EVD-20260921055604-CHATGPT-PLAN-B
bridge_endpoint: http://127.0.0.1:17841/v1/responses
model_used: chatgpt-web/luna
turn_timestamp: 2026-09-21T05:56:04.652Z
request_hash: 0362f867554040073f0f974f1082aeb12e753e43cc41a428a719ca5869c0007d
response_hash: 016e2afea358de568fc05707f0669694306b277a5e9dda1e175864c1ce6efa7d
http_status: 200 OK
elapsed_seconds: 42.1
---

# PLAN B: KIẾN TRÚC TỐI ƯU HÓA HIỆU NĂNG ĐIỂM DANH (CHATGPT WEB PRINCIPAL ARCHITECT)
**Đơn vị thẩm định:** ChatGPT Web (Luna Architect Engine)  
**Thời gian thẩm vấn:** 12:56:04 21/9/2026  
**Mã nhiệm vụ:** TASK-PERF-ATTENDANCE  

> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.# PLAN B — Tối ưu hiệu năng Attendance V3

Dựa trên các bottleneck đã được nêu, tôi **xác nhận hướng chẩn đoán là đúng**. Điểm quan trọng nhất là: đây không phải vấn đề cần “tối ưu vài câu query”, mà là cần đổi **granularity của I/O**: từ *per-student/per-column request* sang *class-scoped batch operation*.

## 1\. Đánh giá các bottleneck

| Bottleneck | Đánh giá | Tác động |
| --- | --- | --- |
| `students.select(...)` toàn trường | **Critical** | Transfer + DB scan thừa, tăng latency theo quy mô trường |
| `AttendanceSheet.init()` tuần tự 4 bước | **High** | Tổng latency ≈ tổng 4 request thay vì critical-path ngắn nhất |
| `attendance_statuses` query lặp | **Medium** | I/O lặp vô ích |
| `N × M saveDailyRecord()` | **Critical** | 45 × 3 = **135 request/lần lưu** |
| delete reset tuần tự trong `batchMarkAttendance` | **High** | Tăng round-trip và tạo khoảng thời gian trạng thái trung gian |
| Không dirty-diff | **High** | Gửi cả dữ liệu không thay đổi |
| Cache không có version/invalidation strategy | **Medium** | Có nguy cơ stale data |

* * *

# 2\. Kiến trúc Plan B

Tôi đề xuất chia thành **3 tầng**:

```
AttendanceSheet
      │
      │ 1 request
      ▼
┌─────────────────────────────┐
│ saveAttendanceBatch()       │
│ Next.js Server Action       │
├─────────────────────────────┤
│ validate input              │
│ calculate dirty diff        │
│ authorize teacher/class     │
│ normalize exception records │
└──────────────┬──────────────┘
               │
               ▼
        Supabase RPC / DB
               │
       ┌───────┴────────┐
       ▼                ▼
   DELETE reset     UPSERT dirty
       │                │
       └───────┬────────┘
               ▼
       transaction boundary
               │
               ▼
          commit/rollback
```

Điểm cốt lõi: **Client không còn biết và không cần biết mỗi record phải được save/delete bằng request riêng.**

Supabase hỗ trợ bulk `upsert()` bằng array; còn khi cần nhiều mutation phải nằm trong **một transaction**, Supabase khuyến nghị dùng PostgreSQL function/RPC vì các query `supabase-js` riêng lẻ không được tự động gom thành một transaction. [Supabase+2Supabase+2](https://supabase.com/docs/reference/javascript/upsert?utm_source=chatgpt.com)

* * *

# 3\. Luồng MỞ DANH SÁCH — Data Fetch Scoping

## 3.1. Sửa ngay `getClassAttendance`

Không được:

TypeScript

```
.from('students')
.select('id, student_code, full_name')
```

không filter.

Phải chuyển thành:

TypeScript

```
.from('students')
.select('id, student_code, full_name')
.eq('class_id', classId)
```

hoặc, nếu schema hiện tại không có `class_id`, phải dùng **quan hệ/bảng mapping hiện hữu** để giới hạn student IDs của lớp trước khi query attendance.

### Nguyên tắc

> **Không query bảng `students` theo kiểu global rồi lọc bằng JavaScript.**

Database phải lọc ngay từ đầu.

Nếu lớp có 45 học sinh:

```
Before
students toàn trường
   ↓
5,000 rows
   ↓
server filter
   ↓
45 rows

After
class_id = X
   ↓
45 rows
```

Đây là thay đổi có thể mang lại lợi ích lớn nhất cho màn hình mở lớp.

* * *

# 4\. Parallel Init

Hiện tại:

```
getClassAndStudents
        ↓
getColumnsByFrequency
        ↓
getDailyRecords
        ↓
getClassAttendance
```

Tạo waterfall.

Sau khi xác định những dependency thực sự cần thiết, chuyển thành:

TypeScript

```
const [
  classAndStudents,
  columns,
  dailyRecords,
  classAttendance,
] = await Promise.all([
  getClassAndStudents(classId),
  getColumnsByFrequency(classId, ...),
  getDailyRecords(classId, ...),
  getClassAttendance(classId, ...),
]);
```

**Nhưng không được mù quáng dùng `Promise.all`.**

Nếu `getDailyRecords()` cần kết quả của `getClassAndStudents()` thì giữ dependency đó:

```
              ┌── getClassAndStudents ──┐
              │                         │
START ────────┼── getColumns ───────────┼──→ assemble
              │                         │
              └── getDailyRecords ──────┘
```

Tức là mục tiêu không phải “mọi thứ đều Promise.all”, mà là:

> **Parallelize toàn bộ những operation độc lập và chỉ giữ dependency thực sự.**

* * *

# 5\. Cache `attendance_statuses`

Đây là dictionary tương đối ổn định, không nên query database mỗi lần mở sheet.

Tạo module cache:

TypeScript

```
type AttendanceStatus = {
  id: string;
  code: string;
  name: string;
};

let statusCache:
  | {
      data: AttendanceStatus[];
      expiresAt: number;
    }
  | null = null;

const STATUS_CACHE_TTL = 5 * 60 * 1000;

export async function getAttendanceStatusesCached() {
  if (statusCache && Date.now() < statusCache.expiresAt) {
    return statusCache.data;
  }

  const data = await loadAttendanceStatuses();

  statusCache = {
    data,
    expiresAt: Date.now() + STATUS_CACHE_TTL,
  };

  return data;
}
```

### Quan trọng

Không cache các record attendance của học sinh theo cách đơn giản rồi coi đó là source of truth.

Cache chỉ nên áp dụng trước tiên cho:

```
attendance_statuses
```

và các metadata thật sự ít thay đổi.

* * *

# 6\. Lưu Custom Columns — triệt tiêu 135 request

Đây là phần cần refactor mạnh nhất.

Hiện tại:

```
Student 1 × Column A → request
Student 1 × Column B → request
Student 1 × Column C → request

Student 2 × Column A → request
...
```

Với:

```
45 students × 3 columns
= 135 requests
```

## Plan B

Client tạo dirty diff:

TypeScript

```
type AttendanceChange = {
  studentId: string;
  columnId: string;
  status: string | null;
};
```

Chỉ những ô thay đổi mới được gửi.

Ví dụ user chỉ sửa 8 ô:

```
Before:
135 HTTP requests

After:
1 HTTP request
```

Nếu 100% ô thay đổi:

```
135 requests
        ↓
1 batch request
```

* * *

# 7\. Server Action — Drop-in Ready

Tôi khuyến nghị tạo:

```
src/app/actions/attendance-actions.ts
```

hoặc theo convention hiện tại của project:

```
src/services/actions/attendance-actions.ts
```

với API kiểu:

TypeScript

```
'use server';

export async function saveAttendanceBatch(input: {
  classId: string;
  date: string;
  changes: AttendanceChange[];
}) {
  // 1. Validate payload
  // 2. Authenticate user
  // 3. Authorize teacher -> class
  // 4. Normalize exception-only records
  // 5. Execute transactional DB operation
  // 6. Trigger async Zalo notification
  // 7. Return compact result
}
```

Client:

TypeScript

```
const dirtyChanges = collectDirtyChanges();

if (dirtyChanges.length === 0) {
  return;
}

await saveAttendanceBatch({
  classId,
  date,
  changes: dirtyChanges,
});
```

Next.js Server Actions được thiết kế để thực hiện mutation phía server và có thể kết hợp với cơ chế revalidation của Next.js. [Next.js](https://nextjs.org/learn/dashboard-app/mutating-data?utm_source=chatgpt.com)

* * *

# 8\. Exception-Only V3 phải được giữ nguyên

Đây là invariant quan trọng nhất.

Không được biến:

```
45 học sinh
×
3 columns
=
135 attendance rows
```

thành dữ liệu persistent chỉ vì batch processing.

Phải giữ:

```
DEFAULT STATE
     ↓
    PRESENT
     ↓
KHÔNG LƯU
```

Chỉ lưu:

```
ABSENT
LATE
EXCUSED
VIOLATION
REWARD
...
```

Vì vậy server action phải normalize:

TypeScript

```
if (change.status === PRESENT) {
  // DELETE existing exception record
} else {
  // UPSERT exception record
}
```

Đây là điểm rất quan trọng: **PRESENT không phải một record mới để insert.**

* * *

# 9\. Database operation

Nếu chỉ cần bulk upsert đơn thuần:

TypeScript

```
await supabase
  .from('daily_records')
  .upsert(rows, {
    onConflict: '...',
  });
```

Supabase hỗ trợ trực tiếp bulk upsert bằng array. [Supabase](https://supabase.com/docs/reference/javascript/upsert?utm_source=chatgpt.com)

Nhưng với Attendance V3, thường sẽ có:

```
DELETE old exception
       +
UPSERT new exception
       +
possibly audit/update
```

Do đó tôi khuyến nghị **RPC PostgreSQL transaction**:

TypeScript

```
const { data, error } = await supabase.rpc(
  'save_attendance_batch',
  {
    p_class_id: classId,
    p_date: date,
    p_changes: changes,
  }
);
```

Supabase RPC cho phép gọi PostgreSQL function; đây là hướng phù hợp khi cần thực hiện nhiều statement trong một transaction. [Supabase+1](https://supabase.com/docs/reference/javascript/rpc?utm_source=chatgpt.com)

* * *

# 10\. Pseudo SQL của RPC

Không được copy nguyên mẫu này vào production trước khi đối chiếu schema thật.

Ý tưởng:

SQL

```
create or replace function save_attendance_batch(
  p_class_id uuid,
  p_date date,
  p_changes jsonb
)
returns jsonb
language plpgsql
security invoker
as $$
begin

  -- 1. Validate teacher/class permission

  -- 2. Delete records that were changed back to PRESENT

  delete from daily_records dr
  using jsonb_array_elements(p_changes) c
  where dr.student_id = (c->>'studentId')::uuid
    and dr.column_id  = (c->>'columnId')::uuid
    and (c->>'status') = 'PRESENT';

  -- 3. Upsert only exception records

  insert into daily_records (...)
  select ...
  from jsonb_array_elements(p_changes) c
  where (c->>'status') <> 'PRESENT'
  on conflict (...) do update
    set ...;

  return jsonb_build_object(
    'success', true
  );

end;
$$;
```

**Tên bảng, khóa unique, column và RLS phải lấy đúng từ schema hiện tại**, không được tự tạo quan hệ mới.

* * *

# 11\. Dirty Diff Tracking

Không nên lấy toàn bộ state hiện tại để gửi.

Component cần giữ:

TypeScript

```
const originalValues = useRef<Record<string, string | null>>({});
const currentValues = ...;
```

Khi save:

TypeScript

```
const dirty = [];

for (const key of Object.keys(currentValues)) {
  if (currentValues[key] !== originalValues.current[key]) {
    dirty.push({
      studentId,
      columnId,
      status: currentValues[key],
    });
  }
}
```

Sau khi server thành công:

TypeScript

```
originalValues.current = {
  ...currentValues,
};
```

Như vậy:

```
User mở lớp
      ↓
Không dirty
      ↓
Save
      ↓
0 DB mutation
```

* * *

# 12\. Race condition — 2 giáo viên cùng sửa

Đây là rủi ro phải giải quyết trước khi production.

Ví dụ:

```
Teacher A đọc:
Student X = ABSENT

Teacher B đọc:
Student X = ABSENT

A → PRESENT
B → LATE
```

Nếu không có concurrency control:

```
last write wins
```

và giáo viên A không biết dữ liệu đã bị thay đổi.

## Khuyến nghị

Thêm optimistic concurrency nếu schema hiện tại cho phép mà **không phá quan hệ DB**:

```
attendance record
    │
    └── updated_at / version
```

Client gửi:

TypeScript

```
expectedVersion
```

Server kiểm tra:

```
current version === expected version
        │
       YES → update
        │
        NO
        ↓
CONFLICT
```

Response:

JSON

```
{
  "success": false,
  "code": "ATTENDANCE_CONFLICT"
}
```

UI:

> Dữ liệu điểm danh đã được giáo viên khác thay đổi. Vui lòng tải lại trước khi lưu tiếp.

Nếu schema hiện tại **không có version**, không nên tự ý thêm cột chỉ để tối ưu performance trước khi xác nhận migration policy.

* * *

# 13\. Zalo Webhook

**Không đưa webhook vào transaction DB.**

Luồng đúng:

```
Client
  ↓
Server Action
  ↓
DB transaction
  ↓
COMMIT
  ↓
return success
  │
  └────→ async notification → Zalo
```

Không:

```
DB
 ↓
Zalo
 ↓
Zalo timeout
 ↓
rollback attendance
```

Điểm danh và notification là hai reliability domain khác nhau.

Nếu Zalo thất bại:

```
attendance = SUCCESS
notification = RETRY/PENDING
```

Không được biến:

```
Zalo failure
```

thành:

```
Attendance failure
```

* * *

# 14\. Cache invalidation

### `attendance_statuses`

Có thể:

```
TTL 5–15 phút
```

hoặc invalidate khi admin thay đổi dictionary.

### Attendance records

Không dùng TTL cache làm source of truth.

Sau successful mutation:

```
local state = server-confirmed state
```

Nếu dùng Next.js cache:

TypeScript

```
revalidatePath(...)
```

hoặc tag-based invalidation phù hợp với architecture hiện tại. Next.js hỗ trợ `revalidatePath` và `revalidateTag` sau Server Action. [Next.js](https://nextjs.org/learn/dashboard-app/mutating-data?utm_source=chatgpt.com)

* * *

# 15\. Edge cases bắt buộc test

| Case | Expected |
| --- | --- |
| 45 HS × 3 columns, không thay đổi | 0 mutation |
| 1 ô thay đổi | 1 batch request |
| 135 ô thay đổi | 1 batch request |
| PRESENT → ABSENT | UPSERT |
| ABSENT → PRESENT | DELETE |
| ABSENT → LATE | UPSERT/update |
| save timeout | UI không báo thành công |
| DB transaction fail | toàn bộ batch rollback |
| Zalo fail | attendance vẫn SUCCESS |
| 2 GV sửa cùng record | detect conflict hoặc policy hiện hữu |
| double-click Save | không tạo duplicate |
| refresh ngay sau save | thấy server state |
| cache status hết TTL | reload dictionary |
| lớp không có HS | graceful empty state |
| student bị chuyển lớp | không leak attendance lớp khác |
| unauthorized teacher | reject server-side |

* * *

# 16\. Before vs After

| Chỉ số | Before | Plan B |
| --- | --- | --- |
| Students query | Toàn trường | **1 lớp** |
| Init waterfall | 4 stage tuần tự | **parallel critical path** |
| Status dictionary | Query lặp | **in-memory cache** |
| Save 45×3 | 135 HTTP requests | **1 batch request** |
| Unchanged cells | Có thể vẫn gửi | **0 request** |
| DB mutation | N×M | **batch** |
| Transaction | Nhiều request độc lập | **1 transaction** |
| Zalo | Gắn vào flow save | **async hậu commit** |
| PRESENT | Có nguy cơ bị xử lý như record | **không persistent** |
| Failure atomicity | Phân tán | **all-or-nothing batch** |

### SLO đề xuất

Đây là **engineering target**, không phải số liệu đã đo trên code hiện tại:

| SLO | Target |
| --- | --- |
| Mở danh sách lớp P50 | ≤ 500 ms |
| Mở danh sách lớp P95 | ≤ 1.2 s |
| Save không có thay đổi | ≤ 100 ms UI path |
| Save 1–135 changes P50 | ≤ 500 ms |
| Save P95 | ≤ 1.0 s |
| HTTP request cho một Save | **1** |
| DB roundtrip mutation | **1 transaction** |
| Status dictionary DB hit | gần **0** trong TTL |
| Zalo webhook | **0 ms blocking** trên save response |

**Không nên cam kết các con số này với người dùng trước khi benchmark production-like dataset.**

* * *

# 17\. Kiến trúc file đề xuất

```
src/
├─ app/
│  └─ actions/
│     └─ attendance-actions.ts
│
├─ services/
│  └─ attendance-v3-service.ts
│
├─ lib/
│  └─ attendance/
│     ├─ attendance-cache.ts
│     ├─ attendance-diff.ts
│     ├─ attendance-validation.ts
│     └─ attendance-types.ts
│
└─ components/
   └─ attendance/
      └─ AttendanceSheet.tsx
```

### Trách nhiệm

```
AttendanceSheet
    ↓
collectDirtyChanges()
    ↓
saveAttendanceBatch()
    ↓
authorization + validation
    ↓
RPC / transaction
    ↓
result
    ↓
update local state
    ↓
async Zalo
```

* * *

# 18\. Thứ tự triển khai tôi khuyến nghị

**Phase 1 — Không đụng logic nghiệp vụ**

1. Scope `students` theo class.
2. Cache `attendance_statuses`.
3. Parallelize `AttendanceSheet.init()`.
4. Instrument latency/request count.

**Phase 2 — Save refactor**

5. Implement dirty tracking.
6. Tạo `saveAttendanceBatch`.
7. Bulk upsert.
8. Bulk delete.
9. Transactional RPC nếu cần nhiều statement.

**Phase 3 — Reliability**

10. Authorization server-side.
11. Idempotency/double-submit protection.
12. Concurrency handling.
13. Async Zalo.
14. Cache invalidation.

**Phase 4 — Benchmark**

Test tối thiểu:

```
10 HS
45 HS
60 HS
100 HS
200 HS
```

với:

```
0 changes
1 change
10 changes
50% changes
100% changes
```

và đo:

```
TTFB
total latency
HTTP requests
DB roundtrips
payload bytes
Supabase query duration
error rate
```

* * *

## Kết luận kiến trúc

**Không nên sửa bằng cách chỉ giới hạn query `students` và tăng tốc Promise.** Hai việc đó giải quyết phần *read path*, nhưng bottleneck nghiêm trọng nhất vẫn là **N×M mutation khi Save**.

Plan B nên lấy nguyên tắc:

> **Class-scoped read + parallel initialization + cached dictionary + client dirty diff + one batch mutation + one DB transaction + post-commit async notification.**

Đặc biệt, **không thay đổi Exception-Only V3**: `PRESENT` vẫn là trạng thái mặc định và không được lưu thành attendance record. Bulk processing chỉ thay đổi **cách vận chuyển/thực thi I/O**, không thay đổi business semantics.

Supabase hỗ trợ bulk upsert và RPC/Database Functions đúng với hướng kiến trúc này. [Supabase+1](https://supabase.com/docs/reference/javascript/upsert?utm_source=chatgpt.com)

Tôi cũng khuyến nghị **đo trước/sau bằng instrumentation thay vì tuyên bố “nhanh X lần” trước benchmark**. Đây sẽ là bằng chứng rõ nhất để nghiệm thu refactor.
